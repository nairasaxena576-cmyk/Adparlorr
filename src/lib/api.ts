// The backend API URL always comes from VITE_API_URL (set per-environment —
// see .env.example). The localhost fallback below only ever applies in the
// Vite dev server (import.meta.env.DEV), so a production build never
// silently points at a developer's machine.
const configuredApiUrl = import.meta.env.VITE_API_URL;

if (!configuredApiUrl && !import.meta.env.DEV) {
  console.error(
    'VITE_API_URL is not set. Configure it in the deployment environment — the app cannot reach the backend API without it.'
  );
}

const API_BASE_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:4000' : '');

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: Record<string, unknown>;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

async function request<T>(path: string, options: RequestInit = {}): Promise<{ data: T; meta?: Record<string, unknown> }> {
  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) };

  if (options.body) headers['Content-Type'] = 'application/json';
  if (!SAFE_METHODS.has(method)) {
    const csrfToken = getCookie('adp_csrf');
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });

  const body = (await res.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!res.ok || !body || !body.success) {
    throw new ApiError(res.status, body?.message || 'Something went wrong. Please try again.');
  }

  return { data: body.data as T, meta: body.meta };
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
