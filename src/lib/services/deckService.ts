import type { SupabaseServerClient } from "../../db/supabase.client";
import type {
  CreateDeckRequest,
  DeckDetailResponse,
  DeckResponse,
  DecksListResponse,
  UpdateDeckRequest,
} from "../../types";
import type { ListDecksQueryParams } from "../decks/schemas";

export type SoftDeleteDeckOutcome =
  | { status: "deleted"; deck: DeckResponse }
  | { status: "already_deleted" }
  | { status: "not_found" };

export class DeckService {
  constructor(private readonly supabase: SupabaseServerClient) {}

  async getDeckDetail(deckId: string): Promise<DeckDetailResponse | null> {
    const { data, error } = await this.supabase
      .from("decks")
      .select(
        `
          id,
          name,
          created_at,
          flashcards!inner(count)
        `
      )
      .eq("id", deckId)
      .is("deleted_at", null)
      .is("flashcards.deleted_at", null)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const deck = data as {
      id: string;
      name: string;
      created_at: string;
      flashcards?: { count: number | null }[] | null;
    };

    const cardCount = deck.flashcards?.[0]?.count ?? 0;

    return {
      id: deck.id,
      name: deck.name,
      createdAt: deck.created_at,
      cardCount,
    };
  }

  async createDeck(userId: string, payload: CreateDeckRequest): Promise<DeckResponse> {
    const insertPayload = {
      name: payload.name,
      user_id: userId,
    };

    const { data, error } = await this.supabase
      .from("decks")
      .insert(insertPayload)
      .select("id, name, created_at")
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      name: data.name,
      createdAt: new Date(data.created_at).toISOString(),
    };
  }

  async softDeleteDeck(userId: string, deckId: string): Promise<SoftDeleteDeckOutcome> {
    const deletedAt = new Date().toISOString();

    const { data, error } = await this.supabase
      .from("decks")
      .update({ deleted_at: deletedAt })
      .eq("id", deckId)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .select("id, name, created_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      const deck: DeckResponse = {
        id: data.id,
        name: data.name,
        createdAt: new Date(data.created_at).toISOString(),
      };

      return { status: "deleted", deck };
    }

    const { data: existingDeck, error: fetchError } = await this.supabase
      .from("decks")
      .select("deleted_at")
      .eq("id", deckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!existingDeck) {
      return { status: "not_found" };
    }

    if (existingDeck.deleted_at) {
      return { status: "already_deleted" };
    }

    return { status: "not_found" };
  }

  async listDecks(userId: string, params: ListDecksQueryParams): Promise<DecksListResponse> {
    const { page, pageSize, sort } = params;

    const isDescending = sort.startsWith("-");
    const sortField = isDescending ? sort.slice(1) : sort;
    const orderColumn = sortField === "name" ? "name" : "created_at";
    const orderAscending = !isDescending;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await this.supabase
      .from("decks")
      .select("id, name, created_at", { count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null)
      .order(orderColumn, { ascending: orderAscending })
      .range(from, to);

    if (error) {
      throw error;
    }

    const deckRows = (data ?? []) as { id: string; name: string; created_at: string }[];

    const deckResponses: DeckResponse[] = deckRows.map((deck) => ({
      id: deck.id,
      name: deck.name,
      createdAt: new Date(deck.created_at).toISOString(),
    }));

    const totalCount = count ?? deckResponses.length;
    const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);

    return {
      data: deckResponses,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
      },
    };
  }

  async updateDeck(userId: string, deckId: string, updates: UpdateDeckRequest): Promise<DeckResponse | null> {
    if (!updates || (updates.name === undefined && updates.deletedAt === undefined)) {
      throw new Error("No update fields provided");
    }

    const { data: existingDeck, error: fetchError } = await this.supabase
      .from("decks")
      .select("id, name, created_at, deleted_at")
      .eq("id", deckId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    if (!existingDeck) {
      return null;
    }

    const updatePayload: Record<string, unknown> = {};

    if (updates.name !== undefined && updates.name !== existingDeck.name) {
      updatePayload.name = updates.name;
    }

    if (updates.deletedAt !== undefined) {
      updatePayload.deleted_at = updates.deletedAt;
    }

    if (Object.keys(updatePayload).length === 0) {
      return {
        id: existingDeck.id,
        name: existingDeck.name,
        createdAt: new Date(existingDeck.created_at).toISOString(),
      };
    }

    const { data: updatedDeck, error } = await this.supabase
      .from("decks")
      .update(updatePayload)
      .eq("id", deckId)
      .eq("user_id", userId)
      .select("id, name, created_at")
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedDeck) {
      return null;
    }

    return {
      id: updatedDeck.id,
      name: updatedDeck.name,
      createdAt: new Date(updatedDeck.created_at).toISOString(),
    };
  }
}
