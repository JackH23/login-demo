function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (envBase) return normalizeUrl(envBase);

  // In development, talk to the locally running Express backend.
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3001"; // <- change to your backend port
  }

  // In production, rely on the same-origin Next.js server and let rewrites
  // forward /api requests to the backend.
  return "";
}

export const API_BASE_URL = resolveBaseUrl();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return apiUrl(path);
}
