'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Series } from '@/lib/types';
import type { BotReply } from '@/lib/bot';
import BookCover from './BookCover';
import { SendIcon, ClipIcon, ChevronIcon, CloseIcon } from './icons';

interface Message {
  id: number;
  from: 'user' | 'bot';
  text: string;
  series?: Series[];
  link?: { href: string; label: string };
}

let nextId = 1;

const OPENERS: Message[] = [
  { id: nextId++, from: 'bot', text: 'Good day! 🍊' },
  {
    id: nextId++,
    from: 'bot',
    text: "I'm Mango, your shelf keeper. Ask me “what am I reading?” or tell me “update One Piece to chapter 1100” and I'll move your bookmark.",
  },
];

export default function ChatPanel({
  onLibraryChange,
  onClose,
}: {
  onLibraryChange: () => void;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>(OPENERS);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ message: text }),
      });
      const reply: BotReply = await res.json();
      setMessages((m) => [
        ...m,
        { id: nextId++, from: 'bot', text: reply.text, series: reply.series, link: reply.link },
      ]);
      if (reply.action === 'updated-chapter') onLibraryChange();
    } catch {
      setMessages((m) => [
        ...m,
        { id: nextId++, from: 'bot', text: 'My ink spilled — try that again in a second! 🫙' },
      ]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <aside data-intro="chat" className="flex w-[320px] shrink-0 flex-col rounded-panel bg-[#efe6d5] p-5 shadow-inner1">
      <header className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">Chat</h2>
        <button
          onClick={onClose}
          className="icon-btn !h-8 !w-8"
          title="Hide chat"
          aria-label="Hide chat"
        >
          <CloseIcon />
        </button>
      </header>

      <button className="mt-4 flex items-center gap-3 rounded-blob bg-card px-4 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
        <div>
          <div className="text-[13px] font-extrabold">Privacy and Support</div>
          <div className="text-[11px] font-semibold text-fawn">Everything stays on your device</div>
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
        <button className="icon-btn !h-10 !w-10 shrink-0" title="Attach" aria-label="Attach">
          <ClipIcon />
        </button>
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
