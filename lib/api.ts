const baseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || 'http://localhost:3001';

export const API_BASE_URL = `${baseUrl}`;

export function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  return apiUrl(path);
}
