import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { resetRequestSchema } from "../../../lib/auth/schemas";

/**
 * POST /api/auth/reset-password
 *
 * Sends a password reset email to the provided email address
 * Uses Supabase built-in email templates and token generation
 *
 * Request body: { email: string }
 *
 * Response:
 * - 200: Success with reset email sent
 * - 400: Validation error
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validation = resetRequestSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.invalidEmail", // Return translation key
          details: validation.error.errors.map((err) => err.message),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = validation.data;

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/reset-password/[token]`,
    });

    if (error) {
      // Log the error but don't expose details to client
      // eslint-disable-next-line no-console
      console.error("Password reset error:", error);

      // For security, we always return success even if email doesn't exist
      // This prevents email enumeration attacks
      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Return success
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
    console.error("Reset password API error:", error);

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
