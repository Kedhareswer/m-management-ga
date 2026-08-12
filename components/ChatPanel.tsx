'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import gsap from 'gsap';
import type { Series } from '@/lib/types';
import type { BotReply } from '@/lib/bot';
import type { Recommendation } from '@/lib/recommend';
import type { AddOutcome } from './Dashboard';
import { fetchJson } from '@/lib/fetchJson';
import BookCover from './BookCover';
import { SendIcon, ChevronIcon, CloseIcon, GearIcon, KeyIcon, TrashIcon, BrainIcon, WrenchIcon } from './icons';

interface Message {
  id: number;
  from: 'user' | 'bot';
  text: string;
  series?: Series[];
  link?: { href: string; label: string };
  links?: { href: string; label: string; snippet?: string }[];
  recommendations?: Recommendation[];
  thinking?: string;
  toolCalls?: string[];
}

let nextId = 1;

const DEFAULT_MODEL = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
const LEGACY_MODELS = new Set(['google/gemma-4-31b-it', 'google/gemma-3-27b-it']);

type ServerAIStatus = {
  configured: boolean;
  provider: 'requesty' | 'nvidia' | null;
  model: string | null;
};

const OPENERS: Omit<Message, 'id'>[] = [
  { from: 'bot', text: 'Good day.' },
  {
    from: 'bot',
    text: "I'm Mango, your shelf keeper. Ask me “what am I reading?” or tell me “update One Piece to chapter 1100” and I'll move your bookmark.",
  },
];

export default function ChatPanel({
  onLibraryChange,
  onClose,
  onAddSeries,
  onOpenReaderUrl,
}: {
  onLibraryChange: () => void;
  onClose: () => void;
  onAddSeries: (url: string) => Promise<AddOutcome>;
  onOpenReaderUrl?: (url: string, series?: Series) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const [serverAI, setServerAI] = useState<ServerAIStatus | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Handle scroll detection for jump-to-bottom floating arrow
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isUp = el.scrollHeight - el.scrollTop - el.clientHeight > 100;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  // Session-based override key: lives in sessionStorage only.
  useEffect(() => {
    const storedKey = sessionStorage.getItem('requesty-key') || '';
    let storedModel = sessionStorage.getItem('requesty-model') || DEFAULT_MODEL;
    // Migrate stale Gemma defaults left in older sessions.
    if (!storedKey && LEGACY_MODELS.has(storedModel)) {
      storedModel = DEFAULT_MODEL;
      sessionStorage.setItem('requesty-model', storedModel);
    }
    setAiKey(storedKey);
    setAiModel(storedModel);
  }, []);

  const saveSettings = useCallback((key: string, model: string) => {
    const nextModel = model.trim() || DEFAULT_MODEL;
    sessionStorage.setItem('requesty-key', key.trim());
    sessionStorage.setItem('requesty-model', nextModel);
    setAiKey(key.trim());
    setAiModel(nextModel);
    setSettingsOpen(false);
  }, []);

  // Restore the persisted conversation + server AI status on mount.
  useEffect(() => {
    (async () => {
      const res = await fetchJson<{
        messages?: { from: 'user' | 'bot'; text: string }[];
        ai?: ServerAIStatus;
      }>('/api/chat', { cache: 'no-store' });
      if (res.data?.ai) setServerAI(res.data.ai);
      const restored: Message[] = (res.data?.messages || []).map((m) => ({
        id: nextId++,
        from: m.from,
        text: m.text,
      }));
      setMessages(restored.length > 0 ? restored : OPENERS.map((m) => ({ ...m, id: nextId++ })));
    })();
  }, []);

  // Animate each new bubble in with a soft, fast fade — no bounce.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = el.querySelector('[data-bubble]:last-of-type');
    if (last) {
      gsap.fromTo(
        last,
        { y: 6, scale: 0.97, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.18, ease: 'power3.out' }
      );
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || thinking) return;
    if (!overrideText) setInput('');
    setMessages((m) => [...m, { id: nextId++, from: 'user', text }]);
    setThinking(true);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      // Only send session override when the user pasted a temporary key.
      // Otherwise the server uses REQUESTY_API_KEY / NVIDIA_API_KEY from env.
      if (aiKey) {
        headers['x-ai-key'] = aiKey;
        headers['x-ai-model'] = aiModel;
      }
      // Safe mode (shelf toggle) also governs recommendations.
      headers['x-safe-mode'] = localStorage.getItem('safe-mode') !== 'off' ? '1' : '0';
      const res = await fetchJson<BotReply & { provider?: string }>('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.data) {
        throw new Error(res.error || 'Chat failed');
      }
      const reply = res.data;
      setMessages((m) => [
        ...m,
        {
          id: nextId++,
          from: 'bot',
          text: reply.text,
          series: reply.series,
          link: reply.link,
          links: reply.links,
          recommendations: reply.recommendations,
          thinking: reply.thinking,
          toolCalls: reply.toolCalls,
        },
      ]);
      if (reply.action === 'updated-chapter') onLibraryChange();
    } catch (err) {
      const detail = err instanceof Error ? ` (${err.message.slice(0, 120)})` : '';
      setMessages((m) => [
        ...m,
        { id: nextId++, from: 'bot', text: `My ink spilled${detail} — try that again in a second! 🫙` },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const clearChat = async () => {
    await fetch('/api/chat', { method: 'DELETE' });
    setMessages(OPENERS.map((m) => ({ ...m, id: nextId++ })));
  };

  const PROMPT_CHIPS = [
    { label: 'What am I reading?', text: 'what am I reading?' },
    { label: 'Recommend fantasy', text: 'recommend fantasy' },
    { label: 'Reading stats', text: 'stats' },
    { label: 'Help', text: 'help' },
  ];

  const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <aside
      data-intro="chat"
      className="relative fixed inset-0 z-40 flex w-full flex-col bg-parchment p-4 pb-5 lg:static lg:z-auto lg:w-[320px] lg:shrink-0 lg:rounded-panel lg:border lg:border-ink/[0.1] lg:bg-card/80 lg:p-4 lg:shadow-soft lg:backdrop-blur-md"
    >
      <header className="flex items-center justify-between border-b border-ink/[0.08] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-card shadow-soft text-base" role="img" aria-label="Mango avatar">🍊</span>
            <h2 className="text-[16px] font-extrabold tracking-tight text-ink">Mango</h2>
            <span className="h-2 w-2 rounded-full bg-leaf" title="Online" />
          </div>
          <p className="mt-0.5 text-[10px] font-semibold text-fawn">
            {aiKey
              ? 'Session override key'
              : serverAI?.configured
                ? `${serverAI.provider === 'requesty' ? 'Requesty' : 'NVIDIA'} · ${shortModel(serverAI.model || DEFAULT_MODEL)}`
                : 'Rules brain (no AI key)'}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={`icon-btn !h-8 !w-8 ${settingsOpen ? '!text-lavdeep ring-2 ring-lavdeep/25' : ''}`}
            title="AI settings"
            aria-label="AI settings"
          >
            <GearIcon />
          </button>
          <button onClick={clearChat} className="icon-btn !h-8 !w-8" title="Clear chat & memory" aria-label="Clear chat and memory">
            <TrashIcon />
          </button>
          <button onClick={onClose} className="icon-btn !h-8 !w-8" title="Hide chat" aria-label="Hide chat">
            <CloseIcon />
          </button>
        </div>
      </header>

      {settingsOpen && (
        <SettingsCard
          initialKey={aiKey}
          initialModel={aiModel}
          serverAI={serverAI}
          onSave={saveSettings}
          onCancel={() => setSettingsOpen(false)}
        />
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {PROMPT_CHIPS.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => send(chip.text)}
            disabled={thinking}
            className="pressable rounded-full bg-card px-2.5 py-1 text-[10.5px] font-semibold text-ink/80 shadow-soft hover:text-ink disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto pr-1"
      >
        {messages.map((m) => (
          <div key={m.id} data-bubble className={`flex gap-2 ${m.from === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar Badge */}
            <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-card shadow-soft text-xs">
              {m.from === 'bot' ? '🍊' : '👤'}
            </div>

            <div className={m.from === 'bot' ? 'bubble-bot' : 'bubble-user'}>
              {m.thinking && <Disclosure icon={<BrainIcon />} label="Thinking" body={m.thinking} />}

              <p className="whitespace-pre-line">{m.text}</p>

              {m.toolCalls && m.toolCalls.length > 0 && (
                <Disclosure
                  icon={<WrenchIcon />}
                  label={`${m.toolCalls.length} shelf ${m.toolCalls.length === 1 ? 'action' : 'actions'}`}
                  body={m.toolCalls.join('\n')}
                />
              )}

              {m.series && m.series.length > 0 && (
                <div className="mt-2.5 flex gap-2">
                  {m.series.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onOpenReaderUrl?.(`/go/${s.id}`, s)}
                      className="pressable w-[72px] shrink-0 text-left motion-safe:hover:-translate-y-0.5"
                      title={`${s.title} — continue at ch. ${s.currentChapter}`}
                    >
                      <BookCover series={s} className="h-[92px] w-full" />
                      <div className="mt-2 truncate text-center text-[9px] font-bold text-fawn">
                        ch. {s.currentChapter}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {m.link && (
                <button
                  onClick={() => onOpenReaderUrl?.(m.link!.href)}
                  className="pressable mt-2 inline-block rounded-full bg-lavdeep px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-soft"
                >
                  {m.link.label} →
                </button>
              )}

              {m.recommendations && m.recommendations.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-2">
                  {m.recommendations.map((rec, i) => (
                    <RecommendationCard
                      key={`${m.id}-${i}`}
                      rec={rec}
                      index={i}
                      onAddSeries={onAddSeries}
                      onOpenReaderUrl={onOpenReaderUrl}
                    />
                  ))}
                </div>
              )}

              {m.links && m.links.length > 0 && (
                <div className="mt-2.5 flex flex-col gap-1.5">
                  {m.links.map((l, i) => (
                    <button
                      key={i}
                      onClick={() => onOpenReaderUrl?.(l.href)}
                      className="pressable block w-full rounded-xl border border-ink/[0.07] bg-card px-3 py-2 text-left shadow-soft hover:shadow-lift"
                    >
                      <div className="truncate text-[11.5px] font-extrabold text-lavdeep">{l.label}</div>
                      {l.snippet && (
                        <div className="mt-0.5 line-clamp-2 text-[10.5px] font-medium leading-snug text-fawn">
                          {l.snippet}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <div className="mt-1 text-right text-[9px] font-bold text-fawn/60">
                {nowTimeStr}
              </div>
            </div>
          </div>
        ))}

        {thinking && (
          <div data-bubble className="bubble-bot flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-2 w-2 animate-bounce rounded-full bg-fawn"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <div className="flex h-11 flex-1 items-center rounded-full border border-ink/[0.07] bg-card px-4 shadow-soft transition-[box-shadow] duration-200 focus-within:shadow-ring">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Write a message…"
            className="w-full bg-transparent text-[13px] font-medium outline-none placeholder:text-fawn/70"
            aria-label="Chat message"
          />
        </div>
        <button
          onClick={() => send()}
          className="pressable grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tomato text-white shadow-soft hover:shadow-lift"
          title="Send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </aside>
  );
}

// Cross-instance guard: the same series can appear as a card in two chat
// messages; per-card state alone would let both fire POST /api/manga.
const inFlightAdds = new Set<string>();

/**
 * A recommendation rendered like a real book off the shelf: cover art
 * (generated jacket when none was found), title, why-you'd-like-it, and a
 * one-click "read & add" that opens the reader AND files it on the shelf.
 */
function RecommendationCard({
  rec,
  index,
  onAddSeries,
  onOpenReaderUrl,
}: {
  rec: Recommendation;
  index: number;
  onAddSeries: (url: string) => Promise<AddOutcome>;
  onOpenReaderUrl?: (url: string, series?: Series) => void;
}) {
  const [state, setState] = useState<'idle' | 'adding' | 'added' | 'failed'>('idle');

  const pseudo = {
    id: `rec-${index}`,
    title: rec.title,
    sourceUrl: rec.sourceUrl || '',
    site: '',
    siteName: rec.siteName || rec.kind || 'recommended',
    kind: 'manga',
    genres: rec.genres || [],
    coverUrl: rec.coverUrl,
    coverHue: (rec.title.length + index) % 6,
    status: 'plan-to-read',
    favorite: false,
    currentChapter: 0,
    createdAt: '',
    updatedAt: '',
  } as Series;

  const openAndAdd = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!rec.sourceUrl || state === 'adding' || state === 'added') return;
    if (inFlightAdds.has(rec.sourceUrl)) return;
    inFlightAdds.add(rec.sourceUrl);
    if (onOpenReaderUrl) {
      onOpenReaderUrl(rec.sourceUrl, pseudo);
    } else {
      window.open(rec.sourceUrl, '_blank', 'noreferrer');
    }
    setState('adding');
    try {
      await onAddSeries(rec.sourceUrl);
      setState('added');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      setState(/already on your shelf/i.test(msg) ? 'added' : 'failed');
    } finally {
      inFlightAdds.delete(rec.sourceUrl);
    }
  };

  return (
    <div
      onClick={(e) => openAndAdd(e)}
      className="flex w-full items-stretch gap-3 rounded-blob bg-card p-2.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift cursor-pointer"
      title={
        rec.sourceUrl
          ? `Read ${rec.title} on ${rec.siteName || 'the reader'} and add to shelf`
          : `${rec.title} — no reader link found`
      }
    >
      <BookCover series={pseudo} className="h-[104px] w-[74px] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        <div className="truncate text-[13px] font-extrabold leading-tight">{rec.title}</div>
        {(rec.genres?.length || rec.kind) && (
          <div className="mt-0.5 truncate text-[10px] font-bold text-tomato/80">
            {[rec.kind, ...(rec.genres || [])].filter(Boolean).slice(0, 4).join(' · ')}
          </div>
        )}
        {rec.reason && (
          <p className="mt-1 line-clamp-2 text-[10.5px] font-medium leading-snug text-fawn">{rec.reason}</p>
        )}
        <div className="mt-auto pt-1 text-[10.5px] font-extrabold flex items-center gap-2">
          {state === 'idle' &&
            (rec.sourceUrl ? (
              <span className="text-lavdeep hover:underline">📖 Read in App &amp; Add →</span>
            ) : (
              <span className="text-fawn">no reader link found</span>
            ))}
          {state === 'adding' && <span className="text-fawn animate-pulse">adding to shelf…</span>}
          {state === 'added' && <span className="text-leaf">✓ on your shelf</span>}
          {state === 'failed' && <span className="text-tomato">couldn&apos;t add — try + add button</span>}
        </div>
      </div>
    </div>
  );
}

/**
 * A collapsed-by-default disclosure for anything that isn't the direct
 * answer — model reasoning, shelf actions taken. Hidden until clicked, so
 * the chat reads clean by default but nothing is silently thrown away.
 */
function Disclosure({
  icon,
  label,
  body,
}: {
  icon: ReactNode;
  label: string;
  body: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full bg-parchment/70 px-2.5 py-1 text-[10.5px] font-bold text-fawn transition hover:text-ink"
        aria-expanded={open}
      >
        {icon}
        {label}
        <ChevronIcon className={`transition-transform ${open ? 'rotate-90' : ''}`} width={11} height={11} />
      </button>
      {open && (
        <p className="mt-1.5 whitespace-pre-line rounded-blob bg-parchment/60 px-3 py-2 text-[11.5px] font-medium leading-relaxed text-ink/70">
          {body}
        </p>
      )}
    </div>
  );
}

function shortModel(model: string): string {
  const parts = model.split('/');
  const name = parts[parts.length - 1] || model;
  return name.length > 28 ? `${name.slice(0, 26)}…` : name;
}

function SettingsCard({
  initialKey,
  initialModel,
  serverAI,
  onSave,
  onCancel,
}: {
  initialKey: string;
  initialModel: string;
  serverAI: ServerAIStatus | null;
  onSave: (key: string, model: string) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState(initialKey);
  const [model, setModel] = useState(initialModel);
  const serverReady = !!serverAI?.configured;

  return (
    <div className="mt-3 rounded-blob border border-ink/[0.07] bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[13px] font-extrabold">
        <KeyIcon className="text-lavdeep" /> AI settings
      </div>
      {serverReady ? (
        <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-fawn">
          Server is already using{' '}
          <span className="text-ink">{serverAI?.provider === 'requesty' ? 'Requesty' : 'NVIDIA'}</span>
          {' · '}
          <span className="text-ink">{serverAI?.model || DEFAULT_MODEL}</span>.
          Leave the key empty to keep that. Optional: paste a temporary session override below.
        </p>
      ) : (
        <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-fawn">
          No server AI key is configured. Paste a Requesty key for this browser session only —
          it is never saved on the server.
        </p>
      )}
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder={serverReady ? 'Optional override (rqsty-…)' : 'rqsty-…'}
        className="mt-2.5 w-full rounded-full bg-parchment px-4 py-2 text-[12px] font-semibold shadow-inner1 outline-none placeholder:text-fawn/60 dark:bg-shell/60"
        aria-label="Requesty API key override"
      />
      <input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder={serverAI?.model || DEFAULT_MODEL}
        className="mt-2 w-full rounded-full bg-parchment px-4 py-2 text-[12px] font-semibold shadow-inner1 outline-none placeholder:text-fawn/60 dark:bg-shell/60"
        aria-label="Model"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="pressable rounded-full px-3 py-1.5 text-[11.5px] font-bold text-fawn hover:text-ink">
          Cancel
        </button>
        <button
          onClick={() => onSave(key, model)}
          className="pressable rounded-full bg-lavdeep px-4 py-1.5 text-[11.5px] font-extrabold text-white shadow-soft"
        >
          Save
        </button>
      </div>
    </div>
  );
}
