import { NextRequest, NextResponse } from 'next/server';
import { listSeries, updateSeries } from '@/lib/store';
import { answer } from '@/lib/bot';
import { llmAnswer } from '@/lib/agent';
import { DEFAULT_MODEL, type AIConfig } from '@/lib/ai';
import { appendMessages, clearMemory, compactIfNeeded, loadMemory } from '@/lib/memory';
import { withErrors } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/chat — the persisted conversation, so the panel restores on reload. */
export const GET = withErrors(async () => {
  const mem = await loadMemory();
  return NextResponse.json({ summary: mem.summary, messages: mem.messages });
});

/** DELETE /api/chat — wipe Mango's memory (transcript + compacted notes). */
export const DELETE = withErrors(async () => {
  await clearMemory();
  return NextResponse.json({ ok: true });
});

/**
 * POST /api/chat { message }
 *
 * Provider selection per request:
 * - `x-ai-key` header present → Requesty (default model google/gemma-4-31b-it,
 *   overridable via `x-ai-model`). The key is session-based and never stored.
 * - no key → the built-in rule-based Mango, so chat always works.
 *
 * Either way the exchange is appended to persistent memory and the
 * transcript is compacted when it grows long.
 */
export const POST = withErrors(async (req: NextRequest) => {
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

  const apiKey = req.headers.get('x-ai-key')?.trim() || '';
  const model = req.headers.get('x-ai-model')?.trim() || DEFAULT_MODEL;
  const ai: AIConfig | undefined = apiKey ? { apiKey, model } : undefined;

  const [library, memory] = await Promise.all([listSeries(), loadMemory()]);

  let reply;
  let provider: 'requesty' | 'rules' = 'rules';

  if (ai) {
    try {
      reply = await llmAnswer(ai, message, library, memory.summary, memory.messages);
      provider = 'requesty';
    } catch (err) {
      // Surface the failure, then still answer with the built-in brain.
      const detail = err instanceof Error ? err.message : 'unknown error';
      const { reply: fallback, update } = answer(message, library);
      if (update) await updateSeries(update.id, { currentChapter: update.currentChapter });
      reply = {
        ...fallback,
        text: `⚠️ Requesty call failed (${detail.slice(0, 160)}) — answering with my built-in brain instead.\n\n${fallback.text}`,
      };
    }
  } else {
    const { reply: ruleReply, update } = answer(message, library);
    if (update) await updateSeries(update.id, { currentChapter: update.currentChapter });
    reply = ruleReply;
  }

  await appendMessages([
    { from: 'user', text: message },
    { from: 'bot', text: reply.text },
  ]);
  await compactIfNeeded(ai);

  return NextResponse.json({ ...reply, provider });
});
