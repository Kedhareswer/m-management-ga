import type { NextRequest } from 'next/server';
import { DEFAULT_MODEL, getHardcodedAIConfig, type AIConfig } from './ai';

/**
 * Build an AIConfig from the request headers, or return the hardcoded NVIDIA AI config
 * by default so AI metadata extraction and assistant features work out of the box.
 */
export function aiConfigFromHeaders(req: NextRequest): AIConfig {
  const apiKey = req.headers.get('x-ai-key')?.trim();
  const model = req.headers.get('x-ai-model')?.trim() || DEFAULT_MODEL;
  if (apiKey) {
    return { apiKey, model };
  }
  return getHardcodedAIConfig();
}

