const AUTH_TOKEN_KEY = 'sentinal_auth_token';
const VISITOR_SESSION_KEY = 'sentinal_visitor_session_id';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function getVisitorSessionId(): string {
  try {
    let existing = localStorage.getItem(VISITOR_SESSION_KEY);
    if (!existing) {
      existing = `vis_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
      localStorage.setItem(VISITOR_SESSION_KEY, existing);
    }
    return existing;
  } catch {
    return 'vis_ephemeral';
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      (data && (data.error || data.reason || data.message)) ||
        `Request failed with status ${response.status}`
    ) as Error & { status?: number; payload?: unknown };
    err.status = response.status;
    err.payload = data;
    throw err;
  }
  return data as T;
}
