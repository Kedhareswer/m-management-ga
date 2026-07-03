import { NextRequest, NextResponse } from 'next/server';
import { getSeries, updateSeries, deleteSeries } from '@/lib/store';
import { detectChapterPattern } from '@/lib/chapterUrl';
import type { Series } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const series = await getSeries(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(series);
}

/**
 * PATCH /api/manga/[id]
 * Accepts partial updates: currentChapter, status, genres, title, lastReadUrl...
 * If lastReadUrl is sent, we also re-detect the chapter pattern from it.
 */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  let patch: Partial<Series>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowed: (keyof Series)[] = [
    'title', 'currentChapter', 'totalChapters', 'status', 'genres', 'kind',
    'author', 'description', 'coverUrl', 'lastReadUrl', 'chapterUrlPattern', 'sourceUrl',
  ];
  const safe: Partial<Series> = {};
  for (const key of allowed) {
    if (key in patch) (safe as Record<string, unknown>)[key] = patch[key];
  }

  if (typeof safe.currentChapter === 'number') {
    safe.currentChapter = Math.max(0, safe.currentChapter);
  }

  if (safe.lastReadUrl) {
    const detection = detectChapterPattern(safe.lastReadUrl);
    if (detection) {
      safe.chapterUrlPattern = detection.pattern;
      if (safe.currentChapter === undefined) safe.currentChapter = detection.chapter;
    }
  }

  const updated = await updateSeries(id, safe);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const ok = await deleteSeries(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
