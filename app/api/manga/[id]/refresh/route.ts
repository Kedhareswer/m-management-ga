import { NextRequest, NextResponse } from 'next/server';
import { getSeries, updateSeries } from '@/lib/store';
import { extractMeta } from '@/lib/extract';
import { withErrors } from '@/lib/api';

export const dynamic = 'force-dynamic';

/**
 * POST /api/manga/[id]/refresh — re-run metadata extraction on the series'
 * source page and merge the results. Extracted fields only fill in or
 * improve metadata; user-owned state (chapter, status, favorite, dates)
 * is never touched.
 */
export const POST = withErrors(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const series = await getSeries(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const meta = await extractMeta(series.sourceUrl);

  const updated = await updateSeries(id, {
    genres: meta.genres.length > 0 ? meta.genres : series.genres,
    author: meta.author || series.author,
    description: meta.description || series.description,
    coverUrl: meta.coverUrl || series.coverUrl,
    siteName: meta.siteName || series.siteName,
    kind: meta.kind || series.kind,
    chapterUrlPattern: series.chapterUrlPattern || meta.chapterUrlPattern,
  });

  return NextResponse.json({ series: updated, extractor: meta.extractor });
});
