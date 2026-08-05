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

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isFormData = options.body instanceof FormData;

  const res = await fetch(path, {
    ...options,
    credentials: "include",
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {}),
    },
  });

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
