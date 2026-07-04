/**
 * Client-side fetch that never throws on a non-JSON body. A failed API call
 * (empty 500, HTML error page, network drop) yields a readable error string
 * instead of "Unexpected end of JSON input".
 */
export interface JsonResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  headers?: Headers;
}

export async function fetchJson<T = unknown>(
  input: string,
  init?: RequestInit
): Promise<JsonResult<T>> {
  try {
    const res = await fetch(input, init);
    let data: T | null = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text) as T;
      } catch {
        // non-JSON body (proxy error page etc.) — keep data null
      }
    }
    const error = res.ok
      ? undefined
      : ((data as { error?: string } | null)?.error ||
        `Server responded ${res.status}${res.statusText ? ` (${res.statusText})` : ''}`);
    return { ok: res.ok, status: res.status, data, error, headers: res.headers };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}
