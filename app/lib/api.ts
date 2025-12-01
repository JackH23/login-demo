function normalizeUrl(value: string) {
  return value.replace(/\/$/, "");
}

function resolveBaseUrl() {
  const envBase = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBase) return normalizeUrl(envBase);

  // When deployed on platforms like Vercel, prefer the public host URL
  const vercelHost = process.env.NEXT_PUBLIC_VERCEL_URL || process.env.VERCEL_URL;
  if (vercelHost) return normalizeUrl(`https://${vercelHost}`);

  // In the browser, fallback to the current origin so fetch requests stay same-host
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeUrl(window.location.origin);
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
