'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Series } from '@/lib/types';
import type { BotReply } from '@/lib/bot';
import { fetchJson } from '@/lib/fetchJson';
import BookCover from './BookCover';
import { SendIcon, ChevronIcon, CloseIcon, GearIcon, KeyIcon, TrashIcon } from './icons';

interface Message {
  id: number;
  from: 'user' | 'bot';
  text: string;
  series?: Series[];
  link?: { href: string; label: string };
}

let nextId = 1;

const DEFAULT_MODEL = 'google/gemma-4-31b-it';

const OPENERS: Omit<Message, 'id'>[] = [
  { from: 'bot', text: 'Good day! 🍊' },
  {
    from: 'bot',
    text: "I'm Mango, your shelf keeper. Ask me “what am I reading?” or tell me “update One Piece to chapter 1100” and I'll move your bookmark. Add a Requesty key in ⚙ settings and I get a real brain!",
  },
];

export default function ChatPanel({
  onLibraryChange,
  onClose,
}: {
  onLibraryChange: () => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState(DEFAULT_MODEL);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Session-based key: lives in sessionStorage only, pasted once per session.
  useEffect(() => {
    setAiKey(sessionStorage.getItem('requesty-key') || '');
    setAiModel(sessionStorage.getItem('requesty-model') || DEFAULT_MODEL);
  }, []);

  const saveSettings = useCallback((key: string, model: string) => {
    sessionStorage.setItem('requesty-key', key.trim());
    sessionStorage.setItem('requesty-model', model.trim() || DEFAULT_MODEL);
    setAiKey(key.trim());
    setAiModel(model.trim() || DEFAULT_MODEL);
    setSettingsOpen(false);
  }, []);

  // Restore the persisted conversation (Mango's memory) on mount.
  useEffect(() => {
    (async () => {
      const res = await fetchJson<{ messages?: { from: 'user' | 'bot'; text: string }[] }>(
        '/api/chat',
        { cache: 'no-store' }
      );
      const restored: Message[] = (res.data?.messages || []).map((m) => ({
        id: nextId++,
        from: m.from,
        text: m.text,
      }));
      setMessages(restored.length > 0 ? restored : OPENERS.map((m) => ({ ...m, id: nextId++ })));
    })();
  }, []);

  // Animate each new bubble in with a soft pop.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const last = el.querySelector('[data-bubble]:last-of-type');
    if (last) {
      gsap.fromTo(
        last,
        { y: 14, scale: 0.92, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2)' }
      );
    }
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    setMessages((m) => [...m, { id: nextId++, from: 'user', text }]);
    setThinking(true);
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (aiKey) {
        headers['x-ai-key'] = aiKey;
        headers['x-ai-model'] = aiModel;
      }
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
        { id: nextId++, from: 'bot', text: reply.text, series: reply.series, link: reply.link },
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

  return (
    <aside data-intro="chat" className="relative flex w-[320px] shrink-0 flex-col rounded-panel bg-[#efe6d5] p-5 shadow-inner1">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-extrabold">Chat</h2>
          <p className="text-[10px] font-bold text-fawn" title={aiKey ? `Model: ${aiModel} via Requesty` : 'No API key — using the built-in rules brain'}>
            {aiKey ? `🧠 ${aiModel.split('/').pop()} · Requesty` : '📏 built-in rules · no key'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSettingsOpen((v) => !v)}
            className={`icon-btn !h-8 !w-8 ${settingsOpen ? '!text-lavdeep ring-2 ring-lavdeep/25' : ''}`}
            title="AI settings (Requesty key & model)"
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
          onSave={saveSettings}
          onCancel={() => setSettingsOpen(false)}
        />
      )}

      <button className="mt-4 flex items-center gap-3 rounded-blob bg-card px-4 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
        <div>
          <div className="text-[13px] font-extrabold">Privacy and Support</div>
          <div className="text-[11px] font-semibold text-fawn">
            Key lives only in this browser session
          </div>
        </div>
        <ChevronIcon className="ml-auto shrink-0 text-fawn" />
      </button>

      <div
        ref={scrollRef}
        data-lenis-prevent
        className="mt-4 flex flex-1 flex-col gap-2.5 overflow-y-auto pr-1"
      >
        {messages.map((m) => (
          <div key={m.id} data-bubble className={m.from === 'bot' ? 'bubble-bot' : 'bubble-user'}>
            <p className="whitespace-pre-line">{m.text}</p>

            {m.series && m.series.length > 0 && (
              <div className="mt-2.5 flex gap-2">
                {m.series.map((s) => (
                  <a
                    key={s.id}
                    href={`/go/${s.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-[72px] shrink-0 transition hover:-translate-y-1"
                    title={`${s.title} — continue at ch. ${s.currentChapter}`}
                  >
                    <BookCover series={s} className="h-[92px] w-full" />
                    <div className="mt-2 truncate text-center text-[9px] font-bold text-fawn">
                      ch. {s.currentChapter}
                    </div>
                  </a>
                ))}
              </div>
            )}

            {m.link && (
              <a
                href={m.link.href}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-full bg-lavdeep px-3.5 py-1.5 text-[11px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
              >
                {m.link.label} →
              </a>
            )}
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
        <div className="flex h-11 flex-1 items-center rounded-full bg-card px-4 shadow-soft">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Write a message…"
            className="w-full bg-transparent text-[13px] font-semibold outline-none placeholder:text-fawn/80"
            aria-label="Chat message"
          />
        </div>
        <button
          onClick={send}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-tomato text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
          title="Send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </aside>
  );
}

function SettingsCard({
  initialKey,
  initialModel,
  onSave,
  onCancel,
}: {
  initialKey: string;
  initialModel: string;
  onSave: (key: string, model: string) => void;
  onCancel: () => void;
}) {
  const [key, setKey] = useState(initialKey);
  const [model, setModel] = useState(initialModel);

  return (
    <div className="mt-3 rounded-blob bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-[13px] font-extrabold">
        <KeyIcon className="text-lavdeep" /> Requesty (session only)
      </div>
      <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-fawn">
        Paste your Requesty API key — it stays in this browser session and is
        never saved on the server. Leave empty to use the built-in rules brain.
      </p>
      <input
        type="password"
        value={key}
        onChange={(e) => setKey(e.target.value)}
        placeholder="sk-…"
        className="mt-2.5 w-full rounded-full bg-parchment px-4 py-2 text-[12px] font-semibold shadow-inner1 outline-none placeholder:text-fawn/60"
        aria-label="Requesty API key"
      />
      <input
        value={model}
        onChange={(e) => setModel(e.target.value)}
        placeholder={DEFAULT_MODEL}
        className="mt-2 w-full rounded-full bg-parchment px-4 py-2 text-[12px] font-semibold shadow-inner1 outline-none placeholder:text-fawn/60"
        aria-label="Model"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-full px-3 py-1.5 text-[11.5px] font-bold text-fawn transition hover:text-ink">
          cancel
        </button>
        <button
          onClick={() => onSave(key, model)}
          className="rounded-full bg-lavdeep px-4 py-1.5 text-[11.5px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5"
        >
          save
        </button>
      </div>
    </div>
  );
}
