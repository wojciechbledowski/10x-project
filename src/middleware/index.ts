import { defineMiddleware } from "astro:middleware";
import { createSupabaseServerInstance } from "../db/supabase.client";

/**
 * Public paths that don't require authentication
 * Includes auth pages, API endpoints, and legal pages
 */
const PUBLIC_PATHS = [
  // Server-Rendered Astro Pages
  "/",
  "/auth/login",
  "/auth/register",
  "/auth/reset-password",
  "/privacy",
  "/terms",
  "/error",
  "/test-error",
  // Auth API endpoints
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/logout",
  "/api/auth/reset-password",
];

/**
 * Auth middleware that protects routes requiring authentication
 * Follows supabase-auth.mdc specification for SSR cookie handling
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { url, redirect, cookies, request } = context;
  const pathname = url.pathname;

  // Allow static assets and Astro internals
  if (pathname.startsWith("/_") || pathname.includes(".")) {
    return next();
  }

  // Create SSR-compatible Supabase instance
  const supabase = createSupabaseServerInstance({
    cookies,
    headers: request.headers,
  });

  // Make Supabase available in locals for use in routes
  context.locals.supabase = supabase;

  // Check if current path is public (exact match or starts with path)
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(path + "/"));

  // Skip auth check for public paths
  if (isPublicPath) {
    return next();
  }

  // IMPORTANT: Always get user session using getUser() for protected routes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Store user info in locals, including name from metadata or fallback to email
    const displayName =
      user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "User";

    context.locals.user = {
      email: user.email,
      id: user.id,
      name: displayName,
    };
    return next();
  }

  // No valid session - redirect to login
  return redirect("/auth/login");
});
