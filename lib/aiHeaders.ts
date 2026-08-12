import type { NextRequest } from 'next/server';
import { resolveAIConfig, type AIConfig } from './ai';

/**
 * Build an AIConfig from request headers, or use the server-side env
 * (Requesty preferred, then NVIDIA). Returns null when nothing is configured.
 */
export function aiConfigFromHeaders(req: NextRequest): AIConfig | null {
  return resolveAIConfig(
    req.headers.get('x-ai-key'),
    req.headers.get('x-ai-model')
  );
}
