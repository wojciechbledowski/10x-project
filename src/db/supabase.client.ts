import type { AstroCookies } from "astro";
import { createServerClient, type CookieOptionsWithName } from "@supabase/ssr";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_SERVICE_ROLE_KEY } from "astro:env/server";

/**
 * Cookie options for Supabase auth
 * Per supabase-auth.mdc requirements
 */
export const cookieOptions: CookieOptionsWithName = {
  path: "/",
  secure: true,
  httpOnly: true,
  sameSite: "lax",
};

/**
 * Parse cookie header string into array of name-value pairs
 */
function parseCookieHeader(cookieHeader: string): { name: string; value: string }[] {
  return cookieHeader.split(";").map((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    return { name, value: rest.join("=") };
  });
}

/**
 * Create Supabase server instance with SSR cookie handling
 * This is the ONLY way to create Supabase clients in this application
 *
 * @param context - Object containing request headers and Astro cookies
 * @returns Configured Supabase server client
 */
export const createSupabaseServerInstance = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookieOptions,
    cookies: {
      getAll() {
        return parseCookieHeader(context.headers.get("Cookie") ?? "");
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
      },
    },
  });

  return supabase;
};

export type SupabaseServerClient = ReturnType<typeof createSupabaseServerInstance>;

/**
 * Create Supabase service role client for admin operations
 * Uses SUPABASE_SERVICE_ROLE_KEY for full access (deleting users, etc.)
 * This is the ONLY way to create service role clients in this application
 *
 * @param context - Object containing request headers and Astro cookies
 * @returns Configured Supabase service role client
 */
export const createSupabaseServiceClient = (context: { headers: Headers; cookies: AstroCookies }) => {
  const supabase = createServerClient<Database>(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY, // Service role key for admin operations
    {
      cookieOptions,
      cookies: {
        getAll() {
          return parseCookieHeader(context.headers.get("Cookie") ?? "");
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => context.cookies.set(name, value, options));
        },
      },
    }
  );

  return supabase;
};
