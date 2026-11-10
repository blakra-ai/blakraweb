import { getSession } from "@/shared/auth/session";
import { ApiError } from "./ApiError";
import type { Issue } from "./types";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Public endpoints (e.g. platform rules) skip auth headers. */
  anonymous?: boolean;
}

/** The only place that talks HTTP to the backend: auth headers, JSON, problem+json → ApiError. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  // X-Requested-With: the backend's CSRF check for state-changing account/admin endpoints.
  const headers: Record<string, string> = { Accept: "application/json", "X-Requested-With": "blakrasocial", ...options.headers };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const session = options.anonymous ? null : getSession();
  if (session) {
    const token = await session.getAccessToken();
    headers.Authorization = `Bearer ${token}`;
    headers["X-Profile-Key"] = session.getProfileKey(token);
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw ApiError.network();
  }

  if (response.status === 204) return undefined as T;
  const payload: unknown = await response.json().catch(() => undefined);
  if (response.ok) return payload as T;

  if (response.status === 401) session?.onUnauthorized?.();
  const problem = (payload ?? {}) as { type?: string; title?: string; detail?: string; errors?: Issue[]; requestId?: string };
  throw new ApiError({
    status: response.status,
    type: problem.type ?? "about:blank",
    title: problem.title ?? response.statusText,
    detail: problem.detail,
    issues: problem.errors,
    requestId: problem.requestId ?? response.headers.get("X-Request-Id") ?? undefined,
  });
}
