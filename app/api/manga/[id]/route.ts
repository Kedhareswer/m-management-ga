import { NextRequest, NextResponse } from 'next/server';
import { getSeries, updateSeries, deleteSeries } from '@/lib/store';
import { detectChapterPattern } from '@/lib/chapterUrl';
import { withErrors } from '@/lib/api';
import type { Series } from '@/lib/types';

export const dynamic = 'force-dynamic';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withErrors(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const series = await getSeries(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(series);
});

/**
 * PATCH /api/manga/[id]
 * Accepts partial updates: currentChapter, status, genres, title, lastReadUrl...
 * If lastReadUrl is sent, we also re-detect the chapter pattern from it.
 */
export const PATCH = withErrors(async (req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  let patch: Partial<Series>;
  try {
    patch = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const allowed: (keyof Series)[] = [
    'title', 'currentChapter', 'totalChapters', 'status', 'favorite', 'genres', 'kind',
    'author', 'description', 'coverUrl', 'lastReadUrl', 'chapterUrlPattern', 'sourceUrl',
    'startedAt', 'completedAt', 'metaStatus',
  ];
  const safe: Partial<Series> = {};
  for (const key of allowed) {
    if (key in patch) (safe as Record<string, unknown>)[key] = patch[key];
  }

  // Editing any descriptive field means the user has curated it themselves —
  // mark it 'manual' so the UI stops nagging about blocked auto-details.
  const metaFields: (keyof Series)[] = ['title', 'genres', 'author', 'description', 'coverUrl'];
  if (metaFields.some((f) => f in patch) && !('metaStatus' in patch)) {
    safe.metaStatus = 'manual';
  }

  if (typeof safe.currentChapter === 'number') {
    safe.currentChapter = Math.max(0, safe.currentChapter);
  }

  // Reading dates follow the status automatically: finishing stamps the end
  // date, un-finishing clears it again.
  if (safe.status) {
    const current = await getSeries(id);
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (safe.status === 'completed' && !current.completedAt) {
      safe.completedAt = new Date().toISOString();
    } else if (safe.status !== 'completed' && current.completedAt) {
      safe.completedAt = undefined;
    }
    if (safe.status === 'reading' && !current.startedAt) {
      safe.startedAt = new Date().toISOString();
    }
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
});

export const DELETE = withErrors(async (_req: NextRequest, ctx: Ctx) => {
  const { id } = await ctx.params;
  const ok = await deleteSeries(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
});
