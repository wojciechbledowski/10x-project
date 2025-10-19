import type { ApiErrorResponse } from "../../types";

interface JsonResponseOptions {
  headers?: Record<string, string>;
}

const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

export function createJsonResponse<T>(status: number, payload: T, options?: JsonResponseOptions): Response {
  const headers = {
    ...defaultHeaders,
    ...options?.headers,
  };

  return new Response(JSON.stringify(payload), {
    status,
    headers,
  });
}

export function createErrorResponse(
  status: number,
  error: ApiErrorResponse["error"],
  options?: JsonResponseOptions
): Response {
  return createJsonResponse(status, { error }, options);
}
