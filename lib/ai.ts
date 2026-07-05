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

export interface ChatCompletion {
  /** The model's answer, with any inline reasoning tags already stripped out. */
  content: string;
  /**
   * Chain-of-thought, when the model/router exposes it — either as a
   * dedicated `reasoning`/`reasoning_content` field (OpenRouter/Requesty
   * pass-through convention for reasoning models) or inline
   * <think>/<thinking>/<reasoning> tags inside content. Never shown inline
   * in the reply text; callers decide whether/how to surface it.
   */
  reasoning?: string;
}

const THINK_TAG_RE = /<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi;

export async function chatComplete(
  cfg: AIConfig,
  messages: AIMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<ChatCompletion> {
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
  const message = data?.choices?.[0]?.message;
  let content = message?.content;
  if (typeof content !== 'string') {
    throw new Error('Requesty returned no message content');
  }

  // Some routers put reasoning in its own field (reasoning / reasoning_content).
  const fieldReasoning: string | undefined = message?.reasoning || message?.reasoning_content;
  const reasoningParts: string[] = fieldReasoning ? [fieldReasoning.trim()] : [];

  // Others (or the model itself) embed it inline as <think>...</think> etc.
  // — pull those out of content so they never leak into the visible reply.
  content = content.replace(THINK_TAG_RE, (_match, _tag, inner) => {
    const trimmed = inner.trim();
    if (trimmed) reasoningParts.push(trimmed);
    return '';
  }).trim();

  return {
    content,
    reasoning: reasoningParts.length > 0 ? reasoningParts.join('\n\n').slice(0, 4000) : undefined,
  };
}
