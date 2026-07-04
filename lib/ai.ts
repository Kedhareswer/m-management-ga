/**
 * LLM provider layer. Requesty (https://requesty.ai) is an OpenAI-compatible
 * router, so this is a thin chat-completions client pointed at it.
 *
 * The API key is SESSION-BASED by design: the user pastes it into the chat
 * settings each session, the browser keeps it in sessionStorage, and it
 * travels per-request in the `x-ai-key` header. Nothing is persisted
 * server-side.
 */

export interface AIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const DEFAULT_MODEL = process.env.AI_MODEL || 'google/gemma-4-31b-it';
export const DEFAULT_BASE_URL =
  process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1';

export async function chatComplete(
  cfg: AIConfig,
  messages: AIMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl || DEFAULT_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model || DEFAULT_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 700,
    }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) {
    const body = (await res.text().catch(() => '')).slice(0, 300);
    throw new Error(`Requesty ${res.status}: ${body || res.statusText}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('Requesty returned no message content');
  }
  return content;
}
