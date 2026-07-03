import { NextRequest, NextResponse } from 'next/server';
import { listSeries, updateSeries } from '@/lib/store';
import { answer } from '@/lib/bot';

export const dynamic = 'force-dynamic';

/**
 * POST /api/chat { message: string }
 * Mango the shelf assistant. If the message asks for a chapter update,
 * the update is applied before replying.
 */
export async function POST(req: NextRequest) {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: 'Say something!' }, { status: 400 });
  }

  const library = await listSeries();
  const { reply, update } = answer(message, library);

  if (update) {
    await updateSeries(update.id, { currentChapter: update.currentChapter });
  }

  return NextResponse.json(reply);
}
