import axios from 'axios';

/**
 * LLM provider layer — OpenAI-compatible completions.
 *
 * Two server-side providers, Requesty preferred (fast router, paid key) with
 * NVIDIA NIM as fallback. Secrets come only from env or session headers;
 * the app falls back to rules when no key is configured.
 */

export interface AIConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  provider?: 'requesty' | 'nvidia';
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ||
  'https://integrate.api.nvidia.com/v1/chat/completions';
export const REQUESTY_BASE_URL =
  process.env.REQUESTY_BASE_URL || 'https://router.requesty.ai/v1';
export const DEFAULT_MODEL =
  process.env.AI_MODEL ||
  process.env.NVIDIA_MODEL ||
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

/** Back-compat alias used across the app. */
export const DEFAULT_INVOKE_URL = NVIDIA_API_URL;

function normalizeBase(url: string): string {
  return url.endsWith('/chat/completions')
    ? url
    : `${url.replace(/\/+$/, '')}/chat/completions`;
}

/** Detect Requesty keys (rqsty-…) so session overrides hit the right router. */
export function isRequestyKey(apiKey: string): boolean {
  return apiKey.trim().toLowerCase().startsWith('rqsty-');
}

/**
 * Server-side config: Requesty first (REQUESTY_API_KEY), then NVIDIA
 * (NVIDIA_API_KEY). Returns null when neither is set.
 */
export function getServerAIConfig(): AIConfig | null {
  const requestyKey = process.env.REQUESTY_API_KEY?.trim();
  if (requestyKey) {
    return {
      apiKey: requestyKey,
      model: process.env.AI_MODEL?.trim() || DEFAULT_MODEL,
      baseUrl: normalizeBase(REQUESTY_BASE_URL),
      provider: 'requesty',
    };
  }

  const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
  if (!nvidiaKey) return null;
  return {
    apiKey: nvidiaKey,
    model: process.env.NVIDIA_MODEL?.trim() || DEFAULT_MODEL,
    baseUrl: normalizeBase(NVIDIA_API_URL),
    provider: 'nvidia',
  };
}

/** Public status for the UI — never includes secrets. */
export function getServerAIStatus(): {
  configured: boolean;
  provider: 'requesty' | 'nvidia' | null;
  model: string | null;
} {
  const cfg = getServerAIConfig();
  if (!cfg) return { configured: false, provider: null, model: null };
  return { configured: true, provider: cfg.provider || null, model: cfg.model };
}

/**
 * Session override from request headers, or server env config.
 * Requesty keys are routed to REQUESTY_BASE_URL automatically.
 */
export function resolveAIConfig(
  apiKey?: string | null,
  model?: string | null
): AIConfig | null {
  const key = apiKey?.trim();
  if (key) {
    const requesty = isRequestyKey(key);
    return {
      apiKey: key,
      model: model?.trim() || DEFAULT_MODEL,
      baseUrl: normalizeBase(requesty ? REQUESTY_BASE_URL : NVIDIA_API_URL),
      provider: requesty ? 'requesty' : 'nvidia',
    };
  }
  return getServerAIConfig();
}

export interface ChatCompletion {
  content: string;
  reasoning?: string;
}

const THINK_TAG_RE = /<(think|thinking|reasoning)>([\s\S]*?)<\/\1>/gi;

export async function chatComplete(
  cfg: AIConfig,
  messages: AIMessage[],
  opts: { maxTokens?: number; temperature?: number; enableThinking?: boolean } = {}
): Promise<ChatCompletion> {
  const apiKey = cfg.apiKey?.trim();
  if (!apiKey) throw new Error('No AI API key is configured');

  const model = cfg.model?.trim() || DEFAULT_MODEL;
  const invokeUrl = cfg.baseUrl?.trim() ? normalizeBase(cfg.baseUrl) : NVIDIA_API_URL;

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  // Reasoning models (nemotron-*-reasoning) think by default and burn the
  // whole token budget on it — thinking stays off unless explicitly asked.
  const enableThinking = opts.enableThinking ?? false;

  const payload: Record<string, unknown> = {
    messages,
    model,
    max_tokens: opts.maxTokens ?? 768,
    stream: false,
    temperature: opts.temperature ?? 0.6,
    top_p: 0.95,
  };
  if (enableThinking) {
    payload.chat_template_kwargs = { enable_thinking: true };
  }

  try {
    const response = await axios.post(invokeUrl, payload, {
      headers,
      responseType: 'json',
      timeout: 45_000,
    });

    const data = response.data;
    const message = data?.choices?.[0]?.message;
    let content = message?.content;
    if (typeof content !== 'string') {
      throw new Error('AI provider returned no message content');
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
      throw new Error(`AI API HTTP ${error.response.status}: ${errDetail.slice(0, 300)}`);
    }
    throw error;
  }
}
