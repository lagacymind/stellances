/**
 * Thin API client for the /auth endpoints.
 *
 * All requests go to NEXT_PUBLIC_API_URL (e.g. http://localhost:3001/api).
 * The backend sets the refresh_token as an httpOnly cookie; we only handle
 * the access_token on the client side.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  tokenVersion: number;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: AuthUser;
}

export interface ApiError {
  message: string | string[];
  error?: string;
  statusCode: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise backend error responses into a plain string.
 * NestJS validation pipes return `message` as a string array on 400s.
 */
export function extractErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof AuthApiError) {
    const msg = err.body.message;
    return Array.isArray(msg) ? msg.join(", ") : msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

export class AuthApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: ApiError
  ) {
    const msg = Array.isArray(body.message)
      ? body.message.join(", ")
      : body.message;
    super(msg);
    this.name = "AuthApiError";
  }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // credentials: "include" allows the browser to receive / send httpOnly cookies
    credentials: "include",
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errorBody: ApiError;
    try {
      errorBody = (await res.json()) as ApiError;
    } catch {
      errorBody = {
        message: res.statusText || "An unexpected error occurred.",
        statusCode: res.status,
      };
    }
    throw new AuthApiError(res.status, errorBody);
  }

  return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
}

export async function loginUser(payload: LoginPayload): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/login", payload);
}
