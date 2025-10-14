import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../../db/supabase.client";
import { resetPasswordSchema } from "../../../../lib/auth/schemas";

/**
 * POST /api/auth/reset-password/[token]
 *
 * Resets a user's password using a reset token from email
 * Validates the token and updates the password
 *
 * Request body: { password: string, confirmPassword: string }
 * URL param: token - The reset token from the email link
 *
 * Response:
 * - 200: Success with password updated
 * - 400: Validation error or invalid/expired token
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, params, cookies }) => {
  try {
    const { token } = params;

    if (!token) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.invalidToken",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validation = resetPasswordSchema.safeParse(body);

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

    const { password } = validation.data;

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Verify the session using the access token from the reset link
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.invalidToken",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Update the password
    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      // Map Supabase errors to translation keys
      let errorKey = "auth.errors.unexpectedError";

      if (error.message.includes("Password should be")) {
        errorKey = "auth.errors.passwordComplexity";
      } else if (error.message.includes("Invalid")) {
        errorKey = "auth.errors.invalidToken";
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
        message: "auth.success.passwordReset",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Reset password with token API error:", error);

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
