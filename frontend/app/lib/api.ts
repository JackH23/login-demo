function normalizeBaseUrl(value: string) {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return withoutTrailingSlash.replace(/\/api$/i, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return normalizeBaseUrl(envBase);

  // In development, talk to the locally running Express backend.
  if (process.env.NODE_ENV === "development") {
    return normalizeBaseUrl("http://localhost:8000"); // <- change to your backend port
  }

  // In production, rely on the same-origin Next.js server and let rewrites
  // forward /api requests to the backend.
  return "";
}

export const API_BASE_URL = resolveBaseUrl();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return apiUrl(path);
}

export function resolveImageUrl(value?: string | null) {
  if (!value) return null;

  if (/^(data:|https?:|blob:)/i.test(value)) return value;

  return apiUrl(value.startsWith("/") ? value : `/${value}`);
}
