import { TinyFish, FetchFormat } from '@tiny-fish/sdk';
import axios from 'axios';

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
  /** Page content as markdown / text. */
  text?: string;
}

export interface PageHead {
  title?: string;
  /** og:image / twitter:image — for reader pages this is usually the cover. */
  ogImage?: string;
  /** First content images on the page, as a fallback cover source. */
  imageLinks: string[];
}

const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY?.trim() || '';
const TINYFISH_BASE_URL = process.env.TINYFISH_BASE_URL?.trim() || undefined;

/**
 * Web search is enabled out of the box (with fallback web search engine support).
 */
export function webSearchEnabled(): boolean {
  return true;
}

const g = globalThis as typeof globalThis & { __tinyfish?: TinyFish };

function getClient(): TinyFish | null {
  if (!TINYFISH_API_KEY) return null;
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
  const client = getClient();
  if (client) {
    try {
      const response = await client.search.query({
        query,
        location: 'US',
        language: 'en',
      });
      if (response.results && response.results.length > 0) {
        return response.results.slice(0, limit).map((r) => ({
          title: r.title,
          url: r.url,
          snippet: r.snippet?.slice(0, 240) || undefined,
        }));
      }
    } catch (err) {
      console.warn(`[websearch] TinyFish search failed, using fallback engine: ${err instanceof Error ? err.message : err}`);
    }
  }

  return fallbackWebSearch(query, limit);
}

/** Fallback web search using DuckDuckGo HTML parser via axios */
async function fallbackWebSearch(query: string, limit = 5): Promise<WebResult[]> {
  try {
    const res = await axios.get('https://html.duckduckgo.com/html/', {
      params: { q: query },
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10_000,
    });

    const html = String(res.data);
    const results: WebResult[] = [];

    const blockRe =
      /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?(?:<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/div>)?/gi;

    let match: RegExpExecArray | null;
    while ((match = blockRe.exec(html)) !== null && results.length < limit) {
      let rawUrl = match[1];
      const rawTitle = match[2];
      const rawSnippet = match[3] || match[4] || '';

      if (rawUrl.includes('uddg=')) {
        try {
          const parsedUrl = new URL('https://duckduckgo.com' + rawUrl);
          const target = parsedUrl.searchParams.get('uddg');
          if (target) rawUrl = target;
        } catch {}
      } else if (rawUrl.startsWith('//')) {
        rawUrl = 'https:' + rawUrl;
      }

      const title = cleanHtmlText(rawTitle);
      const snippet = cleanHtmlText(rawSnippet);

      if (title && /^https?:\/\//i.test(rawUrl)) {
        results.push({ title, url: rawUrl, snippet: snippet || undefined });
      }
    }

    return results;
  } catch (err) {
    console.warn(`[websearch] Fallback DuckDuckGo search error: ${err instanceof Error ? err.message : err}`);
    return [];
  }
}

/** Fetch one page's content as text/markdown. */
export async function webFetchContent(url: string): Promise<FetchedPage | null> {
  const client = getClient();
  if (client) {
    try {
      const response = await client.fetch.getContents({
        urls: [url],
        format: FetchFormat.Markdown,
      });
      const page = response.results[0];
      if (page) {
        const text = 'text' in page && typeof page.text === 'string' ? page.text : undefined;
        return {
          url,
          title: page.title ?? undefined,
          description: page.description ?? undefined,
          author: page.author ?? undefined,
          text,
        };
      }
    } catch (err) {
      console.warn(`[websearch] TinyFish fetchContent failed, using fallback: ${err instanceof Error ? err.message : err}`);
    }
  }

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      timeout: 12_000,
    });
    const html = String(res.data);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const descMatch =
      html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["']/i)?.[1];
    const authorMatch =
      html.match(/<meta[^>]+name=["']author["'][^>]*content=["']([^"']+)["']/i)?.[1];

    const cleanText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      url,
      title: titleMatch ? decodeEntities(titleMatch) : undefined,
      description: descMatch ? decodeEntities(descMatch) : undefined,
      author: authorMatch ? decodeEntities(authorMatch) : undefined,
      text: cleanText.slice(0, 6000),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch head/meta information from a reader page to pull cover art.
 */
export async function webFetchHead(url: string): Promise<PageHead | null> {
  const client = getClient();
  if (client) {
    try {
      const response = await client.fetch.getContents({
        urls: [url],
        format: FetchFormat.Html,
        include_html_head: true,
        image_links: true,
      });
      const page = response.results[0];
      if (page) {
        const html = 'text' in page && typeof page.text === 'string' ? page.text : '';
        const meta = (name: string): string | undefined => {
          const re = new RegExp(
            `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
            'i'
          );
          const m = html.match(re);
          return m ? m[1] || m[2] : undefined;
        };
        const ogImage = meta('og:image') || meta('twitter:image');
        return {
          title: page.title ?? undefined,
          ogImage: ogImage ? absolutize(ogImage, url) : undefined,
          imageLinks: (page.image_links ?? []).filter((u) => /^https?:\/\//i.test(u)).slice(0, 5),
        };
      }
    } catch (err) {
      console.warn(`[websearch] TinyFish fetchHead failed, using fallback: ${err instanceof Error ? err.message : err}`);
    }
  }

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
      },
      timeout: 10_000,
    });
    const html = String(res.data);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
    const ogImage =
      html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1] ||
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]*content=["']([^"']+)["']/i)?.[1];

    const imgLinks: string[] = [];
    const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
    let m: RegExpExecArray | null;
    while ((m = imgRe.exec(html)) !== null && imgLinks.length < 5) {
      if (/^https?:\/\//i.test(m[1])) imgLinks.push(absolutize(m[1], url) || m[1]);
    }

    return {
      title: titleMatch ? decodeEntities(titleMatch) : undefined,
      ogImage: ogImage ? absolutize(ogImage, url) : undefined,
      imageLinks: imgLinks,
    };
  } catch {
    return null;
  }
}

function cleanHtmlText(s: string): string {
  return decodeEntities(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function absolutize(src: string, base: string): string | undefined {
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
}

