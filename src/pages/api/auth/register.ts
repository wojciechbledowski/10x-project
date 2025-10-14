import type { APIRoute } from "astro";
import { createSupabaseServerInstance } from "../../../db/supabase.client";
import { registerSchema } from "../../../lib/auth/schemas";

/**
 * POST /api/auth/register
 *
 * Registers a new user with email and password
 * Sends confirmation email via Supabase Auth
 *
 * Request body: { email: string, password: string, confirmPassword: string }
 *
 * Response:
 * - 200: Success - confirmation email sent
 * - 400: Validation error or user already exists
 * - 500: Server error
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate request with Zod schema
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "auth.errors.validationError", // Return translation key
          details: validation.error.errors.map((err) => err.message),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { name, email, password } = validation.data;

    // Create Supabase server instance with cookie handling
    const supabase = createSupabaseServerInstance({
      cookies,
      headers: request.headers,
    });

    // Attempt to sign up with user metadata containing display name
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name, // Store display name in user metadata
        },
      },
    });

    if (error) {
      // Map Supabase errors to translation keys
      let errorKey = "auth.errors.unexpectedError";

      if (error.message.includes("User already registered")) {
        errorKey = "auth.errors.userAlreadyExists";
      } else if (error.message.includes("Password should be at least")) {
        errorKey = "auth.errors.passwordTooWeak";
      } else if (error.message.includes("Unable to validate email address")) {
        errorKey = "auth.errors.invalidEmail";
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

    // Check if user needs email confirmation
    if (data.user && !data.session) {
      // User registered but needs email confirmation
      return new Response(
        JSON.stringify({
          success: true,
          needsConfirmation: true,
          message: "auth.success.registrationPending",
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
    }

    // User registered and automatically signed in (if email confirmation disabled)
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: data.user?.id,
          email: data.user?.email,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Register API error:", error);

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
