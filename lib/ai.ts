import axios from 'axios';

/**
 * LLM provider layer targeting NVIDIA API (OpenAI-compatible completions).
 *
 * Uses axios for HTTP calls with hardcoded API key fallback to ensure
 * zero-setup AI features out of the box.
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

export const HARDCODED_API_KEY =
  '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';
export const DEFAULT_INVOKE_URL =
  'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_MODEL = process.env.AI_MODEL || 'google/gemma-4-31b-it';

export function getHardcodedAIConfig(): AIConfig {
  return {
    apiKey: HARDCODED_API_KEY,
    model: DEFAULT_MODEL,
    baseUrl: DEFAULT_INVOKE_URL,
  };
}

export interface ChatCompletion {
  /** The model's answer, with any inline reasoning tags already stripped out. */
  content: string;
  /**
   * Chain-of-thought, when the model/router exposes it — either as a
   * dedicated `reasoning`/`reasoning_content` field or inline
   * <think>/<thinking>/<reasoning> tags inside content.
   */
  reasoning?: string;
}

const THINK_TAG_RE = /<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi;

export async function chatComplete(
  cfg: AIConfig,
  messages: AIMessage[],
  opts: { maxTokens?: number; temperature?: number } = {}
): Promise<ChatCompletion> {
  const apiKey = cfg.apiKey?.trim() || HARDCODED_API_KEY;
  const model = cfg.model?.trim() || DEFAULT_MODEL;

  let invokeUrl = DEFAULT_INVOKE_URL;
  if (
    cfg.baseUrl &&
    !cfg.baseUrl.includes('router.requesty.ai') &&
    cfg.baseUrl !== DEFAULT_INVOKE_URL
  ) {
    invokeUrl = cfg.baseUrl.endsWith('/chat/completions')
      ? cfg.baseUrl
      : `${cfg.baseUrl.replace(/\/+$/, '')}/chat/completions`;
  }

  const stream = false;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: stream ? 'text/event-stream' : 'application/json',
  };

  const payload = {
    messages,
    model,
    chat_template_kwargs: { enable_thinking: true },
    max_tokens: opts.maxTokens ?? 4096,
    stream,
    temperature: opts.temperature ?? 1,
    top_p: 0.95,
  };

  try {
    const response = await axios.post(invokeUrl, payload, {
      headers,
      responseType: stream ? 'stream' : 'json',
      timeout: 60_000,
    });

    const data = response.data;
    const message = data?.choices?.[0]?.message;
    let content = message?.content;
    if (typeof content !== 'string') {
      throw new Error('NVIDIA AI provider returned no message content');
    }

    const fieldReasoning: string | undefined = message?.reasoning || message?.reasoning_content;
    const reasoningParts: string[] = fieldReasoning ? [fieldReasoning.trim()] : [];

    content = content
      .replace(THINK_TAG_RE, (_match, _tag, inner) => {
        const trimmed = inner.trim();
        if (trimmed) reasoningParts.push(trimmed);
        return '';
      })
      .trim();

    return {
      content,
      reasoning: reasoningParts.length > 0 ? reasoningParts.join('\n\n').slice(0, 4000) : undefined,
    };
  } catch (error: unknown) {
    if (axios.isAxiosError(error) && error.response) {
      const errDetail =
        typeof error.response.data === 'string'
          ? error.response.data
          : JSON.stringify(error.response.data);
      throw new Error(`NVIDIA API HTTP ${error.response.status}: ${errDetail.slice(0, 300)}`);
    }
    throw error;
  }
}

