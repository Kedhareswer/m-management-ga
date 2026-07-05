import { TinyFish, FetchFormat } from '@tiny-fish/sdk';

/**
 * TinyFish integration via the official @tiny-fish/sdk:
 *  - search.query()      → web recommendations beyond the user's shelf
 *  - fetch.getContents() → clean page content, used as a rescue when a
 *    reader site blocks our own extractor (TinyFish fetches from THEIR
 *    infrastructure, so a block against our IP doesn't apply)
 *
 * The API key is a SERVER secret (unlike the per-session Requesty key):
 * set TINYFISH_API_KEY in .env.local / host env, never in the client.
 * Features are simply absent when the key isn't set.
 */

export interface WebResult {
  title: string;
  url: string;
  snippet?: string;
}

export interface FetchedPage {
  url: string;
  title?: string;
  description?: string;
  author?: string;
  /** Page content as markdown. */
  text?: string;
}

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY?.trim() || '';
// SDK default is https://agent.tinyfish.ai — override only for local mocks.
const TINYFISH_BASE_URL = process.env.TINYFISH_BASE_URL?.trim() || undefined;

export function webSearchEnabled(): boolean {
  return TINYFISH_API_KEY.length > 0;
}

const g = globalThis as typeof globalThis & { __tinyfish?: TinyFish };

function getClient(): TinyFish {
  if (!TINYFISH_API_KEY) throw new Error('TINYFISH_API_KEY is not set');
  if (!g.__tinyfish) {
    g.__tinyfish = new TinyFish({
      apiKey: TINYFISH_API_KEY,
      baseURL: TINYFISH_BASE_URL,
      timeout: 20_000,
    });
  }
  return g.__tinyfish;
}

export async function webSearch(query: string, limit = 5): Promise<WebResult[]> {
  if (!webSearchEnabled()) return [];
  const response = await getClient().search.query({
    query,
    location: 'US',
    language: 'en',
  });
  return response.results.slice(0, limit).map((r) => ({
    title: r.title,
    url: r.url,
    snippet: r.snippet?.slice(0, 240) || undefined,
  }));
}

/** Fetch one page's content as markdown through TinyFish's infrastructure. */
export async function webFetchContent(url: string): Promise<FetchedPage | null> {
  if (!webSearchEnabled()) return null;
  const response = await getClient().fetch.getContents({
    urls: [url],
    format: FetchFormat.Markdown,
  });
  const page = response.results[0];
  if (!page) return null;
  // We always request markdown; text is an object only in the json variant.
  const text = 'text' in page && typeof page.text === 'string' ? page.text : undefined;
  return {
    url,
    title: page.title ?? undefined,
    description: page.description ?? undefined,
    author: page.author ?? undefined,
    text,
  };
}

export interface PageHead {
  title?: string;
  /** og:image / twitter:image — for reader pages this is usually the cover. */
  ogImage?: string;
  /** First content images on the page, as a fallback cover source. */
  imageLinks: string[];
}

/**
 * Fetch just enough of a page (via TinyFish, their infrastructure) to pull
 * cover art: the <head> meta tags plus the page's image links.
 */
export async function webFetchHead(url: string): Promise<PageHead | null> {
  if (!webSearchEnabled()) return null;
  const response = await getClient().fetch.getContents({
    urls: [url],
    format: FetchFormat.Html,
    include_html_head: true,
    image_links: true,
  });
  const page = response.results[0];
  if (!page) return null;
  const html = 'text' in page && typeof page.text === 'string' ? page.text : '';
  const meta = (name: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i'
    );
    const m = html.match(re);
    return m ? (m[1] || m[2]) : undefined;
  };
  const ogImage = meta('og:image') || meta('twitter:image');
  return {
    title: page.title ?? undefined,
    ogImage: ogImage ? absolutize(ogImage, url) : undefined,
    imageLinks: (page.image_links ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 5),
  };
}

function absolutize(src: string, base: string): string | undefined {
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
}
