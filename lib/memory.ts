import { promises as fs } from 'fs';
import path from 'path';
import { chatComplete, type AIConfig } from './ai';
import { withTimeout } from './timeout';

/**
 * Agent memory for Mango. The full conversation is persisted to disk so
 * chat survives reloads, and when it grows past a threshold the older
 * messages are COMPACTED into a rolling summary — via the LLM when a key
 * is available this turn, via a cheap heuristic otherwise. The summary is
 * fed back into the system prompt, so Mango keeps long-term context
 * without an ever-growing prompt.
 */

export interface StoredMessage {
  from: 'user' | 'bot';
  text: string;
  at: string;
}

export interface ChatMemory {
  /** Rolling compacted summary of everything older than `messages`. */
  summary: string;
  messages: StoredMessage[];
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'chat-memory.json');

const MAX_MESSAGES = Number(process.env.MEMORY_MAX_MESSAGES) || 40;
const KEEP_RECENT = Number(process.env.MEMORY_KEEP_RECENT) || 12;

// In-memory fallback mirrors lib/store.ts: an unwritable data dir must
// degrade to non-persistent memory, never crash the chat.
const g = globalThis as typeof globalThis & { __mangaMemChat?: ChatMemory };

let writeChain: Promise<unknown> = Promise.resolve();

export async function loadMemory(): Promise<ChatMemory> {
  if (g.__mangaMemChat) return g.__mangaMemChat;
  try {
    const raw = await fs.readFile(FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : '',
      messages: Array.isArray(parsed.messages) ? parsed.messages : [],
    };
  } catch {
    return { summary: '', messages: [] };
  }
}

async function saveMemory(mem: ChatMemory): Promise<void> {
  if (g.__mangaMemChat) {
    g.__mangaMemChat = mem;
    return;
  }
  writeChain = writeChain.then(async () => {
    try {
      await withTimeout(
        (async () => {
          await fs.mkdir(DATA_DIR, { recursive: true });
          const tmp = FILE + '.tmp';
          await fs.writeFile(tmp, JSON.stringify(mem, null, 2), 'utf8');
          await fs.rename(tmp, FILE);
        })(),
        4000,
        'chat memory write'
      );
    } catch (err) {
      console.warn(
        `[memory] Cannot write ${FILE} (${err instanceof Error ? err.message : err}) — chat memory is in-memory only for this run.`
      );
      g.__mangaMemChat = mem;
    }
  });
  await writeChain;
}

export async function appendMessages(msgs: Omit<StoredMessage, 'at'>[]): Promise<ChatMemory> {
  const mem = await loadMemory();
  const at = new Date().toISOString();
  mem.messages.push(...msgs.map((m) => ({ ...m, at })));
  await saveMemory(mem);
  return mem;
}

export async function clearMemory(): Promise<void> {
  await saveMemory({ summary: '', messages: [] });
}

/**
 * Fold older messages into the rolling summary once the transcript grows
 * past MAX_MESSAGES. Uses the LLM when this turn has a key; otherwise a
 * heuristic digest so memory never grows unbounded either way.
 */
export async function compactIfNeeded(ai?: AIConfig): Promise<void> {
  const mem = await loadMemory();
  if (mem.messages.length <= MAX_MESSAGES) return;

  const old = mem.messages.slice(0, -KEEP_RECENT);
  const recent = mem.messages.slice(-KEEP_RECENT);
  const transcript = old.map((m) => `${m.from === 'user' ? 'User' : 'Mango'}: ${m.text}`).join('\n');

  let summary: string;
  if (ai) {
    try {
      summary = await chatComplete(
        ai,
        [
          {
            role: 'system',
            content:
              'You maintain long-term memory notes for a manga reading-tracker assistant. ' +
              'Merge the existing notes and the new conversation excerpt into ONE set of concise notes (max 150 words): ' +
              "the user's reading habits, preferences, series discussed, chapter updates made, and any open threads. Plain text only.",
          },
          {
            role: 'user',
            content: `Existing notes:\n${mem.summary || '(none)'}\n\nNew conversation to fold in:\n${transcript}`,
          },
        ],
        { maxTokens: 300, temperature: 0.3 }
      );
    } catch {
      summary = heuristicSummary(mem.summary, old);
    }
  } else {
    summary = heuristicSummary(mem.summary, old);
  }

  await saveMemory({ summary: summary.trim().slice(0, 2000), messages: recent });
}

function heuristicSummary(existing: string, old: StoredMessage[]): string {
  const userLines = old
    .filter((m) => m.from === 'user')
    .map((m) => m.text.replace(/\s+/g, ' ').slice(0, 80))
    .slice(-8);
  const digest = `Earlier this session the user said: ${userLines.map((l) => `"${l}"`).join('; ')}.`;
  return [existing, digest].filter(Boolean).join('\n').slice(-2000);
}
