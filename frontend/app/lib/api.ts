function normalizeBaseUrl(value: string) {
  const withoutTrailingSlash = value.replace(/\/+$/, "");
  return withoutTrailingSlash.replace(/\/api$/i, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return normalizeBaseUrl(envBase);

  const defaultDevBase = normalizeBaseUrl("http://localhost:8000");

  // In the browser during local development, default to the backend port so
  // client-side requests do not accidentally target the Next.js dev server.
  if (typeof window !== "undefined") {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return defaultDevBase;
    }
    return "";
  }

  // In development server-side code (e.g., during Next.js rendering), fall back
  // to the local backend to preserve behavior when no env override is present.
  if (process.env.NODE_ENV === "development") {
    return defaultDevBase;
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
