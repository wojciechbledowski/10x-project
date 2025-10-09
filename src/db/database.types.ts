export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;

    Views: Record<never, never>;

    Functions: {
      graphql: {
        Args: {
          extensions?: Json;

          operationName?: string;

          query?: string;

          variables?: Json;
        };

        Returns: Json;
      };
    };

    Enums: Record<never, never>;

    CompositeTypes: Record<never, never>;
  };

  public: {
    Tables: {
      ai_generations: {
        Row: {
          completion_tokens: number | null;

          config: Json;

          created_at: string;

          deck_id: string | null;

          error_message: string | null;

          generation_batch_id: string | null;

          id: string;

          model_name: string;

          model_version: string | null;

          prompt_tokens: number | null;

          status: string;

          temperature: number | null;

          top_p: number | null;

          user_id: string;
        };

        Insert: {
          completion_tokens?: number | null;

          config?: Json;

          created_at?: string;

          deck_id?: string | null;

          error_message?: string | null;

          generation_batch_id?: string | null;

          id?: string;

          model_name: string;

          model_version?: string | null;

          prompt_tokens?: number | null;

          status: string;

          temperature?: number | null;

          top_p?: number | null;

          user_id: string;
        };

        Update: {
          completion_tokens?: number | null;

          config?: Json;

          created_at?: string;

          deck_id?: string | null;

          error_message?: string | null;

          generation_batch_id?: string | null;

          id?: string;

          model_name?: string;

          model_version?: string | null;

          prompt_tokens?: number | null;

          status?: string;

          temperature?: number | null;

          top_p?: number | null;

          user_id?: string;
        };

        Relationships: [
          {
            foreignKeyName: "ai_generations_deck_id_fkey";

            columns: ["deck_id"];

            isOneToOne: false;

            referencedRelation: "decks";

            referencedColumns: ["id"];
          },

          {
            foreignKeyName: "ai_generations_generation_batch_id_fkey";

            columns: ["generation_batch_id"];

            isOneToOne: false;

            referencedRelation: "generation_batches";

            referencedColumns: ["id"];
          },
        ];
      };

      background_jobs: {
        Row: {
          created_at: string;

          id: string;

          job_type: string;

          last_error: string | null;

          payload: Json;

          retry_count: number;

          status: string;

          updated_at: string;
        };

        Insert: {
          created_at?: string;

          id?: string;

          job_type: string;

          last_error?: string | null;

          payload: Json;

          retry_count?: number;

          status: string;

          updated_at?: string;
        };

        Update: {
          created_at?: string;

          id?: string;

          job_type?: string;

          last_error?: string | null;

          payload?: Json;

          retry_count?: number;

          status?: string;

          updated_at?: string;
        };

        Relationships: [];
      };

      card_generations: {
        Row: {
          flashcard_id: string;

          generation_id: string;
        };

        Insert: {
          flashcard_id: string;

          generation_id: string;
        };

        Update: {
          flashcard_id?: string;

          generation_id?: string;
        };

        Relationships: [
          {
            foreignKeyName: "card_generations_flashcard_id_fkey";

            columns: ["flashcard_id"];

            isOneToOne: false;

            referencedRelation: "flashcards";

            referencedColumns: ["id"];
          },

          {
            foreignKeyName: "card_generations_generation_id_fkey";

            columns: ["generation_id"];

            isOneToOne: false;

            referencedRelation: "ai_generations";

            referencedColumns: ["id"];
          },
        ];
      };

      decks: {
        Row: {
          created_at: string;

          deleted_at: string | null;

          id: string;

          name: string;

          user_id: string;
        };

        Insert: {
          created_at?: string;

          deleted_at?: string | null;

          id?: string;

          name: string;

          user_id: string;
        };

        Update: {
          created_at?: string;

          deleted_at?: string | null;

          id?: string;

          name?: string;

          user_id?: string;
        };

        Relationships: [];
      };

      events: {
        Row: {
          action: string;

          created_at: string;

          flashcard_id: string;

          id: number;

          source: Database["public"]["Enums"]["source_enum"];

          user_id: string;
        };

        Insert: {
          action: string;

          created_at?: string;

          flashcard_id: string;

          id?: number;

          source: Database["public"]["Enums"]["source_enum"];

          user_id: string;
        };

        Update: {
          action?: string;

          created_at?: string;

          flashcard_id?: string;

          id?: number;

          source?: Database["public"]["Enums"]["source_enum"];

          user_id?: string;
        };

        Relationships: [
          {
            foreignKeyName: "events_flashcard_id_fkey";

            columns: ["flashcard_id"];

            isOneToOne: false;

            referencedRelation: "flashcards";

            referencedColumns: ["id"];
          },
        ];
      };

      events_2025_10: {
        Row: {
          action: string;

          created_at: string;

          flashcard_id: string;

          id: number;

          source: Database["public"]["Enums"]["source_enum"];

          user_id: string;
        };

        Insert: {
          action: string;

          created_at?: string;

          flashcard_id: string;

          id?: number;

          source: Database["public"]["Enums"]["source_enum"];

          user_id: string;
        };

        Update: {
          action?: string;

          created_at?: string;

          flashcard_id?: string;

          id?: number;

          source?: Database["public"]["Enums"]["source_enum"];

          user_id?: string;
        };

        Relationships: [];
      };

      flashcards: {
        Row: {
          back: string;

          created_at: string;

          deck_id: string | null;

          deleted_at: string | null;

          ease_factor: number;

          front: string;

          id: string;

          interval_days: number;

          next_review_at: string | null;

          repetition: number;

          source: Database["public"]["Enums"]["source_enum"];

          updated_at: string;

          user_id: string;
        };

        Insert: {
          back: string;

          created_at?: string;

          deck_id?: string | null;

          deleted_at?: string | null;

          ease_factor?: number;

          front: string;

          id?: string;

          interval_days?: number;

          next_review_at?: string | null;

          repetition?: number;

          source?: Database["public"]["Enums"]["source_enum"];

          updated_at?: string;

          user_id: string;
        };

        Update: {
          back?: string;

          created_at?: string;

          deck_id?: string | null;

          deleted_at?: string | null;

          ease_factor?: number;

          front?: string;

          id?: string;

          interval_days?: number;

          next_review_at?: string | null;

          repetition?: number;

          source?: Database["public"]["Enums"]["source_enum"];

          updated_at?: string;

          user_id?: string;
        };

        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey";

            columns: ["deck_id"];

            isOneToOne: false;

            referencedRelation: "decks";

            referencedColumns: ["id"];
          },
        ];
      };

      generation_batches: {
        Row: {
          created_at: string;

          id: string;

          user_id: string;
        };

        Insert: {
          created_at?: string;

          id?: string;

          user_id: string;
        };

        Update: {
          created_at?: string;

          id?: string;

          user_id?: string;
        };

        Relationships: [];
      };

      reviews: {
        Row: {
          created_at: string;

          flashcard_id: string;

          id: string;

          latency_ms: number | null;

          quality: number;

          user_id: string;
        };

        Insert: {
          created_at?: string;

          flashcard_id: string;

          id?: string;

          latency_ms?: number | null;

          quality: number;

          user_id: string;
        };

        Update: {
          created_at?: string;

          flashcard_id?: string;

          id?: string;

          latency_ms?: number | null;

          quality?: number;

          user_id?: string;
        };

        Relationships: [
          {
            foreignKeyName: "reviews_flashcard_id_fkey";

            columns: ["flashcard_id"];

            isOneToOne: false;

            referencedRelation: "flashcards";

            referencedColumns: ["id"];
          },
        ];
      };

      reviews_2025_10: {
        Row: {
          created_at: string;

          flashcard_id: string;

          id: string;

          latency_ms: number | null;

          quality: number;

          user_id: string;
        };

        Insert: {
          created_at?: string;

          flashcard_id: string;

          id?: string;

          latency_ms?: number | null;

          quality: number;

          user_id: string;
        };

        Update: {
          created_at?: string;

          flashcard_id?: string;

          id?: string;

          latency_ms?: number | null;

          quality?: number;

          user_id?: string;
        };

        Relationships: [];
      };
    };

    Views: {
      metrics_daily: {
        Row: {
          acceptance_rate: number | null;

          ai_usage_rate: number | null;

          cards_accepted: number | null;

          cards_generated: number | null;

          metric_date: string | null;

          user_id: string | null;
        };

        Relationships: [];
      };
    };

    Functions: {
      apply_owner_rls: {
        Args: { target_table: string };

        Returns: undefined;
      };

      drop_policies: {
        Args: { suffixes: string[]; target_table: string };

        Returns: undefined;
      };
    };

    Enums: {
      source_enum: "ai" | "manual" | "ai_edited";
    };

    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },

  public: {
    Enums: {
      source_enum: ["ai", "manual", "ai_edited"],
    },
  },
} as const;
