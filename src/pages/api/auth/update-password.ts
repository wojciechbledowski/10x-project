import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { updatePasswordSchema } from "../../../lib/auth/schemas";

/**
 * POST /api/auth/update-password
 *
 * Updates the authenticated user's password
 * Requires current password verification (handled by Supabase)
 *
 * Request body: { currentPassword: string, newPassword: string }
 *
 * Response:
 * - 200: Success with confirmation message
 * - 400: Validation error or current password incorrect
 * - 401: Not authenticated
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validation = updatePasswordSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.invalidPassword", // Return translation key for general password error
          details: validation.error.errors.map((err) => err.message),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { newPassword } = validation.data;

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

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

    // Attempt to update password
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      // Map Supabase errors to translation keys
      let errorKey = "auth.errors.unexpectedError";

      if (error.message.includes("Password should be")) {
        errorKey = "auth.errors.passwordComplexity";
      } else if (error.message.includes("Invalid password")) {
        errorKey = "auth.errors.invalidCredentials";
      }

      return new Response(
        JSON.stringify({
          error: errorKey,
          message: error.message,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "profile.passwordUpdated",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Update password API error:", error);

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
