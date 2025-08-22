export const BASE = process.env.PREVIEW_URL || 'http://127.0.0.1:4173';
export const ROUTES = ['/', '/auth', '/history'] as const;

export function isLocal(url: string): boolean {
  try {
    const u = new URL(url, BASE);
    if (u.protocol === 'file:' || u.protocol === 'data:' || u.protocol === 'blob:') return true;
    return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
  } catch {
    return false;
  }
}