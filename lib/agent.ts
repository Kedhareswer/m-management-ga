import type { Series } from './types';
import type { BotReply } from './bot';
import { findSeries } from './bot';
import { continueUrl } from './chapterUrl';
import { updateSeries } from './store';
import { chatComplete, type AIConfig } from './ai';
import type { StoredMessage } from './memory';

/**
 * The LLM-backed Mango agent. The model gets the whole library plus the
 * compacted memory notes in its system prompt, and acts on the shelf
 * through a small JSON action protocol (Gemma-class models don't do
 * native tool calling reliably, so instructed-JSON it is).
 */

interface AgentAction {
  type: 'update_chapter' | 'set_status' | 'set_favorite' | 'open';
  title?: string;
  chapter?: number;
  status?: Series['status'];
  favorite?: boolean;
}

const SYSTEM_PROMPT = `You are Mango 🍊, the playful shelf-keeper of MangaShelf, a personal manga/comic/graphic-novel reading tracker. Be warm, brief and a little bookish. The user is the shelf's only owner.

You can act on the shelf. Respond with ONLY a JSON object, no markdown fences, in this shape:
{"reply": "<what you say to the user>", "actions": [ ...zero or more... ]}

Allowed actions:
- {"type":"update_chapter","title":"<series title>","chapter":<number>} — move the user's bookmark
- {"type":"set_status","title":"<series title>","status":"reading"|"paused"|"completed"|"plan-to-read"}
- {"type":"set_favorite","title":"<series title>","favorite":true|false}
- {"type":"open","title":"<series title>"} — when the user wants to continue/read a series, this attaches a link to their exact current chapter

Rules: only use titles that exist on the shelf below. If the user asks to update something not on the shelf, say so in the reply with no action. Keep replies under 3 sentences unless asked for detail. Never invent chapter numbers the user didn't give you, except when recommending what's already on the shelf.`;

function libraryBlock(library: Series[]): string {
  if (library.length === 0) return 'THE SHELF IS EMPTY.';
  return (
    'CURRENT SHELF:\n' +
    library
      .map(
        (s) =>
          `- "${s.title}" — ${s.kind}; genres: ${s.genres.join(', ') || 'none'}; status: ${s.status}; ` +
          `chapter ${s.currentChapter}${s.totalChapters ? `/${s.totalChapters}` : ''}; ` +
          `${s.favorite ? 'favorite; ' : ''}site: ${s.siteName}`
      )
      .join('\n')
  );
}

export async function llmAnswer(
  ai: AIConfig,
  message: string,
  library: Series[],
  memorySummary: string,
  recentMessages: StoredMessage[]
): Promise<BotReply> {
  const system = [
    SYSTEM_PROMPT,
    libraryBlock(library),
    memorySummary ? `LONG-TERM MEMORY NOTES:\n${memorySummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const history = recentMessages.slice(-12).map((m) => ({
    role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));

  const raw = await chatComplete(ai, [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: message },
  ]);

  const parsed = parseAgentJson(raw);
  const reply: BotReply = { text: parsed.reply || raw.trim() };

  const touched: Series[] = [];
  let mutated = false;

  for (const action of parsed.actions.slice(0, 5)) {
    if (!action.title) continue;
    const hit = findSeries(action.title, library);
    if (!hit) continue;

    if (action.type === 'update_chapter' && typeof action.chapter === 'number') {
      const updated = await updateSeries(hit.id, {
        currentChapter: Math.max(0, action.chapter),
      });
      if (updated) {
        touched.push(updated);
        mutated = true;
      }
    } else if (action.type === 'set_status' && action.status) {
      const valid: Series['status'][] = ['reading', 'paused', 'completed', 'plan-to-read'];
      if (valid.includes(action.status)) {
        const updated = await updateSeries(hit.id, { status: action.status });
        if (updated) {
          touched.push(updated);
          mutated = true;
        }
      }
    } else if (action.type === 'set_favorite' && typeof action.favorite === 'boolean') {
      const updated = await updateSeries(hit.id, { favorite: action.favorite });
      if (updated) {
        touched.push(updated);
        mutated = true;
      }
    } else if (action.type === 'open') {
      touched.push(hit);
      reply.link = { href: continueUrl(hit), label: `Continue ${hit.title}` };
    }
  }

  // No explicit action? Still show covers for series the reply talks about.
  if (touched.length === 0) {
    for (const s of library) {
      if (reply.text.toLowerCase().includes(s.title.toLowerCase())) touched.push(s);
      if (touched.length >= 3) break;
    }
  }

  if (touched.length > 0) reply.series = dedupeById(touched).slice(0, 3);
  if (mutated) reply.action = 'updated-chapter'; // signals the UI to refresh the shelf
  return reply;
}

interface ParsedAgent {
  reply: string;
  actions: AgentAction[];
}

/** Lenient parse: strip code fences, grab the outermost {...}, tolerate junk. */
function parseAgentJson(raw: string): ParsedAgent {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      return {
        reply: typeof obj.reply === 'string' ? obj.reply : '',
        actions: Array.isArray(obj.actions) ? obj.actions : [],
      };
    } catch {
      // fall through — treat the whole output as prose
    }
  }
  return { reply: cleaned, actions: [] };
}

function dedupeById(list: Series[]): Series[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}
