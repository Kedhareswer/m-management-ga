import { NextRequest, NextResponse } from 'next/server';
import { getSeries } from '@/lib/store';
import { continueUrl } from '@/lib/chapterUrl';

export const dynamic = 'force-dynamic';

/**
 * GET /go/[id] — "Continue reading".
 * Redirects straight to the chapter you're currently on:
 * chapter template + current chapter number when we have one,
 * otherwise the last chapter URL you saved, otherwise the series page.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const series = await getSeries(id);
  if (!series) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }
  return NextResponse.redirect(continueUrl(series), { status: 307 });
}
