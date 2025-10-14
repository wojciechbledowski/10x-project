import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";

/**
 * POST /api/auth/update-display-name
 *
 * Updates the authenticated user's display name in user metadata
 *
 * Request body: { displayName: string }
 *
 * Response:
 * - 200: Success with updated display name
 * - 400: Validation error
 * - 401: Not authenticated
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { displayName } = body;

    // Basic validation
    if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.nameRequired",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    if (displayName.length > 100) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.nameTooLong",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Verify user is authenticated (though middleware should handle this)
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.sessionExpired",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update user metadata with new display name
    const { error } = await supabase.auth.updateUser({
      data: {
        full_name: displayName.trim(),
      },
    });

    if (error) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success with updated display name
    return new Response(
      JSON.stringify({
        success: true,
        message: "profile.displayNameUpdated",
        displayName: displayName.trim(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Update display name API error:", error);

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
