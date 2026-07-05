import type { ExtractedMeta, SeriesKind } from './types';
import { detectChapterPattern } from './chapterUrl';
import { browserExtract } from './playwright';
import { detectBlock } from './botcheck';
import { aiExtract, htmlToText } from './aiExtract';
import { politeGate } from './ratelimit';
import { getFetch } from './proxy';
import type { AIConfig } from './ai';

const KNOWN_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Dark Fantasy', 'Horror',
  'Isekai', 'Josei', 'Martial Arts', 'Mecha', 'Mystery', 'Psychological',
  'Romance', 'School Life', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen',
  'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Tragedy', 'Superhero',
  'Mythology', 'Historical', 'Crime',
];

/**
 * Render the page with the in-app headless Chromium first (handles JS-heavy
 * readers), fall back to a plain fetch + meta-tag parse when the browser
 * can't launch or the page won't load.
 *
 * When an AI config is provided, the LLM reads the page text and extracts
 * genres/author/kind/nsfw — far more reliable than DOM heuristics across the
 * dozens of bespoke reader layouts. Heuristics remain the no-key fallback.
 */
export async function extractMeta(url: string, ai?: AIConfig): Promise<ExtractedMeta> {
  await politeGate(url); // don't hammer the source site
  if (process.env.DISABLE_PLAYWRIGHT !== '1') {
    try {
      const data = await browserExtract(url);
      // A real browser hit a hard block — the plain-fetch fallback won't do
      // better, so report it honestly rather than masking with worse data.
      if (data.status === 'blocked') {
        return normalize(url, data);
      }
      const enriched = ai && data.html ? await enrichWithAI(data, data.html, url, ai) : data;
      return normalize(url, { ...enriched, extractor: 'playwright' });
    } catch (err) {
      console.warn(
        `[extract] browser extraction failed (${err instanceof Error ? err.message : err}), using fallback`
      );
    }
  }
  return fallbackExtract(url, ai);
}

/** Merge LLM-read metadata over heuristic data — the LLM wins for the fields
 * it's good at (genres/author/kind/nsfw/description), heuristics keep cover. */
async function enrichWithAI(
  base: Partial<ExtractedMeta>,
  html: string,
  url: string,
  ai: AIConfig
): Promise<Partial<ExtractedMeta>> {
  const ai_ = await aiExtract(ai, htmlToText(html), url);
  if (!ai_) return base;
  return {
    ...base,
    title: ai_.title || base.title,
    author: ai_.author || base.author,
    genres: ai_.genres && ai_.genres.length > 0 ? ai_.genres : base.genres,
    description: ai_.description || base.description,
    kind: ai_.kind || base.kind,
    siteName: base.siteName || ai_.siteName,
    nsfw: ai_.nsfw ?? base.nsfw,
  };
}

async function fallbackExtract(url: string, ai?: AIConfig): Promise<ExtractedMeta> {
  let html = '';
  let httpStatus: number | undefined;
  let reachable = false;
  try {
    const doFetch = await getFetch();
    const res = await doFetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml',
        'accept-language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(15_000),
      redirect: 'follow',
    });
    httpStatus = res.status;
    html = await res.text();
    reachable = true;
  } catch {
    // Site unreachable: still return something useful from the URL itself.
  }

  if (!reachable) {
    return normalize(url, { extractor: 'fallback', status: 'unreachable' });
  }

  const titleForBlock = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const block = detectBlock(html, { status: httpStatus, title: titleForBlock });
  if (block.blocked) {
    return normalize(url, { extractor: 'fallback', status: 'blocked', blockReason: block.reason });
  }

  const meta = (name: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`,
      'i'
    );
    const m = html.match(re);
    return m ? decodeEntities(m[1] || m[2]) : undefined;
  };

  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1];
  const rawTitle = meta('og:title') || meta('twitter:title') || titleTag || titleFromUrl(url);
  const imageSrcLink = html.match(
    /<link[^>]+rel=["']image_src["'][^>]*href=["']([^"']+)["']/i
  )?.[1];

  const base: Partial<ExtractedMeta> = {
    title: cleanTitle(rawTitle),
    siteName: meta('og:site_name'),
    description: meta('og:description') || meta('description'),
    coverUrl: absolutize(meta('og:image') || meta('twitter:image') || imageSrcLink, url),
    genres: sniffGenres(html),
    author: meta('author') || meta('article:author'),
    extractor: 'fallback',
  };
  const enriched = ai ? await enrichWithAI(base, html, url, ai) : base;
  return normalize(url, enriched);
}

function normalize(url: string, partial: Partial<ExtractedMeta>): ExtractedMeta {
  const host = safeHost(url);
  const detection = detectChapterPattern(url);
  const genres = dedupe(partial.genres || []).slice(0, 6);

  // Status: honor a hard verdict (blocked/unreachable); otherwise judge by how
  // much real metadata we recovered. A URL-derived title alone isn't "ok".
  let status: ExtractedMeta['status'];
  if (partial.status === 'blocked' || partial.status === 'unreachable') {
    status = partial.status;
  } else {
    const gotRealTitle = Boolean(partial.title);
    const richFields = [genres.length > 0, Boolean(partial.author), Boolean(partial.coverUrl)].filter(
      Boolean
    ).length;
    status = gotRealTitle && richFields >= 2 ? 'ok' : 'partial';
  }

  const title = cleanTitle(partial.title || titleFromUrl(url));
  // NSFW: trust the LLM flag when present; otherwise a light keyword guess so
  // safe mode still works without an AI key.
  const nsfw = partial.nsfw ?? guessNsfw(`${title} ${genres.join(' ')} ${url}`);

  return {
    title,
    site: host,
    siteName: partial.siteName || prettyHost(host),
    kind: partial.kind || guessKind(url, partial),
    genres,
    author: partial.author,
    description: partial.description?.slice(0, 400),
    coverUrl: partial.coverUrl,
    chapterUrlPattern: partial.chapterUrlPattern || detection?.pattern,
    detectedChapter: partial.detectedChapter ?? detection?.chapter,
    extractor: partial.extractor || 'fallback',
    status,
    blockReason: partial.blockReason,
    nsfw,
  };
}

const NSFW_RE = /\b(hentai|nsfw|18\+|adult|smut|ecchi|yaoi|yuri|doujin(?:shi)?|r-?18|porn|erotic|mature)\b/i;
function guessNsfw(hay: string): boolean {
  return NSFW_RE.test(hay);
}

function sniffGenres(html: string): string[] {
  // Nav menus and footers list every genre a site has — cut them out first.
  const body = html.replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, '');
  const found = new Set<string>();
  // 1) explicit genre links, the pattern classic readers use
  const linkRe = /<a[^>]+href=["'][^"']*(?:genre|genres|category|tag)[^"']*["'][^>]*>([^<]{2,30})<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(body)) && found.size < 8) {
    const g = matchKnownGenre(m[1]);
    if (g) found.add(g);
  }
  // 2) meta keywords
  const kw = body.match(/<meta[^>]+name=["']keywords["'][^>]+content=["']([^"']+)["']/i)?.[1];
  if (kw) {
    for (const part of kw.split(/[,;]/)) {
      const g = matchKnownGenre(part);
      if (g) found.add(g);
    }
  }
  // 3) modern readers render genres as plain chips (spans/buttons/list items)
  if (found.size === 0) {
    const chipRe = /<(?:span|button|li|a)[^>]*>\s*([^<>]{3,25}?)\s*<\/(?:span|button|li|a)>/gi;
    while ((m = chipRe.exec(body)) && found.size < 6) {
      const g = matchKnownGenre(m[1]);
      if (g) found.add(g);
    }
  }
  return [...found];
}

function matchKnownGenre(raw: string): string | undefined {
  const t = decodeEntities(raw).trim().toLowerCase();
  return KNOWN_GENRES.find((g) => g.toLowerCase() === t);
}

function guessKind(url: string, partial: Partial<ExtractedMeta>): SeriesKind {
  const hay = `${url} ${partial.title || ''} ${partial.description || ''}`.toLowerCase();
  if (/webtoon|manhwa|toomics|tapas/.test(hay)) return 'manhwa';
  if (/manhua/.test(hay)) return 'manhua';
  if (/\bcomic|marvel|dc\.com|darkhorse|image-?comics/.test(hay)) return 'comic';
  if (/graphic.?novel/.test(hay)) return 'graphic-novel';
  return 'manga';
}

function titleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname
      .replace(/\/(chapter|chap|episode|ch)[-_/.]?[\d.-]*\/?$/i, '')
      .split('/')
      .filter(Boolean)
      .pop();
    if (!path) return safeHost(url);
    return path
      .replace(/[-_]+/g, ' ')
      .replace(/\.(html?|php|aspx?)$/i, '')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  } catch {
    return url;
  }
}

function cleanTitle(t: string): string {
  return decodeEntities(t)
    // strip "Chapter 12", "- Chapter 12" and reader-site suffixes
    .replace(/\s*[-–|:]?\s*(chapter|chap|episode|ch\.?)\s*[\d.]+.*$/i, '')
    .replace(/\s*[-–|]\s*(read|free|online|manga|manhwa|webtoon)[^-–|]*$/i, '')
    .trim()
    .slice(0, 120) || t.trim().slice(0, 120);
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function prettyHost(host: string): string {
  const core = host.replace(/^www\./, '').split('.')[0];
  return core.charAt(0).toUpperCase() + core.slice(1);
}

function absolutize(src: string | undefined, base: string): string | undefined {
  if (!src) return undefined;
  try {
    return new URL(src, base).toString();
  } catch {
    return undefined;
  }
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

function dedupe(list: string[]): string[] {
  return [...new Set(list.map((g) => g.trim()).filter(Boolean))];
}
