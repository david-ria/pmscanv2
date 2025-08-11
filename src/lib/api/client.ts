// src/lib/api/client.ts
import { supabase } from '@/integrations/supabase/client';
import { timeAuthority } from '@/lib/time';

// —— config ——
const DEFAULT_TIMEOUT_MS = 12_000;
const DEFAULT_RETRIES = 2;

// Replace Dates with epoch ms; keep numbers as-is.
export function serializeBody(body: unknown): unknown {
  if (body == null || typeof body !== 'object') return body;
  return JSON.parse(JSON.stringify(body, (_k, v) => {
    if (v instanceof Date) return v.getTime();
    return v;
  }));
}

type RetryOpts = { retries?: number; timeoutMs?: number; signal?: AbortSignal };

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
function backoff(attempt: number) {
  // attempt: 0..N → 250ms, 500ms, 1s with jitter
  const base = 250 * Math.pow(2, attempt);
  return base + Math.floor(Math.random() * 120);
}

export async function invokeFunction<T = unknown>(
  name: string,
  body?: unknown,
  opts: RetryOpts = {}
): Promise<T> {
  const retries = opts.retries ?? DEFAULT_RETRIES;
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  // AbortController for timeout
  const controller = new AbortController();
  const to = setTimeout(() => controller.abort('timeout'), timeoutMs);

  // Attach auth (if session exists)
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;

  const payload = serializeBody({
    ...((body as any) || {}),
    // Standardize timestamps you send from the client
    clientSentAt: timeAuthority.now(),
  });

  let lastErr: any;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: payload,
        headers,
      });

      clearTimeout(to);

      if (error) {
        // Map supabase error into a normalized shape
        const mapped = new Error(`EdgeFn ${name} failed: ${error.message}`);
        (mapped as any).code = error.status;
        (mapped as any).ctx = error;
        throw mapped;
      }

      return data as T;
    } catch (e: any) {
      lastErr = e;
      
      // Determine if this error is retriable
      const isAbort = e?.name === 'AbortError' || e?.message === 'timeout';
      const isNetworkError = e?.message?.includes('NetworkError') || 
                             e?.message?.includes('fetch') || 
                             (typeof e?.code === 'string' && ['ETIMEDOUT', 'ECONNRESET', 'ENOTFOUND'].includes(e.code));
      
      // Only retry on server errors (5xx), timeouts, aborts, and network issues
      // Don't retry client errors (4xx) like 400, 401, 403, 404, 422, etc.
      const isServerError = typeof e?.code === 'number' && e.code >= 500 && e.code < 600;
      const retriable = isAbort || isNetworkError || isServerError;

      // Log retry decision for debugging
      if (attempt < retries) {
        console.debug(`API retry decision for ${name}:`, {
          attempt: attempt + 1,
          maxRetries: retries,
          errorCode: e?.code,
          errorMessage: e?.message,
          isAbort,
          isNetworkError,
          isServerError,
          retriable,
          willRetry: retriable
        });
      }

      if (attempt < retries && retriable) {
        const delayMs = backoff(attempt);
        console.debug(`Retrying ${name} in ${delayMs}ms (attempt ${attempt + 1}/${retries})`);
        await delay(delayMs);
        continue;
      }
      
      // Don't retry - either max attempts reached or error is not retriable
      if (!retriable) {
        console.debug(`Not retrying ${name} - client error (${e?.code}): ${e?.message}`);
      }
      
      throw e;
    } finally {
      clearTimeout(to);
    }
  }
  throw lastErr;
}
