import type { SupabaseServerClient } from "../../db/supabase.client";
import type {
  FlashcardResponse,
  FlashcardsListResponse,
  UpdateFlashcardRequest,
  CreateFlashcardRequest,
} from "../../types";
import { EventService } from "./eventService";

export interface ListDeckFlashcardsOptions {
  userId: string;
  deckId: string;
  page: number;
  pageSize: number;
  sort?: string;
  reviewDue?: boolean;
}

export interface ListDeckFlashcardsResult {
  data: FlashcardResponse[];
  totalCount: number;
}

export interface ListUserFlashcardsOptions {
  userId: string;
  page: number;
  pageSize: number;
  sort?: string;
  deckId?: string;
  reviewDue?: boolean;
  search?: string;
}

const DEFAULT_SORT_FIELD = "created_at";

function resolveSortClause(sort?: string): { column: string; ascending: boolean } {
  if (!sort) {
    return { column: DEFAULT_SORT_FIELD, ascending: true };
  }

  const column = sort.startsWith("-") ? sort.slice(1) : sort;
  const ascending = !sort.startsWith("-");

  return { column, ascending };
}

function mapFlashcardRowToResponse(row: {
  id: string;
  front: string;
  back: string;
  deck_id: string | null;
  source: FlashcardResponse["source"];
  ease_factor: number;
  interval_days: number;
  repetition: number;
  next_review_at: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  deleted_at: string | null;
}): FlashcardResponse {
  return {
    id: row.id,
    front: row.front,
    back: row.back,
    deckId: row.deck_id,
    source: row.source,
    easeFactor: row.ease_factor,
    intervalDays: row.interval_days,
    repetition: row.repetition,
    nextReviewAt: row.next_review_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    deletedAt: row.deleted_at,
  };
}

export class FlashcardService {
  constructor(private readonly supabase: SupabaseServerClient) {}

  async ensureDeckAccessibility(userId: string, deckId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("decks")
      .select("id")
      .eq("id", deckId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  async listDeckFlashcards({
    userId,
    deckId,
    page,
    pageSize,
    sort,
    reviewDue,
  }: ListDeckFlashcardsOptions): Promise<FlashcardsListResponse | null> {
    const deckExists = await this.ensureDeckAccessibility(userId, deckId);

    if (!deckExists) {
      return null;
    }

    const { column, ascending } = resolveSortClause(sort);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from("flashcards")
      .select(
        `
          id,
          front,
          back,
          deck_id,
          source,
          ease_factor,
          interval_days,
          repetition,
          next_review_at,
          created_at,
          updated_at,
          user_id,
          deleted_at
        `,
        { count: "exact" }
      )
      .eq("deck_id", deckId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order(column, { ascending, nullsFirst: false })
      .range(from, to);

    if (reviewDue) {
      const nowIso = new Date().toISOString();
      query = query.not("next_review_at", "is", null).lte("next_review_at", nowIso);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const flashcards = (data ?? []).map((row) =>
      mapFlashcardRowToResponse(row as Parameters<typeof mapFlashcardRowToResponse>[0])
    );

    const totalCount = count ?? flashcards.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      data: flashcards,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a paginated list of flashcards owned by the authenticated user.
   * Supports filtering by deck, review due status, and full-text search.
   * Only the flashcard owner can access their own flashcards.
   * Returns a paginated response with flashcards and metadata.
   */
  async listUserFlashcards({
    userId,
    page,
    pageSize,
    sort,
    deckId,
    reviewDue,
    search,
  }: ListUserFlashcardsOptions): Promise<FlashcardsListResponse> {
    // Validate deck ownership if deckId filter is provided
    if (deckId) {
      const deckExists = await this.ensureDeckAccessibility(userId, deckId);
      if (!deckExists) {
        throw new Error("DECK_NOT_FOUND_OR_INACCESSIBLE");
      }
    }

    const { column, ascending } = resolveSortClause(sort);

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = this.supabase
      .from("flashcards")
      .select(
        `
          id,
          front,
          back,
          deck_id,
          source,
          ease_factor,
          interval_days,
          repetition,
          next_review_at,
          created_at,
          updated_at,
          user_id,
          deleted_at
        `,
        { count: "exact" }
      )
      .eq("user_id", userId)
      .is("deleted_at", null);

    // Apply deck filter if provided
    if (deckId) {
      query = query.eq("deck_id", deckId);
    }

    // Apply review due filter if provided
    if (reviewDue) {
      const nowIso = new Date().toISOString();
      query = query.not("next_review_at", "is", null).lte("next_review_at", nowIso);
    }

    // Apply full-text search if provided
    if (search) {
      query = query.textSearch("search_vector", search);
    }

    // Apply sorting and pagination
    query = query.order(column, { ascending, nullsFirst: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const flashcards = (data ?? []).map((row) =>
      mapFlashcardRowToResponse(row as Parameters<typeof mapFlashcardRowToResponse>[0])
    );

    const totalCount = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

    return {
      data: flashcards,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  }

  /**
   * Retrieves a single flashcard by its ID.
   * Only the flashcard owner can access their own flashcards.
   * Returns the flashcard data or null if not found.
   */
  async getFlashcard(cardId: string): Promise<FlashcardResponse | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .select(
        `
        id,
        front,
        back,
        deck_id,
        source,
        ease_factor,
        interval_days,
        repetition,
        next_review_at,
        created_at,
        updated_at,
        user_id,
        deleted_at
      `
      )
      .eq("id", cardId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapFlashcardRowToResponse(data) : null;
  }

  /**
   * Soft-deletes a flashcard by setting its deleted_at timestamp.
   * Only the flashcard owner can perform this action.
   * Returns the updated flashcard if successful, null if not found.
   * Throws an error if the flashcard already exists but was already deleted.
   */
  async softDeleteFlashcard(userId: string, cardId: string): Promise<FlashcardResponse | null> {
    const { data, error } = await this.supabase
      .from("flashcards")
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", cardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select(
        `
        id,
        front,
        back,
        deck_id,
        source,
        ease_factor,
        interval_days,
        repetition,
        next_review_at,
        created_at,
        updated_at,
        user_id,
        deleted_at
      `
      )
      .single();

    if (error) {
      // Check if it's a "not found" error (no rows updated)
      if (error.code === "PGRST116") {
        // Check if the flashcard exists but is already deleted
        const { data: existingCard } = await this.supabase
          .from("flashcards")
          .select("deleted_at, source")
          .eq("id", cardId)
          .eq("user_id", userId)
          .single();

        if (existingCard?.deleted_at) {
          throw new Error("ALREADY_DELETED");
        }

        // Card doesn't exist or doesn't belong to user
        return null;
      }
      throw error;
    }

    // Create audit event for the deletion
    const eventService = new EventService(this.supabase);
    await eventService.createEvent({
      action: "delete",
      flashcardId: cardId,
      source: data.source,
      userId,
    });

    return mapFlashcardRowToResponse(data);
  }

  /**
   * Updates an existing flashcard with new content, deck assignment, or source.
   * Only the flashcard owner can perform this action.
   * Validates ownership of both the flashcard and any referenced deck.
   * Logs an "EDIT" event to the audit trail.
   *
   * @param userId - The ID of the user performing the update
   * @param cardId - The ID of the flashcard to update
   * @param updates - The fields to update on the flashcard
   * @returns The updated flashcard data
   * @throws Error if flashcard not found, not owned by user, or referenced deck issues
   */
  async updateFlashcard(userId: string, cardId: string, updates: UpdateFlashcardRequest): Promise<FlashcardResponse> {
    // First verify ownership and get current flashcard
    const { data: existingCard, error: fetchError } = await this.supabase
      .from("flashcards")
      .select("id, front, back, deck_id, source, user_id")
      .eq("id", cardId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .single();

    if (fetchError || !existingCard) {
      throw new Error("Flashcard not found or not owned by user");
    }

    // Validate deck ownership if deckId provided
    if (updates.deckId !== undefined && updates.deckId !== null) {
      const deckExists = await this.ensureDeckAccessibility(userId, updates.deckId);
      if (!deckExists) {
        throw new Error("Referenced deck does not exist or is not owned by user");
      }
    }

    // Build update payload
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.front !== undefined) updatePayload.front = updates.front;
    if (updates.back !== undefined) updatePayload.back = updates.back;
    if (updates.deckId !== undefined) updatePayload.deck_id = updates.deckId;
    if (updates.source !== undefined) updatePayload.source = updates.source;

    // Update flashcard
    const { data: updatedCard, error: updateError } = await this.supabase
      .from("flashcards")
      .update(updatePayload)
      .eq("id", cardId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    // Log edit event to audit trail
    const eventService = new EventService(this.supabase);
    await eventService.createEvent({
      action: "edit",
      flashcardId: cardId,
      source: existingCard.source,
      userId,
    });

    return mapFlashcardRowToResponse(updatedCard);
  }

  /**
   * Creates a new flashcard for the authenticated user.
   * Validates deck ownership if a deckId is provided.
   * SM-2 scheduling defaults are handled by database constraints.
   * Logs a "create" event to the audit trail.
   *
   * @param userId - The ID of the user creating the flashcard
   * @param data - The flashcard creation data
   * @returns The created flashcard data
   * @throws Error if referenced deck doesn't exist or isn't owned by user
   */
  async createFlashcard(userId: string, data: CreateFlashcardRequest): Promise<FlashcardResponse> {
    // Validate deck ownership if deckId provided
    if (data.deckId) {
      const deckExists = await this.ensureDeckAccessibility(userId, data.deckId);
      if (!deckExists) {
        throw new Error("Deck not found or not owned by user");
      }
    }

    // Ensure source has a default value
    const source = data.source || "manual";

    // Insert flashcard with defaults (SM-2 values handled by database constraints)
    const { data: flashcard, error } = await this.supabase
      .from("flashcards")
      .insert({
        user_id: userId,
        front: data.front,
        back: data.back,
        deck_id: data.deckId || null,
        source,
        // SM-2 defaults are handled by database constraints
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log create event to audit trail
    const eventService = new EventService(this.supabase);
    await eventService.createEvent({
      action: "create",
      flashcardId: flashcard.id,
      source,
      userId,
    });

    return mapFlashcardRowToResponse(flashcard);
  }
}
