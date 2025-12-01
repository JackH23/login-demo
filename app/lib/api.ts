function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeUrl(envBase);

  // No guessing. Default for backend in dev mode:
  return "http://localhost:3001"; // <- change to your backend port
}

export const API_BASE_URL = resolveBaseUrl();

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return apiUrl(path);
}
