/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";
import type { Theme } from "./types";
import type { Language } from "./lib/i18n/config.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string | undefined;
        name: string;
      };
      theme: Theme;
      lang: Language;
    }
  }
}
