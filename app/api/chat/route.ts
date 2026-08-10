import { NextRequest, NextResponse } from 'next/server';
import { listSeries, updateSeries } from '@/lib/store';
import { answer } from '@/lib/bot';
import { llmAnswer } from '@/lib/agent';
import { DEFAULT_MODEL, getHardcodedAIConfig, type AIConfig } from '@/lib/ai';
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
 * - Uses NVIDIA AI completions (default model google/gemma-4-31b-it)
 *   with session-key override or default hardcoded credentials.
 * - Always falls back gracefully to rule-based logic if a transient network error occurs.
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
  const ai: AIConfig = apiKey ? { apiKey, model } : getHardcodedAIConfig();
  const safeMode = req.headers.get('x-safe-mode') !== '0';

  const [library, memory] = await Promise.all([listSeries(), loadMemory()]);

  let reply;
  let provider: 'nvidia' | 'rules' = 'rules';

  try {
    reply = await llmAnswer(ai, message, library, memory.summary, memory.messages, { safeMode });
    provider = 'nvidia';
  } catch (err) {
    // Surface the failure, then still answer with the built-in brain.
    const detail = err instanceof Error ? err.message : 'unknown error';
    const { reply: fallback, update } = await answer(message, library, ai, { safeMode });
    if (update) await updateSeries(update.id, { currentChapter: update.currentChapter });
    reply = {
      ...fallback,
      text: `⚠️ AI API call notice (${detail.slice(0, 160)}) — answering with my built-in brain instead.\n\n${fallback.text}`,
    };
  }

  // The recommend pipeline puts the substance (titles/links) in cards, not
  // the reply text — fold them into the persisted text so follow-up turns
  // ("add the second one") and history reloads still know what was picked.
  const memoryText =
    reply.recommendations && reply.recommendations.length > 0
      ? `${reply.text}\nPicks: ${reply.recommendations
          .map((r, i) => `${i + 1}. ${r.title}${r.sourceUrl ? ` (${r.sourceUrl})` : ''}`)
          .join('; ')}`
      : reply.text;

  await appendMessages([
    { from: 'user', text: message },
    { from: 'bot', text: memoryText },
  ]);
  await compactIfNeeded(ai);

  return NextResponse.json({ ...reply, provider });
});
