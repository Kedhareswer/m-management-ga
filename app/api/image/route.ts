import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { browserFetchImage } from '@/lib/playwright';
import { withErrors } from '@/lib/api';
import { getFetch } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const COVER_DIR = path.join(DATA_DIR, 'covers');
const MAX_BYTES = 8 * 1024 * 1024;

/**
 * GET /api/image?url=<cover>&ref=<series page>
 *
 * Cover-image proxy. Manga sites usually block hot-linking, so the browser
 * can't load covers directly. We fetch server-side with the series page as
 * Referer; if the site still refuses, the in-app Playwright browser fetches
 * it through a real browser context. Successful covers are cached on disk.
 */
export const GET = withErrors(async (req: NextRequest) => {
  const url = req.nextUrl.searchParams.get('url');
  const ref = req.nextUrl.searchParams.get('ref') || undefined;

  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'url must be http(s)' }, { status: 400 });
  }

  const key = createHash('sha256').update(url).digest('hex').slice(0, 32);
  const filePath = path.join(COVER_DIR, key);

  // 1) disk cache
  try {
    const [body, type] = await Promise.all([
      fs.readFile(filePath),
      fs.readFile(filePath + '.type', 'utf8'),
    ]);
    return imageResponse(body, type);
  } catch {
    // cache miss
  }

  // 2) direct fetch with polite headers
  let fetched = await directFetch(url, ref);

  // 3) blocked? fetch it through the in-app Playwright browser context
  if (!fetched) fetched = await browserFetch(url, ref);

  if (!fetched) {
    return NextResponse.json({ error: 'Could not fetch cover' }, { status: 502 });
  }

  // cache best-effort; serving the image matters more than caching it
  try {
    await fs.mkdir(COVER_DIR, { recursive: true });
    await fs.writeFile(filePath, fetched.body);
    await fs.writeFile(filePath + '.type', fetched.type, 'utf8');
  } catch {}

  return imageResponse(fetched.body, fetched.type);
});

interface Fetched {
  body: Buffer;
  type: string;
}

async function directFetch(url: string, ref?: string): Promise<Fetched | null> {
  try {
    const doFetch = await getFetch();
    const res = await doFetch(url, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        accept: 'image/avif,image/webp,image/png,image/jpeg,image/svg+xml,image/*;q=0.8',
        ...(ref ? { referer: ref } : {}),
      },
      signal: AbortSignal.timeout(12_000),
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null;
    const body = Buffer.from(await res.arrayBuffer());
    if (body.length === 0 || body.length > MAX_BYTES) return null;
    return { body, type };
  } catch {
    return null;
  }
}

async function browserFetch(url: string, ref?: string): Promise<Fetched | null> {
  if (process.env.DISABLE_PLAYWRIGHT === '1') return null;
  try {
    const { body, type } = await browserFetchImage(url, ref);
    if (body.length === 0 || body.length > MAX_BYTES) return null;
    return { body, type };
  } catch {
    return null;
  }
}

function imageResponse(body: Buffer, type: string): NextResponse {
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'content-type': type || 'image/jpeg',
      'cache-control': 'public, max-age=604800, immutable',
    },
  });
}
