import type { Series } from './types';
import type { BotReply } from './bot';
import { findSeries } from './bot';
import { continueUrl } from './chapterUrl';
import { updateSeries } from './store';
import { chatComplete, type AIConfig } from './ai';
import { webSearch, webSearchEnabled, type WebResult } from './websearch';
import type { StoredMessage } from './memory';

/**
 * The LLM-backed Mango agent. The model gets the whole library plus the
 * compacted memory notes in its system prompt, and acts on the shelf
 * through a small JSON action protocol (Gemma-class models don't do
 * native tool calling reliably, so instructed-JSON it is).
 */

interface AgentAction {
  type: 'update_chapter' | 'set_status' | 'set_favorite' | 'open' | 'web_search';
  title?: string;
  chapter?: number;
  status?: Series['status'];
  favorite?: boolean;
  query?: string;
}

function systemPrompt(): string {
  const webSearchDoc = webSearchEnabled()
    ? '\n- {"type":"web_search","query":"<search query>"} — when the user wants a recommendation ' +
      "beyond what's on the shelf, search the web for it. You'll get results back and a chance to " +
      'give your real answer using them — so when you use this action, keep "reply" short (e.g. ' +
      '"Let me look that up…") since it will be replaced.'
    : '';

  return `You are Mango 🍊, the playful shelf-keeper of MangaShelf, a personal manga/comic/graphic-novel reading tracker. Be warm, brief and a little bookish. The user is the shelf's only owner.

You can act on the shelf. Respond with ONLY a JSON object, no markdown fences, in this shape:
{"reply": "<what you say to the user>", "actions": [ ...zero or more... ]}

Allowed actions:
- {"type":"update_chapter","title":"<series title>","chapter":<number>} — move the user's bookmark
- {"type":"set_status","title":"<series title>","status":"reading"|"paused"|"completed"|"plan-to-read"}
- {"type":"set_favorite","title":"<series title>","favorite":true|false}
- {"type":"open","title":"<series title>"} — when the user wants to continue/read a series, this attaches a link to their exact current chapter${webSearchDoc}

Rules: only use titles that exist on the shelf below for update_chapter/set_status/set_favorite/open. If the user asks to update something not on the shelf, say so in the reply with no action. Keep replies under 3 sentences unless asked for detail. Never invent chapter numbers the user didn't give you, except when recommending what's already on the shelf.`;
}

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
    systemPrompt(),
    libraryBlock(library),
    memorySummary ? `LONG-TERM MEMORY NOTES:\n${memorySummary}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const history = recentMessages.slice(-12).map((m) => ({
    role: m.from === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));

  const conversation = [
    { role: 'system' as const, content: system },
    ...history,
    { role: 'user' as const, content: message },
  ];

  let completion = await chatComplete(ai, conversation);
  let parsed = parseAgentJson(completion.content);
  let thinking = completion.reasoning;
  let searchResults: WebResult[] | undefined;

  // One bounded round-trip: if the model asked to search, run it and let the
  // model compose its REAL answer from the results. Never loops further —
  // a second web_search request in round 2 is just ignored.
  const searchAction = parsed.actions.find((a) => a.type === 'web_search' && a.query);
  if (searchAction?.query && webSearchEnabled()) {
    try {
      searchResults = await webSearch(searchAction.query, 5);
      const resultsBlock =
        searchResults.length > 0
          ? searchResults.map((r, i) => `${i + 1}. ${r.title} — ${r.url}${r.snippet ? `\n   ${r.snippet}` : ''}`).join('\n')
          : '(no results found)';
      const followUp = await chatComplete(ai, [
        ...conversation,
        { role: 'assistant' as const, content: completion.content },
        {
          role: 'user' as const,
          content:
            `WEB SEARCH RESULTS for "${searchAction.query}":\n${resultsBlock}\n\n` +
            'Now give your real reply using these results — same {"reply": ..., "actions": []} JSON shape ' +
            '(no more web_search actions; the shelf actions above are still available if relevant). ' +
            "Mention titles naturally in your reply text; you don't need to repeat the raw URLs, links are shown separately.",
        },
      ]);
      completion = followUp;
      parsed = parseAgentJson(followUp.content);
      thinking = [thinking, followUp.reasoning].filter(Boolean).join('\n\n---\n\n') || undefined;
    } catch (err) {
      // Search failed — fall back to the model's own (pre-search) reply text
      // rather than surfacing a raw error in chat.
      console.warn(`[agent] web search failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // parsed.reply is already the cleaned/de-tagged text (or '' if the model's
  // entire output was tool-call scaffolding with nothing left to say) —
  // never fall back to the raw completion, that's exactly the unstripped
  // text parseAgentJson worked to clean up.
  const reply: BotReply = {
    text: parsed.reply || 'Done! 👍',
    thinking,
  };
  if (searchResults && searchResults.length > 0) {
    reply.links = searchResults.map((r) => ({ href: r.url, label: r.title, snippet: r.snippet }));
  }

  const touched: Series[] = [];
  const toolCalls: string[] = [];
  let mutated = false;

  if (searchAction?.query) {
    toolCalls.push(
      searchResults
        ? `🔎 Searched the web for "${searchAction.query}" (${searchResults.length} results)`
        : `🔎 Tried to search the web for "${searchAction.query}" (unavailable)`
    );
  }

  for (const action of parsed.actions.slice(0, 5)) {
    if (action.type === 'web_search') continue; // handled above, not a shelf action
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
  web_search: 'web_search',
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
