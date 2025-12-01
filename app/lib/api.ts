function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeUrl(envBase);

  // In the browser, prefer the backend during local development instead of the
  // Next.js dev server (which does not expose these API routes).
  if (typeof window !== "undefined" && window.location?.origin) {
    if (!window.location.origin.includes("localhost:3000")) {
      return normalizeUrl(window.location.origin);
    }
  }

  // Local development default
  return "http://localhost:3001";
}

export const API_BASE_URL = resolveBaseUrl();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return apiUrl(path);
}
