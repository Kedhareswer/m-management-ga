/**
 * Web search for recommendations that go beyond your own shelf — e.g.
 * "recommend an isekai manga" when nothing on your shelf matches. Backed by
 * TinyFish (https://tinyfish.ai). The API key is a SERVER secret (unlike the
 * per-session Requesty key): set TINYFISH_API_KEY in .env.local, never in
 * the client. Feature is simply absent when the key isn't set — nothing
 * else in the app depends on it.
 */

export interface WebResult {
  title: string;
  url: string;
  snippet?: string;
}

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY?.trim() || '';
const TINYFISH_BASE_URL = process.env.TINYFISH_BASE_URL?.trim() || 'https://api.search.tinyfish.ai';

export function webSearchEnabled(): boolean {
  return TINYFISH_API_KEY.length > 0;
}

export async function webSearch(query: string, limit = 5): Promise<WebResult[]> {
  if (!TINYFISH_API_KEY) return [];

  const url = `${TINYFISH_BASE_URL}?${new URLSearchParams({ query })}`;
  const res = await fetch(url, {
    headers: { 'X-API-Key': TINYFISH_API_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`TinyFish search ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();
  // Shape-tolerant: normalize whatever array-of-results wrapper is used.
  const rawResults: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.data)
          ? data.data
          : [];

  return rawResults
    .map(normalize)
    .filter((r): r is WebResult => r !== null)
    .slice(0, limit);
}

function normalize(item: unknown): WebResult | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  const title = pickString(o, ['title', 'name', 'headline']);
  const url = pickString(o, ['url', 'link', 'href']);
  if (!title || !url) return null;
  return { title, url, snippet: pickString(o, ['snippet', 'description', 'summary', 'content'])?.slice(0, 240) };
}

function pickString(o: Record<string, unknown>, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}
