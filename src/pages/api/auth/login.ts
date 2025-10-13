import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { loginSchema } from "../../../lib/auth/schemas";

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password
 * Sets HTTP-only cookies for session management
 *
 * Request body: { email: string, password: string }
 *
 * Response:
 * - 200: Success with user data
 * - 400: Validation error or invalid credentials
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validation = loginSchema.safeParse(body);

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

    const { email, password } = validation.data;

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt to sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Map Supabase errors to translation keys
      let errorKey = "auth.errors.unexpectedError";

      if (error.message.includes("Invalid login credentials")) {
        errorKey = "auth.errors.invalidCredentials";
      } else if (error.message.includes("Email not confirmed")) {
        errorKey = "auth.errors.emailNotConfirmed";
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

    // Return success with minimal user data
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Login API error:", error);

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
