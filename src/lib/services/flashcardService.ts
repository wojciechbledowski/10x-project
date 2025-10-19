import type { SupabaseServerClient } from "../../db/supabase.client";
import type { FlashcardResponse, FlashcardsListResponse } from "../../types";

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
}
