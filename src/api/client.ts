// Thin fetch wrapper for the six DevBoard backend services, all reached
// through the vite.config.ts dev proxy (see BACKEND_GAPS.md for the
// production-build gap that leaves open).
//
// Every backend returns the same error shape on failure:
//   { detail: string, errors: Record<string, string[]> | null }

const REFRESH_TOKEN_KEY = 'devboard_refresh_token';

// Access token lives in memory only (never localStorage, never logged) —
// lost on a hard reload, which is why `initAuth()` re-derives it from the
// refresh token on boot.
let accessToken: string | null = null;

export class ApiError extends Error {
  status: number;
  detail: string;
  errors: Record<string, string[]> | null;

  constructor(status: number, detail: string, errors: Record<string, string[]> | null) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setRefreshToken(token: string) {
  try {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } catch {
    // Private browsing / blocked storage — session just won't survive reload.
  }
}

function clearRefreshToken() {
  try {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Nothing to clear if storage isn't available in the first place.
  }
}

function setSession(tokens: { access_token: string; refresh_token?: string }) {
  accessToken = tokens.access_token;
  if (tokens.refresh_token) setRefreshToken(tokens.refresh_token);
}

export function clearSession() {
  accessToken = null;
  clearRefreshToken();
}

export function isAuthed(): boolean {
  return accessToken !== null;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

// Guards against firing multiple simultaneous refreshes if several requests
// 401 at once — mirrors devboard-web's client.py::call() single-flight idea,
// just without the server-side lock (single browser tab, nothing to share it with).
let refreshInFlight: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight;

  const refresh_token = getRefreshToken();
  if (!refresh_token) {
    clearSession();
    throw new ApiError(401, 'No refresh token available', null);
  }

  refreshInFlight = (async () => {
    const res = await fetch('/auth/refresh-token/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });

    if (!res.ok) {
      clearSession();
      const body = await safeJson(res);
      throw new ApiError(res.status, body?.detail ?? 'Session expired', body?.errors ?? null);
    }

    const data: LoginResponse = await res.json();
    setSession(data);
    return data.access_token;
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

async function safeJson(res: Response): Promise<{ detail?: string; errors?: Record<string, string[]> | null } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** Internal: set on the retried call so a second 401 doesn't loop. */
  _isRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Every real API call (not login/register/refresh) goes through this. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, _isRetry } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && !_isRetry) {
    await refreshAccessToken();
    return request<T>(path, { ...options, _isRetry: true });
  }

  if (!res.ok) {
    const errBody = await safeJson(res);
    throw new ApiError(res.status, errBody?.detail ?? res.statusText, errBody?.errors ?? null);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiGet = <T>(path: string, query?: RequestOptions['query']) => request<T>(path, { method: 'GET', query });
export const apiPost = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body });
export const apiPatch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body });
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' });

// --- Auth: these bypass `request()` since they run before an access token exists ---

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch('/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Login failed', body?.errors ?? null);
  }
  const data: LoginResponse = await res.json();
  setSession(data);
}

export async function register(email: string, password: string): Promise<void> {
  const res = await fetch('/auth/register/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Registration failed', body?.errors ?? null);
  }
}

export async function logout(): Promise<void> {
  const refresh_token = getRefreshToken();
  clearSession();
  if (!refresh_token) return;
  try {
    await fetch('/auth/logout/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
  } catch {
    // Best-effort — the client-side session is already cleared either way.
  }
}

export async function verifyEmail(token: string): Promise<void> {
  // Not `request()`: this is a public, tokenless endpoint hit straight from
  // an emailed link, often with no session at all. `request()`'s
  // refresh-on-401 logic would swallow a real "token invalid or expired"
  // 401 from the backend and replace it with a confusing "no refresh token
  // available" instead.
  const res = await fetch(`/auth/verify-email/?token=${encodeURIComponent(token)}`);
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Verification failed', body?.errors ?? null);
  }
}

export async function resendVerification(email: string): Promise<void> {
  const res = await fetch('/auth/resend-verification/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Could not resend verification email', body?.errors ?? null);
  }
}

export async function forgotPassword(email: string): Promise<void> {
  const res = await fetch('/auth/forgot-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Could not send reset email', body?.errors ?? null);
  }
}

export async function resetPassword(token: string, password: string): Promise<void> {
  const res = await fetch('/auth/reset-password/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });
  if (!res.ok) {
    const body = await safeJson(res);
    throw new ApiError(res.status, body?.detail ?? 'Could not reset password', body?.errors ?? null);
  }
}

/**
 * Called once on app boot. If a refresh token survived from a previous
 * session, trade it for a fresh access token before the app renders the
 * authenticated shell. Returns whether the user is signed in.
 */
export async function initAuth(): Promise<boolean> {
  if (!getRefreshToken()) return false;
  try {
    await refreshAccessToken();
    return true;
  } catch {
    return false;
  }
}
