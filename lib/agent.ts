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

  const completion = await chatComplete(ai, [
    { role: 'system', content: system },
    ...history,
    { role: 'user', content: message },
  ]);

  const parsed = parseAgentJson(completion.content);
  // parsed.reply is already the cleaned/de-tagged text (or '' if the model's
  // entire output was tool-call scaffolding with nothing left to say) —
  // never fall back to the raw completion, that's exactly the unstripped
  // text parseAgentJson worked to clean up.
  const reply: BotReply = {
    text: parsed.reply || 'Done! 👍',
    thinking: completion.reasoning,
  };

  const touched: Series[] = [];
  const toolCalls: string[] = [];
  let mutated = false;

  for (const action of parsed.actions.slice(0, 5)) {
    if (!action.title) continue;
    const hit = findSeries(action.title, library);
    if (!hit) continue;

    if (action.type === 'update_chapter' && typeof action.chapter === 'number') {
      const chapter = Math.max(0, action.chapter);
      const updated = await updateSeries(hit.id, { currentChapter: chapter });
      if (updated) {
        touched.push(updated);
        mutated = true;
        toolCalls.push(`📖 Updated **${hit.title}** → chapter ${chapter}`);
      }
    } else if (action.type === 'set_status' && action.status) {
      const valid: Series['status'][] = ['reading', 'paused', 'completed', 'plan-to-read'];
      if (valid.includes(action.status)) {
        const updated = await updateSeries(hit.id, { status: action.status });
        if (updated) {
          touched.push(updated);
          mutated = true;
          toolCalls.push(`🔖 Set **${hit.title}** status → ${action.status}`);
        }
      }
    } else if (action.type === 'set_favorite' && typeof action.favorite === 'boolean') {
      const updated = await updateSeries(hit.id, { favorite: action.favorite });
      if (updated) {
        touched.push(updated);
        mutated = true;
        toolCalls.push(`${action.favorite ? '⭐ Favorited' : '☆ Unfavorited'} **${hit.title}**`);
      }
    } else if (action.type === 'open') {
      touched.push(hit);
      reply.link = { href: continueUrl(hit), label: `Continue ${hit.title}` };
      toolCalls.push(`🔗 Opened continue-reading link for **${hit.title}**`);
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
  if (toolCalls.length > 0) reply.toolCalls = toolCalls;
  if (mutated) reply.action = 'updated-chapter'; // signals the UI to refresh the shelf
  return reply;
}

interface ParsedAgent {
  reply: string;
  actions: AgentAction[];
}

const TOOL_BLOCK_RE = /<(tool_call|function_call|tool_use|invoke)[^>]*>([\s\S]*?)<\/\1>/gi;
const NAME_TO_TYPE: Record<string, AgentAction['type']> = {
  update_chapter: 'update_chapter',
  set_status: 'set_status',
  set_favorite: 'set_favorite',
  open: 'open',
};

/**
 * Some models ignore the instructed-JSON envelope entirely and emit their
 * own native-style tool-call blocks instead. Pull those out, translate any
 * that match our action shape, and return the text with the blocks removed
 * — so a model that goes off-script still gets its action carried out
 * instead of just having the tags silently deleted.
 */
function extractNativeToolCalls(text: string): { text: string; actions: AgentAction[] } {
  const actions: AgentAction[] = [];
  const withoutBlocks = text.replace(TOOL_BLOCK_RE, (_match, _tag, inner) => {
    try {
      const start = inner.indexOf('{');
      const end = inner.lastIndexOf('}');
      if (start === -1 || end <= start) return '';
      const obj = JSON.parse(inner.slice(start, end + 1));
      const type = NAME_TO_TYPE[obj.name || obj.type];
      const args = obj.arguments || obj.args || obj;
      if (type) actions.push({ type, ...args });
    } catch {
      // unparseable block — drop it silently, nothing to translate
    }
    return '';
  });
  return { text: withoutBlocks, actions };
}

/** Lenient parse: strip native tool-call blocks and code fences, grab the
 * outermost {...} matching our envelope shape, tolerate junk. */
function parseAgentJson(raw: string): ParsedAgent {
  const { text: withoutToolBlocks, actions: nativeActions } = extractNativeToolCalls(raw);
  const cleaned = withoutToolBlocks.replace(/```(?:json)?/gi, '').trim();

  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const obj = JSON.parse(cleaned.slice(start, end + 1));
      // Only accept it as our envelope if it actually has the shape we
      // asked for — a stray balanced-brace JSON blob (e.g. a tool-call
      // payload that isn't wrapped in recognisable tags) must NOT be
      // mistaken for {reply, actions} and surfaced as an empty reply that
      // falls back to the raw, unstripped text.
      if (typeof obj.reply === 'string') {
        return {
          reply: obj.reply,
          actions: [...(Array.isArray(obj.actions) ? obj.actions : []), ...nativeActions],
        };
      }
    } catch {
      // fall through — treat the whole output as prose
    }
  }
  // No recognisable envelope — show whatever prose is left (with any tool
  // blocks already stripped above) as the reply.
  return { reply: cleaned, actions: nativeActions };
}

function dedupeById(list: Series[]): Series[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));
}
