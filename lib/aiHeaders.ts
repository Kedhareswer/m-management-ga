import type { NextRequest } from 'next/server';
import { DEFAULT_MODEL, type AIConfig } from './ai';

/**
 * Build an AIConfig from the session key headers a request carries, or
 * undefined when there's no key. Keeps the "session-based key, never stored"
 * contract: the key only ever travels per-request in x-ai-key.
 */
export function aiConfigFromHeaders(req: NextRequest): AIConfig | undefined {
  const apiKey = req.headers.get('x-ai-key')?.trim();
  if (!apiKey) return undefined;
  const model = req.headers.get('x-ai-model')?.trim() || DEFAULT_MODEL;
  return { apiKey, model };
}
