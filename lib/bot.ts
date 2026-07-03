import type { Series } from './types';
import { continueUrl } from './chapterUrl';

export interface BotReply {
  text: string;
  /** Series cards to render under the bubble, like the reference design. */
  series?: Series[];
  /** A link the bot suggests opening. */
  link?: { href: string; label: string };
  /** An action the UI should perform (already performed server-side). */
  action?: 'updated-chapter' | 'none';
}

/**
 * Mango — the shelf assistant. Pure rules, no API keys needed.
 * Understands: greetings, "what am I reading", "update <title> to chapter <n>",
 * "continue/open <title>", "recommend <genre>", "stats", "help".
 */
export function answer(message: string, library: Series[]): {
  reply: BotReply;
  update?: { id: string; currentChapter: number };
} {
  const msg = message.trim().toLowerCase();

  if (/^(hi|hello|hey|good\s*(day|morning|evening)|yo)\b/.test(msg)) {
    return {
      reply: {
        text: "Good day! 📚 I'm Mango, your shelf keeper. Ask me “what am I reading?”, “update One Piece to chapter 1100”, or “recommend fantasy”.",
      },
    };
  }

  if (/help|what can you do/.test(msg)) {
    return {
      reply: {
        text: 'I can do a few tricks:\n• “what am I reading?” — your in-progress shelf\n• “update <title> to chapter <n>” — bump your bookmark\n• “continue <title>” — a link to the chapter you\'re on\n• “recommend <genre>” — pick something from your shelf\n• “stats” — your reading numbers',
      },
    };
  }

  // "update <title> (to) chapter <n>" / "read chapter <n> of <title>" / "<title> ch 12"
  const upd =
    msg.match(/update\s+(.+?)\s+(?:to\s+)?(?:chapter|chap|ch\.?|episode|ep)\s*([\d.]+)/) ||
    msg.match(/(?:read|finished|on)\s+(?:chapter|chap|ch\.?|episode|ep)\s*([\d.]+)\s+(?:of|in)\s+(.+)/) ||
    msg.match(/(.+?)\s+(?:chapter|chap|ch\.?|episode|ep)\s*([\d.]+)\s*$/);
  if (upd) {
    // The second regex captures (chapter, title); the others (title, chapter).
    const [a, b] = [upd[1], upd[2]];
    const chapterFirst = /^[\d.]+$/.test(a);
    const titleQuery = (chapterFirst ? b : a).trim();
    const chapter = parseFloat(chapterFirst ? a : b);
    const hit = findSeries(titleQuery, library);
    if (!hit) {
      return { reply: { text: `Hmm, I couldn't find “${titleQuery}” on your shelf. 🤔 Try the exact title?` } };
    }
    return {
      update: { id: hit.id, currentChapter: chapter },
      reply: {
        text: `Done! 🔖 “${hit.title}” is now bookmarked at chapter ${chapter}. Click it any time and I'll take you right there.`,
        series: [{ ...hit, currentChapter: chapter }],
        action: 'updated-chapter',
      },
    };
  }

  // "continue / open / resume <title>"
  const cont = msg.match(/(?:continue|open|resume|take me to)\s+(.+)/);
  if (cont) {
    const hit = findSeries(cont[1].trim(), library);
    if (!hit) {
      return { reply: { text: `I couldn't find “${cont[1].trim()}” on your shelf. 🤔` } };
    }
    return {
      reply: {
        text: `Picking up “${hit.title}” at chapter ${hit.currentChapter || '?'} — here you go! 🏃💨`,
        series: [hit],
        link: { href: continueUrl(hit), label: `Continue ${hit.title}` },
      },
    };
  }

  if (/what.*(am i |I'm |currently )?read|my shelf|my list|show.*(library|shelf|manga)/.test(msg)) {
    const reading = library.filter((s) => s.status === 'reading');
    if (reading.length === 0) {
      return { reply: { text: 'Your shelf is feeling light — paste a link up top and I\'ll file it for you! ✨' } };
    }
    return {
      reply: {
        text: `You have ${reading.length} series in progress. The freshest ones:`,
        series: reading.slice(0, 3),
      },
    };
  }

  // "recommend <genre>" / "something <genre>"
  const rec = msg.match(/(?:recommend|suggest|something)\s+(.+)/);
  if (rec) {
    const q = rec[1].replace(/^(me\s+)?(a\s+|some\s+)?/, '').trim();
    const matches = library.filter((s) =>
      s.genres.some((g) => g.toLowerCase().includes(q)) || s.kind.includes(q)
    );
    if (matches.length === 0) {
      return { reply: { text: `Nothing tagged “${q}” on your shelf yet — add one and I'll remember it! 🌱` } };
    }
    const pick = matches[Math.floor(Math.random() * matches.length)];
    return {
      reply: {
        text: `How about “${pick.title}”? ${pick.genres.join(' · ')} — you're at chapter ${pick.currentChapter}.`,
        series: [pick],
      },
    };
  }

  if (/stats|numbers|progress|how much/.test(msg)) {
    const total = library.length;
    const chapters = library.reduce((n, s) => n + (s.currentChapter || 0), 0);
    const genres = new Set(library.flatMap((s) => s.genres)).size;
    return {
      reply: {
        text: `Your shelf: ${total} series, ${chapters.toLocaleString()} chapters read, ${genres} genres explored. Impressive! 🏆`,
      },
    };
  }

  // Bare title mention → show its card
  const hit = findSeries(msg, library);
  if (hit) {
    return {
      reply: {
        text: `“${hit.title}” (${hit.siteName}) — chapter ${hit.currentChapter}${hit.totalChapters ? ` of ${hit.totalChapters}` : ''}, filed under ${hit.genres.join(', ') || hit.kind}.`,
        series: [hit],
        link: { href: continueUrl(hit), label: 'Continue reading' },
      },
    };
  }

  return {
    reply: {
      text: "I didn't quite catch that. 😅 Try “help” to see what I can do!",
    },
  };
}

function findSeries(query: string, library: Series[]): Series | undefined {
  const q = query.toLowerCase().replace(/["'“”]/g, '').trim();
  if (!q) return undefined;
  return (
    library.find((s) => s.title.toLowerCase() === q) ||
    library.find((s) => s.title.toLowerCase().includes(q)) ||
    library.find((s) => q.includes(s.title.toLowerCase()))
  );
}
