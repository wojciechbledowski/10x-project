import { defineMiddleware } from "astro:middleware";
import { supabaseClient } from "../db/supabase.client";

/**
 * Auth middleware that protects routes requiring authentication
 * Public routes: /, /login, /signup, /privacy, /terms, /error
 * Protected routes: /decks, /review, /profile, /test-error (dev only)
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect } = context;
  const pathname = url.pathname;

  // Make Supabase client available in all routes
  context.locals.supabase = supabaseClient;

  // Define public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup", "/privacy", "/terms", "/error", "/test-error"];

  // Check if current route is public
  const isPublicRoute = publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"));

  // Allow public routes and static assets
  if (isPublicRoute || pathname.startsWith("/_") || pathname.includes(".")) {
    return next();
  }

  // Check authentication for protected routes
  try {
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    // If no session or error, redirect to login
    if (error || !session) {
      return redirect("/login");
    }

    // User is authenticated, allow access
    // Store user info in locals for use in pages
    context.locals.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
    };

    return next();
  } catch (error) {
    // On any error, redirect to login
    // eslint-disable-next-line no-console
    console.error("Auth middleware error:", error);
    return redirect("/login");
  }
});
