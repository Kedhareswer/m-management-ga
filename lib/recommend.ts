import type { Series } from './types';
import { chatComplete, type AIConfig } from './ai';
import { webSearch, webFetchHead, type WebResult } from './websearch';

/**
 * The recommendation pipeline. Raw web-search results are listicles and
 * reddit threads — not something to show a reader. This turns them into
 * actual SERIES cards:
 *
 *   1. search the web for the ask            (TinyFish search)
 *   2. LLM distills results into series      (title/kind/genres/why,
 *      excluding everything already on the shelf, honoring taste + safe mode)
 *   3. resolve each series to a reader link  (TinyFish search again,
 *      preferring real reader domains)
 *   4. pull real cover art from that page    (TinyFish fetch → og:image)
 *
 * The UI renders these like books on the shelf; clicking one opens the
 * reader AND adds the series via the normal add-by-URL extraction flow.
 */

export interface Recommendation {
  title: string;
  reason?: string;
  kind?: string;
  genres?: string[];
  coverUrl?: string;
  /** A page where the user can actually read it — also the add-to-shelf URL. */
  sourceUrl?: string;
  siteName?: string;
}

const MAX_RECS = 3;

/** Domains that are actual readers — preferred targets for the card link. */
const READER_DOMAINS = [
  'mangadex.org', 'webtoons.com', 'mangaplus.shueisha.co.jp', 'asuracomic.net',
  'asurascans.com', 'comick.io', 'comick.app', 'bato.to', 'batotoo.com',
  'manganato.com', 'chapmanganato.com', 'mangakakalot.com', 'toonily.com',
  'tapas.io', 'tappytoon.com', 'flamecomics.me', 'reaperscans.com',
  'zeroscans.com', 'manhuaplus.com', 'mangafire.to', 'mangapark.net',
];

/** Domains that are never reading destinations — skipped when resolving. */
const NON_READER_DOMAINS = [
  'reddit.com', 'youtube.com', 'wikipedia.org', 'fandom.com', 'quora.com',
  'facebook.com', 'x.com', 'twitter.com', 'tiktok.com', 'pinterest.com',
  'ranker.com', 'cbr.com', 'screenrant.com', 'goodreads.com', 'amazon.com',
  'myanimelist.net', 'anilist.co', 'anime-planet.com', 'gamerant.com',
  'thegamer.com', 'sportskeeda.com', 'honeysanime.com', 'comicbook.com',
  'collider.com', 'polygon.com', 'kotaku.com', 'fandomspot.com',
  'otaquest.com', 'blogspot.com', 'medium.com', 'wordpress.com', 'tumblr.com',
];

/** Suffix match on real label boundaries: "manhwax.com" must NOT match
 * "x.com", but "www.x.com" and "x.com" must. */
function matchesDomain(host: string, domain: string): boolean {
  return host === domain || host.endsWith('.' + domain);
}

export async function recommendSeries(
  ask: string,
  library: Series[],
  ai: AIConfig,
  opts: { safeMode?: boolean } = {}
): Promise<{ replyText: string; recommendations: Recommendation[] } | null> {
  // 1) gather raw material
  const searchResults = await webSearch(`best ${ask} recommendations to read`, 8);
  if (searchResults.length === 0) return null;

  // 2) distill into series with the LLM
  const distilled = await distill(ask, library, searchResults, ai, opts);
  if (!distilled || distilled.recommendations.length === 0) return null;

  // 3+4) resolve reader links + covers in parallel (best-effort per series)
  const resolved = await Promise.all(
    distilled.recommendations.slice(0, MAX_RECS).map(async (rec) => {
      try {
        return { ...rec, ...(await resolveSeries(rec.title, rec.kind)) };
      } catch {
        return rec; // card still renders with a generated jacket, no link
      }
    })
  );

  return { replyText: distilled.replyText, recommendations: resolved };
}

interface Distilled {
  replyText: string;
  recommendations: Recommendation[];
}

async function distill(
  ask: string,
  library: Series[],
  searchResults: WebResult[],
  ai: AIConfig,
  opts: { safeMode?: boolean }
): Promise<Distilled | null> {
  const shelfBlock =
    library.length > 0
      ? library
          .map((s) => `- "${s.title}" (${s.kind}; ${s.genres.join(', ') || 'no genres'}; ${s.status}${s.favorite ? '; FAVORITE' : ''})`)
          .join('\n')
      : '(the shelf is empty)';

  const resultsBlock = searchResults
    .map((r, i) => `${i + 1}. ${r.title}${r.snippet ? ` — ${r.snippet}` : ''}`)
    .join('\n');

  const system = `You are Mango 🍊, a manga/manhwa/comic recommendation expert. The user asked for: "${ask}".

Below are web search results (mostly listicles and forum threads) and the user's current shelf. Extract up to ${MAX_RECS} SPECIFIC SERIES worth recommending.

Hard rules:
- Recommend actual series titles, never article/listicle/video titles.
- NEVER recommend anything already on the shelf (check the list carefully, including slight title variations).
- Match the user's ask first, then their taste (favorites and genres on the shelf are the signal).
- Only include series you are reasonably confident actually exist; the search results are evidence.
${opts.safeMode ? '- Family-safe picks only: no adult/18+/ecchi/smut series.\n' : ''}- "reason" is one short, concrete sentence (what makes it good, not marketing fluff).
- "kind" is one of: manga, manhwa, manhua, comic, webtoon.

Respond with ONLY this JSON, no markdown fences:
{"reply": "<1-2 warm sentences introducing the picks>", "recommendations": [{"title": "...", "kind": "...", "genres": ["..."], "reason": "..."}]}`;

  const completion = await chatComplete(
    ai,
    [
      { role: 'system', content: system },
      { role: 'user', content: `SEARCH RESULTS:\n${resultsBlock}\n\nUSER'S SHELF:\n${shelfBlock}` },
    ],
    { maxTokens: 600, temperature: 0.4 }
  );

  const parsed = parseJson(completion.content);
  if (!parsed || !Array.isArray(parsed.recommendations)) return null;

  const shelfTitles = new Set(library.map((s) => s.title.toLowerCase().trim()));
  const recommendations: Recommendation[] = [];
  for (const raw of parsed.recommendations as (Record<string, unknown> | null)[]) {
    // A truncated/repaired model response can contain null entries — skip
    // them instead of letting the whole pipeline throw.
    if (!raw || typeof raw !== 'object') continue;
    const title = typeof raw.title === 'string' ? raw.title.trim() : '';
    if (!title || title.length > 120) continue;
    // Belt-and-braces shelf dedupe — the model is told to, but verify anyway.
    const t = title.toLowerCase();
    if (shelfTitles.has(t) || [...shelfTitles].some((s) => s.includes(t) || t.includes(s))) continue;
    recommendations.push({
      title,
      reason: typeof raw.reason === 'string' ? raw.reason.slice(0, 200) : undefined,
      kind: typeof raw.kind === 'string' ? raw.kind : undefined,
      genres: Array.isArray(raw.genres)
        ? (raw.genres as unknown[]).filter((g): g is string => typeof g === 'string').slice(0, 4)
        : undefined,
    });
  }

  return {
    replyText:
      typeof parsed.reply === 'string' && parsed.reply.trim()
        ? parsed.reply.trim()
        : `Here's what I'd pull off the shelf for "${ask}":`,
    recommendations,
  };
}

/** Find a page where the series can be read, and its cover art. */
async function resolveSeries(
  title: string,
  kind?: string
): Promise<{ sourceUrl?: string; coverUrl?: string; siteName?: string }> {
  const results = await webSearch(`read "${title}" ${kind || 'manga'} online`, 6);

  // Precision over recall: a result is only eligible if it's on a known
  // reader domain OR its title reads like the series' own page. Otherwise a
  // random SEO listicle would become the card's link — and one click would
  // file the listicle itself onto the shelf.
  const t = title.toLowerCase();
  const looksLikeSeriesPage = (r: WebResult) =>
    r.title.toLowerCase().includes(t) &&
    /\bread\b|\bchapter\b|scan|manga|manhwa|manhua|webtoon|comic/i.test(r.title);

  const scored = results
    .map((r) => ({ r, host: hostOf(r.url) }))
    .filter(({ host }) => host && !NON_READER_DOMAINS.some((d) => matchesDomain(host!, d)))
    .map((x) => ({ ...x, score: (score(x.host!) ? 2 : 0) + (looksLikeSeriesPage(x.r) ? 1 : 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const pick = scored[0]?.r;
  if (!pick) return {};

  const out: { sourceUrl: string; coverUrl?: string; siteName?: string } = {
    sourceUrl: pick.url,
    siteName: prettyHost(hostOf(pick.url) || ''),
  };

  // Cover art from the reader page's head (og:image), image links as fallback.
  try {
    const head = await webFetchHead(pick.url);
    out.coverUrl = head?.ogImage || head?.imageLinks[0];
  } catch {
    // no cover — the UI's generated jacket takes over
  }
  return out;
}

function score(host: string): number {
  return READER_DOMAINS.some((d) => matchesDomain(host, d)) ? 1 : 0;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function prettyHost(host: string): string {
  const core = host.split('.')[0];
  return core ? core.charAt(0).toUpperCase() + core.slice(1) : host;
}

function parseJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}
