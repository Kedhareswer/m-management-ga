import http from 'node:http';
import { chromium } from 'playwright';

const PORT = process.env.PORT || 4000;
const NAV_TIMEOUT = 25_000;

const KNOWN_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Dark Fantasy', 'Horror',
  'Isekai', 'Josei', 'Martial Arts', 'Mecha', 'Mystery', 'Psychological',
  'Romance', 'School Life', 'Sci-Fi', 'Seinen', 'Shoujo', 'Shounen',
  'Slice of Life', 'Sports', 'Supernatural', 'Thriller', 'Tragedy', 'Superhero',
  'Mythology', 'Historical', 'Crime', 'Webtoon',
];

let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    });
  }
  return browserPromise;
}

async function extract(url) {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    viewport: { width: 1280, height: 900 },
  });
  const page = await context.newPage();
  // Skip heavy assets — we only need the DOM.
  await page.route('**/*', (route) => {
    const type = route.request().resourceType();
    if (type === 'media' || type === 'font') return route.abort();
    return route.continue();
  });

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await page.waitForTimeout(1500); // let client-rendered readers hydrate

    const data = await page.evaluate((genreList) => {
      const meta = (sel) =>
        document.querySelector(`meta[property="${sel}"], meta[name="${sel}"]`)?.content || undefined;

      const genres = new Set();
      const addGenre = (raw) => {
        const t = (raw || '').trim().toLowerCase();
        const hit = genreList.find((g) => g.toLowerCase() === t);
        if (hit) genres.add(hit);
      };

      // genre/tag links — the pattern nearly every reader uses
      document
        .querySelectorAll('a[href*="genre"], a[href*="genres"], a[href*="category"], a[href*="/tag"], .genres a, .genre a, [class*="genre"] a')
        .forEach((a) => addGenre(a.textContent));
      (meta('keywords') || '').split(/[,;]/).forEach(addGenre);

      // JSON-LD sometimes carries genre + author
      let ldGenre, ldAuthor;
      for (const script of document.querySelectorAll('script[type="application/ld+json"]')) {
        try {
          const ld = JSON.parse(script.textContent);
          const nodes = Array.isArray(ld) ? ld : [ld];
          for (const node of nodes) {
            if (node.genre) ldGenre = node.genre;
            if (node.author) ldAuthor = typeof node.author === 'string' ? node.author : node.author?.name;
          }
        } catch {}
      }
      if (ldGenre) (Array.isArray(ldGenre) ? ldGenre : [ldGenre]).forEach(addGenre);

      const authorLabel = [...document.querySelectorAll('a[href*="author"], .author, [class*="author"]')]
        .map((el) => el.textContent?.trim())
        .find((t) => t && t.length > 2 && t.length < 60);

      return {
        title: meta('og:title') || meta('twitter:title') || document.title || undefined,
        siteName: meta('og:site_name'),
        description: meta('og:description') || meta('description'),
        coverUrl: meta('og:image') || meta('twitter:image'),
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

const server = http.createServer(async (req, res) => {
  res.setHeader('content-type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'mangashelf-scraper' }));
    return;
  }

  if (req.method === 'POST' && req.url === '/extract') {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', async () => {
      try {
        const { url } = JSON.parse(body || '{}');
        if (!url || !/^https?:\/\//i.test(url)) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: 'Provide a valid http(s) url' }));
          return;
        }
        console.log(`[extract] ${url}`);
        const data = await extract(url);
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error('[extract] failed:', err.message);
        res.statusCode = 502;
        res.end(JSON.stringify({ error: `Extraction failed: ${err.message}` }));
      }
    });
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'Not found. POST /extract { url } or GET /health' }));
});

server.listen(PORT, () => {
  console.log(`MangaShelf scraper listening on :${PORT}`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    if (browserPromise) (await browserPromise).close().catch(() => {});
    server.close(() => process.exit(0));
  });
}
