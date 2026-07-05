import { NextRequest, NextResponse } from 'next/server';
import { getSeries, updateSeries } from '@/lib/store';
import { extractMeta } from '@/lib/extract';
import { withErrors } from '@/lib/api';
import { aiConfigFromHeaders } from '@/lib/aiHeaders';

export const dynamic = 'force-dynamic';

/**
 * POST /api/manga/[id]/refresh — re-run metadata extraction on the series'
 * source page and merge the results. Extracted fields only fill in or
 * improve metadata; user-owned state (chapter, status, favorite, dates)
 * is never touched.
 */
export const POST = withErrors(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const series = await getSeries(id);
  if (!series) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const meta = await extractMeta(series.sourceUrl, aiConfigFromHeaders(req));

  // On a block/unreachable re-extract, keep whatever we already had — don't
  // overwrite good data with a failed scrape — but record the new status.
  const blocked = meta.status === 'blocked' || meta.status === 'unreachable';
  const updated = await updateSeries(id, {
    genres: !blocked && meta.genres.length > 0 ? meta.genres : series.genres,
    author: (!blocked && meta.author) || series.author,
    description: (!blocked && meta.description) || series.description,
    coverUrl: (!blocked && meta.coverUrl) || series.coverUrl,
    siteName: (!blocked && meta.siteName) || series.siteName,
    kind: (!blocked && meta.kind) || series.kind,
    chapterUrlPattern: series.chapterUrlPattern || meta.chapterUrlPattern,
    nsfw: !blocked && meta.nsfw !== undefined ? meta.nsfw : series.nsfw,
    // Don't downgrade a series the user has manually curated back to 'partial'.
    metaStatus: series.metaStatus === 'manual' && !blocked ? 'manual' : meta.status,
  });

  return NextResponse.json({
    series: updated,
    extractor: meta.extractor,
    metaStatus: meta.status,
    blockReason: meta.blockReason,
  });
});
