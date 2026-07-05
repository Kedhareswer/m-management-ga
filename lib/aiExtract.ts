import { chatComplete, type AIConfig } from './ai';
import type { SeriesKind } from './types';

/**
 * LLM-based metadata extraction. Instead of brittle DOM heuristics, hand the
 * page's visible text to the model and let it read out the details — the same
 * approach that made genres reliable in the earlier build. Only runs when a
 * Requesty key is present this request; otherwise the heuristic extractor is
 * used. Returns null on any failure so the caller falls back cleanly.
 */

export interface AIExtracted {
  title?: string;
  author?: string;
  genres?: string[];
  description?: string;
  kind?: SeriesKind;
  siteName?: string;
  /** Adult content flag, used by the shelf's safe-mode filter. */
  nsfw?: boolean;
}

const KINDS: SeriesKind[] = ['manga', 'manhwa', 'manhua', 'comic', 'graphic-novel', 'webtoon'];

/**
 * Reduce raw HTML to something small and text-heavy: drop scripts/styles,
 * strip tags, collapse whitespace. Keeps the model prompt cheap and focused.
 */
export function htmlToText(html: string, limit = 6000): string {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#\d+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, limit);
}

export async function aiExtract(
  ai: AIConfig,
  pageText: string,
  url: string
): Promise<AIExtracted | null> {
  if (!pageText.trim()) return null;
  try {
    const completion = await chatComplete(
      ai,
      [
        {
          role: 'system',
          content:
            'You extract structured metadata about a single manga / manhwa / manhua / comic / ' +
            'graphic novel from the text of its web page. Respond with ONLY a JSON object, no ' +
            'markdown fences, with these keys:\n' +
            '{"title": string, "author": string|null, "genres": string[], "description": string|null, ' +
            `"kind": one of ${JSON.stringify(KINDS)}, "siteName": string|null, "nsfw": boolean}\n` +
            'Rules: title is the SERIES title (never a chapter heading or the site name). genres are ' +
            'real content genres only (Action, Romance, Fantasy, Horror…), 1–6 of them, never site nav ' +
            'labels like "Home", "Latest", "Bookmark". nsfw=true if it is adult/18+/hentai/smut/ecchi. ' +
            'Use null when a field is genuinely not present. Keep description under 350 chars.',
        },
        {
          role: 'user',
          content: `URL: ${url}\n\nPAGE TEXT:\n${pageText}`,
        },
      ],
      { maxTokens: 500, temperature: 0.1 }
    );

    const parsed = parseJson(completion.content);
    if (!parsed) return null;

    const genres = Array.isArray(parsed.genres)
      ? parsed.genres
          .filter((g: unknown): g is string => typeof g === 'string')
          .map((g: string) => g.trim())
          .filter((g: string) => g && g.length <= 24 && !/^(home|latest|all|genre|bookmark|login)$/i.test(g))
          .slice(0, 6)
      : undefined;

    return {
      title: str(parsed.title),
      author: str(parsed.author),
      genres,
      description: str(parsed.description)?.slice(0, 350),
      kind: KINDS.includes(parsed.kind as SeriesKind) ? (parsed.kind as SeriesKind) : undefined,
      siteName: str(parsed.siteName),
      nsfw: parsed.nsfw === true,
    };
  } catch {
    return null;
  }
}

function str(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t && t.toLowerCase() !== 'null' ? t : undefined;
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
