import { NextRequest, NextResponse } from 'next/server';
import { listSeries, addSeries, storageMode } from '@/lib/store';
import { extractMeta } from '@/lib/extract';
import { withErrors } from '@/lib/api';
import type { Series } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const GET = withErrors(async () => {
  const series = await listSeries();
  return NextResponse.json(series, {
    // Lets the UI warn when storage fell back to non-persistent memory.
    headers: { 'x-storage-mode': storageMode() },
  });
});

/**
 * POST /api/manga
 * { url: string, currentChapter?: number }  — extracts metadata and adds the series
 */
export const POST = withErrors(async (req: NextRequest) => {
  let body: { url?: string; currentChapter?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const url = body.url?.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Please provide a valid http(s) link' }, { status: 400 });
  }

  const existing = await listSeries();
  const meta = await extractMeta(url);

  const dupe = existing.find(
    (s) => s.title.toLowerCase() === meta.title.toLowerCase() && s.site === meta.site
  );
  if (dupe) {
    return NextResponse.json(
      { error: `"${dupe.title}" from ${dupe.siteName} is already on your shelf`, series: dupe },
      { status: 409 }
    );
  }

  const input: Omit<Series, 'id' | 'createdAt' | 'updatedAt'> = {
    title: meta.title,
    sourceUrl: url,
    site: meta.site,
    siteName: meta.siteName,
    kind: meta.kind,
    genres: meta.genres,
    author: meta.author,
    description: meta.description,
    coverUrl: meta.coverUrl,
    coverHue: existing.length % 6,
    favorite: false,
    status: 'reading',
    startedAt: new Date().toISOString(),
    currentChapter: body.currentChapter ?? meta.detectedChapter ?? 0,
    chapterUrlPattern: meta.chapterUrlPattern,
    lastReadUrl: meta.detectedChapter ? url : undefined,
    metaStatus: meta.status,
  };

  const series = await addSeries(input);
  return NextResponse.json(
    { series, extractor: meta.extractor, metaStatus: meta.status, blockReason: meta.blockReason },
    { status: 201 }
  );
});
