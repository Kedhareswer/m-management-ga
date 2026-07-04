import { chromium, type Browser } from 'playwright';
import type { ExtractedMeta } from './types';

/**
 * Playwright runs inside the Next.js server itself — no separate service.
 * One headless Chromium is shared across requests (stored on globalThis so
 * dev-mode hot reloads don't leak browsers).
 */

const NAV_TIMEOUT = 25_000;

const KNOWN_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Dark Fantasy', 'Horror',
  'Isekai', 'Josei', 'Martial Arts', 'Mecha', 'Mystery', 'Psychological',
  'Romance', 'School Life', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen',
  'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Tragedy', 'Superhero',
  'Mythology', 'Historical', 'Crime', 'Webtoon',
];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const g = globalThis as typeof globalThis & { __mangaBrowser?: Promise<Browser> };

async function getBrowser(): Promise<Browser> {
  if (!g.__mangaBrowser) {
    g.__mangaBrowser = chromium
      .launch({
        headless: true,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
        ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
      })
      .catch((err) => {
        // Failed launches must not poison the cache — allow retry / fallback.
        g.__mangaBrowser = undefined;
        throw err;
      });
  }
  return g.__mangaBrowser;
}

/** Render the page in headless Chromium and pull series metadata from it. */
export async function browserExtract(url: string): Promise<Partial<ExtractedMeta>> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  // Skip heavy assets — we only need the DOM (images still load for cover detection).
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'media' || type === 'font') return route.abort();
    return route.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForTimeout(1500); // let client-rendered readers hydrate

    const data = await page.evaluate((genreList: string[]) => {
      const meta = (sel: string) =>
        document.querySelector<HTMLMetaElement>(`meta[property="${sel}"], meta[name="${sel}"]`)
          ?.content || undefined;

      const genres = new Set<string>();
      const addGenre = (raw: string | null | undefined) => {
        const t = (raw || '').trim().toLowerCase();
        const hit = genreList.find((g) => g.toLowerCase() === t);
        if (hit) genres.add(hit);
      };
      // Site chrome (nav menus, footers) often lists EVERY genre — skip it.
      const inChrome = (el: Element) => el.closest('nav, header, footer') !== null;

      // 1) genre/tag links — the pattern classic readers use
      document
        .querySelectorAll(
          'a[href*="genre"], a[href*="genres"], a[href*="category"], a[href*="/tag"], .genres a, .genre a, [class*="genre"] a'
        )
        .forEach((a) => {
          if (!inChrome(a)) addGenre(a.textContent);
        });
      // 2) modern readers (Asura & co) render genres as plain chips —
      //    spans/buttons/list items inside genre/tag-ish containers
      document
        .querySelectorAll('[class*="genre"] *, [class*="tag"] *, [class*="Genre"] *')
        .forEach((el) => {
          if (!inChrome(el) && (el.textContent || '').trim().length <= 25) addGenre(el.textContent);
        });
      (meta('keywords') || '').split(/[,;]/).forEach(addGenre);
      // 3) last resort: any short-text element in the page body that exactly
      //    matches a known genre name
      if (genres.size === 0) {
        document.querySelectorAll('a, span, button, li').forEach((el) => {
          if (inChrome(el)) return;
          const t = (el.textContent || '').trim();
          if (t.length >= 3 && t.length <= 25 && el.children.length === 0) addGenre(t);
        });
      }

      // JSON-LD sometimes carries genre + author + image
      let ldGenre: unknown, ldAuthor: string | undefined, ldImage: string | undefined;
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const ld = JSON.parse(script.textContent || '');
          const nodes = Array.isArray(ld) ? ld : [ld];
          for (const node of nodes) {
            if (node.genre) ldGenre = node.genre;
            if (node.author) ldAuthor = typeof node.author === 'string' ? node.author : node.author?.name;
            if (node.image && !ldImage) ldImage = typeof node.image === 'string' ? node.image : node.image?.url;
          }
        } catch {}
      }
      if (ldGenre) (Array.isArray(ldGenre) ? ldGenre : [ldGenre]).forEach((v) => addGenre(String(v)));

      let authorLabel = [...document.querySelectorAll('a[href*="author"], .author, [class*="author"]')]
        .map((el) => el.textContent?.trim())
        .find((t) => t && t.length > 2 && t.length < 60);
      // "Author" / "Artist" label followed by the name (Asura-style info grids)
      if (!authorLabel) {
        const label = [...document.querySelectorAll('span, div, dt, b, strong, h3, h4, h5')].find(
          (el) => /^(author|artist)s?:?\s*$/i.test((el.textContent || '').trim()) && el.children.length === 0
        );
        const candidate =
          label?.nextElementSibling?.textContent?.trim() ||
          label?.parentElement?.textContent?.replace(/^(author|artist)s?:?\s*/i, '').trim();
        if (candidate && candidate.length > 1 && candidate.length < 60 && !/^(author|artist)/i.test(candidate)) {
          authorLabel = candidate;
        }
      }

      // Cover: og/twitter image → JSON-LD image → the biggest cover-shaped
      // <img> on the page (portrait, reasonably large).
      let coverUrl = meta('og:image') || meta('twitter:image') || ldImage;
      if (!coverUrl) {
        const candidates = [
          ...document.querySelectorAll<HTMLImageElement>(
            '.cover img, .thumb img, .thumbnail img, [class*="cover"] img, [class*="poster"] img, img[src*="cover"], img[src*="thumb"], article img, main img, img'
          ),
        ];
        let best: string | null = null;
        let bestScore = 0;
        for (const img of candidates) {
          const src = img.currentSrc || img.src;
          if (!src || src.startsWith('data:')) continue;
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (w < 100 || h < 140) continue; // too small to be a cover
          const portrait = h > w ? 2 : 1;   // covers are portrait
          const score = w * h * portrait;
          if (score > bestScore) {
            bestScore = score;
            best = src;
          }
        }
        coverUrl = best || undefined;
      }

      return {
        title: meta('og:title') || meta('twitter:title') || document.title || undefined,
        siteName: meta('og:site_name'),
        description: meta('og:description') || meta('description'),
        coverUrl,
        genres: [...genres],
        author: ldAuthor || authorLabel?.replace(/^author[:\s]*/i, ''),
      };
    }, KNOWN_GENRES);

    if (data.coverUrl) {
      try {
        data.coverUrl = new URL(data.coverUrl, page.url()).toString();
      } catch {}
    }
    return data;
  } finally {
    await context.close();
  }
}

/**
 * Fetch an image through the browser's network stack — carries a real
 * browser TLS/header fingerprint plus the Referer, which gets past the
 * hot-link protection most manga CDNs use.
 */
export async function browserFetchImage(
  url: string,
  ref?: string
): Promise<{ body: Buffer; type: string }> {
  const browser = await getBrowser();
  const context = await browser.newContext({ userAgent: UA });
  try {
    const resp = await context.request.get(url, {
      headers: {
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8',
        ...(ref ? { referer: ref } : {}),
      },
      timeout: 20_000,
      maxRedirects: 5,
    });
    if (!resp.ok()) throw new Error(`upstream ${resp.status()}`);
    const type = resp.headers()['content-type'] || 'image/jpeg';
    if (!type.startsWith('image/')) throw new Error(`not an image: ${type}`);
    return { body: await resp.body(), type };
  } finally {
    await context.close();
  }
}
