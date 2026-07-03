/**
 * Detect a chapter number inside a URL and derive a reusable template.
 *
 * Handles the common shapes used by manga/comic readers:
 *   /one-piece/chapter-1088          -> .../chapter-{chapter}
 *   /one-piece-chapter-1088.html     -> ...-chapter-{chapter}.html
 *   /read/one-piece/ch/1088          -> .../ch/{chapter}
 *   /viewer/episode-143              -> .../episode-{chapter}
 *   ?episode_no=143                  -> ?episode_no={chapter}
 */

const PATH_PATTERNS: RegExp[] = [
  /(chapter[-_/])(\d+(?:[.-]\d+)?)/i,
  /(chap[-_/])(\d+(?:[.-]\d+)?)/i,
  /(episode[-_/])(\d+)/i,
  /(\bch[-_/.])(\d+(?:[.-]\d+)?)/i,
  /(\/c)(\d{2,4})(?=\/|$)/i,
];

const QUERY_KEYS = ['chapter', 'chap', 'episode_no', 'episode', 'ch'];

export interface ChapterDetection {
  pattern: string;
  chapter: number;
}

export function detectChapterPattern(url: string): ChapterDetection | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  for (const key of QUERY_KEYS) {
    const val = parsed.searchParams.get(key);
    if (val && /^\d+(?:\.\d+)?$/.test(val)) {
      const chapter = parseFloat(val);
      parsed.searchParams.set(key, '{chapter}');
      // URLSearchParams encodes braces; restore them for a readable template.
      const pattern = parsed.toString().replace(/%7Bchapter%7D/gi, '{chapter}');
      return { pattern, chapter };
    }
  }

  const pathAndHash = parsed.pathname + parsed.search + parsed.hash;
  for (const re of PATH_PATTERNS) {
    const m = pathAndHash.match(re);
    if (m) {
      const chapter = parseFloat(m[2].replace('-', '.'));
      const replaced = pathAndHash.replace(re, `$1{chapter}`);
      return { pattern: parsed.origin + replaced, chapter };
    }
  }

  return null;
}

/** Build the URL for a specific chapter from a stored template. */
export function buildChapterUrl(pattern: string, chapter: number): string {
  const printable = Number.isInteger(chapter) ? String(chapter) : String(chapter);
  return pattern.replaceAll('{chapter}', printable);
}

/** Pick the best URL to open when the user hits "Continue reading". */
export function continueUrl(series: {
  chapterUrlPattern?: string;
  currentChapter: number;
  lastReadUrl?: string;
  sourceUrl: string;
}): string {
  if (series.chapterUrlPattern && series.currentChapter > 0) {
    return buildChapterUrl(series.chapterUrlPattern, series.currentChapter);
  }
  if (series.lastReadUrl) return series.lastReadUrl;
  return series.sourceUrl;
}
