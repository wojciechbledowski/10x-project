import type { SupabaseServerClient } from "../../db/supabase.client";
import type { FlashcardSource } from "../../types";

export interface CreateEventParams {
  action: "delete" | "edit" | "create" | "accept";
  flashcardId: string;
  source: FlashcardSource;
  userId: string;
}

export class EventService {
  constructor(private readonly supabase: SupabaseServerClient) {}

  /**
   * Creates an audit event for tracking flashcard operations.
   */
  async createEvent({ action, flashcardId, source, userId }: CreateEventParams): Promise<void> {
    const { error } = await this.supabase.from("events").insert({
      action,
      flashcard_id: flashcardId,
      source,
      user_id: userId,
    });

    if (error) {
      throw error;
    }
  }
}
