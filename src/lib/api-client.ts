export class ApiClientError extends Error {
  status: number;
  fields?: Record<string, string[]>;

  constructor(status: number, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  data?: T;
  error?: { message: string; fields?: Record<string, string[]> };
}

// The access-token cookie is short-lived (15m, see src/lib/cookies.ts) by
// design; this is what silently renews it so a 401 mid-session doesn't bounce
// the user to /login. Concurrent 401s share one in-flight refresh call rather
// than each firing their own.
let refreshPromise: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST", credentials: "include" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const redirect = encodeURIComponent(window.location.pathname + window.location.search);
  window.location.href = `/login?redirect=${redirect}`;
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });

  // Don't try to refresh a failed login/refresh/logout call itself - only a
  // genuinely expired access token on an already-authenticated request.
  if (res.status === 401 && !isRetry && !path.startsWith("/api/auth/")) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return request<T>(path, options, true);
    }
    redirectToLogin();
    throw new ApiClientError(401, "Session expired, please log in again");
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    if (!res.ok) throw new ApiClientError(res.status, "Request failed");
    return (await res.blob()) as unknown as T;
  }

  const json = (await res.json()) as ApiEnvelope<T>;

  if (!res.ok || !json.success) {
    throw new ApiClientError(res.status, json.error?.message ?? "Request failed", json.error?.fields);
  }

  return json.data as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body ?? {}),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body ?? {}) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export function downloadFile(path: string, filename: string) {
  const link = document.createElement("a");
  link.href = path;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
