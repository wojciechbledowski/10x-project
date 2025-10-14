import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

/**
 * POST /api/auth/logout
 *
 * Signs out the current user and clears the session
 * Removes HTTP-only cookies for session management
 *
 * Request body: (empty)
 *
 * Response:
 * - 200: Success
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Sign out the user
    const { error } = await supabase.auth.signOut();

    if (error) {
      // Log the error but still proceed with logout on client side
      console.error("Logout API error:", error);
    }

    // Return success - cookies will be cleared automatically by Supabase
    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Logout API error:", error);

    return new Response(
      JSON.stringify({
        error: "auth.errors.unexpectedError",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
