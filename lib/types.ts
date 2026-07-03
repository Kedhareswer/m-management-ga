export type SeriesKind = 'manga' | 'manhwa' | 'manhua' | 'comic' | 'graphic-novel' | 'webtoon';

export type ReadingStatus = 'reading' | 'paused' | 'completed' | 'plan-to-read';

export interface Series {
  id: string;
  title: string;
  /** The URL the user originally pasted (series home page or a chapter page). */
  sourceUrl: string;
  /** Hostname of the site, e.g. "mangadex.org". */
  site: string;
  /** Pretty site name from og:site_name when available. */
  siteName: string;
  kind: SeriesKind;
  genres: string[];
  author?: string;
  description?: string;
  coverUrl?: string;
  /** Index into the palette used when there is no cover image. */
  coverHue: number;
  status: ReadingStatus;
  currentChapter: number;
  totalChapters?: number;
  /**
   * Chapter URL template with "{chapter}" placeholder, detected when the
   * pasted link contained a chapter number, e.g.
   * "https://site.com/one-piece/chapter-{chapter}".
   * Used by "Continue reading" to jump straight to the current chapter.
   */
  chapterUrlPattern?: string;
  /** Exact URL of the last chapter the user read, if they saved one. */
  lastReadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExtractedMeta {
  title: string;
  site: string;
  siteName: string;
  kind: SeriesKind;
  genres: string[];
  author?: string;
  description?: string;
  coverUrl?: string;
  chapterUrlPattern?: string;
  detectedChapter?: number;
  /** Which engine produced this: the Playwright service or the built-in fallback. */
  extractor: 'playwright' | 'fallback';
}
