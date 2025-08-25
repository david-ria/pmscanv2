export async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  const ct = res.headers.get('content-type') || '';
  if (!res.ok) return null;
  if (!ct.includes('application/json')) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}