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
  /** Starred from the shelf — independent of reading status. */
  favorite: boolean;
  currentChapter: number;
  totalChapters?: number;
  /** When the user started reading (defaults to when it was added). */
  startedAt?: string;
  /** Set automatically when status flips to "completed". */
  completedAt?: string;
  /**
   * How trustworthy the auto-filled metadata is — so tracking never silently
   * depends on a scrape succeeding:
   *  - 'ok'         full details extracted
   *  - 'partial'    some fields extracted, some missing
   *  - 'blocked'    the site fought us off (Cloudflare/CAPTCHA/403) — tracking
   *                 still works from the URL; details need manual entry
   *  - 'unreachable' couldn't load the page at all
   *  - 'manual'     the user edited details themselves
   */
  metaStatus?: 'ok' | 'partial' | 'blocked' | 'unreachable' | 'manual';
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
  /** Outcome of extraction — see Series.metaStatus. */
  status: 'ok' | 'partial' | 'blocked' | 'unreachable';
  /** Human-readable reason when a site blocked us (Cloudflare, CAPTCHA…). */
  blockReason?: string;
}
