/**
 * Transport layer.
 *
 * Every service call goes to the FastAPI backend under `/api/v1`
 * (proxied to http://localhost:8001 by Vite in development).
 *
 * If the API cannot be reached — for example the FastAPI process is not
 * running, or during server-side rendering — the request transparently falls
 * back to the bundled  dataset so the UI keeps working. Real HTTP errors
 * (4xx/5xx) are surfaced as `ApiError` and never fall back.
 */
const DEV_API_BASE_URL = "http://localhost:8001/api/v1";

/**
 * Override with VITE_API_BASE_URL. In development we call the FastAPI server
 * directly (CORS is configured for localhost:8080 / :5173); in production the
 * app expects the API to be served under the same origin at /api/v1.
 */
export const API_BASE_URL =
  (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ??
  (import.meta.env.DEV ? DEV_API_BASE_URL : "/api/v1");

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: HttpMethod;
  body?: unknown;
  query?: Record<string, string | number | undefined>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let offlineNoticeShown = false;

function noticeOffline(path: string, reason: unknown) {
  if (offlineNoticeShown) return;
  offlineNoticeShown = true;
  console.info(
    `[GreenPharm] API unreachable (${path}) — using bundled data. ` +
      `Start the FastAPI backend with: uvicorn app.main:app --port 8001`,
    reason,
  );
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

/**
 * @param path      REST path relative to /api/v1
 * @param fallback  offline resolver against the bundled dataset
 * @param options   HTTP method / body / query string
 */
export async function request<T>(
  path: string,
  fallback: () => T,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query } = options;

  if (typeof fetch !== "function") {
    return structuredClone(fallback());
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? null : JSON.stringify(body),
    });
  } catch (error) {
    noticeOffline(path, error);
    return structuredClone(fallback());
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 404 && payload === null) {
      // Route not served by the API (e.g. dev server without backend proxy).
      noticeOffline(path, "endpoint not found");
      return structuredClone(fallback());
    }
    const detail =
      (payload as { detail?: unknown } | null)?.detail ?? `Request failed (${response.status})`;
    throw new ApiError(
      typeof detail === "string" ? detail : JSON.stringify(detail),
      response.status,
    );
  }

  return payload as T;
}
