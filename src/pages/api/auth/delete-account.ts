import type { APIRoute } from "astro";
import { createSupabaseServiceClient } from "../../../db/supabase.client";

/**
 * POST /api/auth/delete-account
 *
 * Permanently deletes the authenticated user's account and all associated data
 * Follows GDPR compliance requirements (FR-11 / US-009)
 *
 * Response:
 * - 200: Success with redirect message
 * - 401: Not authenticated
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create regular client to verify authentication
    const supabase = createSupabaseServiceClient({ cookies, headers: request.headers });

    // Verify user is authenticated
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

    const userId = user.id;

    // Delete user data in the correct order (respecting foreign key constraints)

    // 1. Delete flashcards first (referenced by card_generations)
    const { error: flashcardsError } = await supabase.from("flashcards").delete().eq("user_id", userId);

    if (flashcardsError) {
      console.error("Error deleting flashcards:", flashcardsError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete flashcards",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 2. Delete decks (flashcards already deleted due to cascade)
    const { error: decksError } = await supabase.from("decks").delete().eq("user_id", userId);

    if (decksError) {
      console.error("Error deleting decks:", decksError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete decks",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 3. Delete AI generations and batches
    const { error: generationsError } = await supabase.from("ai_generations").delete().eq("user_id", userId);

    if (generationsError) {
      console.error("Error deleting AI generations:", generationsError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete AI generations",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 4. Delete generation batches (ai_generations already deleted due to cascade)
    const { error: batchesError } = await supabase.from("generation_batches").delete().eq("user_id", userId);

    if (batchesError) {
      console.error("Error deleting generation batches:", batchesError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete generation batches",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 5. Delete reviews (partitioned table)
    const { error: reviewsError } = await supabase.from("reviews").delete().eq("user_id", userId);

    if (reviewsError) {
      console.error("Error deleting reviews:", reviewsError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete reviews",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 6. Delete events (partitioned table) - Note: events table exists but may need special handling
    const { error: eventsError } = await supabase.from("events").delete().eq("user_id", userId);

    if (eventsError) {
      console.error("Error deleting events:", eventsError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete events",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // 7. Finally, delete the user from Supabase Auth
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteUserError) {
      console.error("Error deleting user from auth:", deleteUserError);
      return new Response(
        JSON.stringify({
          error: "auth.errors.unexpectedError",
          message: "Failed to delete user account",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Clear all cookies to log out the user
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });
    cookies.delete("sb-user", { path: "/" });
    // Clear other known Supabase cookies
    cookies.delete("sb-provider-token", { path: "/" });
    cookies.delete("sb-session", { path: "/" });

    // Return success - client should redirect to home page
    return new Response(
      JSON.stringify({
        success: true,
        message: "profile.accountDeleted",
        redirect: "/",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Delete account API error:", error);

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
