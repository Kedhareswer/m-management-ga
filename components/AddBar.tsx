'use client';

import { useEffect, useRef } from 'react';
import { SearchIcon, StackIcon, PlusIcon, ChatIcon } from './icons';

/**
 * The top bar. Search is single-purpose (filters your shelf as you
 * type) — adding a series has its own explicit "+ add" button that opens
 * a dedicated dialog. Supports ⌘K / / keyboard shortcuts to focus search.
 */
export default function AddBar({
  query,
  onQuery,
  onOpenAdd,
  readingCount,
  chatOpen,
  onToggleChat,
}: {
  query: string;
  onQuery: (q: string) => void;
  onOpenAdd: () => void;
  readingCount: number;
  chatOpen: boolean;
  onToggleChat: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' || ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div data-intro="addbar" className="flex items-center gap-2 md:gap-3">
      <div className="flex h-[48px] min-w-0 flex-1 items-center gap-3 rounded-full bg-card px-4 shadow-soft transition-all focus-within:ring-2 focus-within:ring-lavdeep/40 md:h-[52px] md:px-5">
        <SearchIcon className="shrink-0 text-fawn" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your shelf… (⌘K)"
          className="w-full min-w-0 bg-transparent text-[14px] font-semibold outline-none placeholder:text-fawn/80"
          aria-label="Search your shelf"
        />
        <kbd className="hidden shrink-0 rounded-md bg-parchment px-2 py-0.5 text-[10px] font-extrabold text-fawn shadow-inner1 sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <button
        onClick={onOpenAdd}
        className="flex h-[48px] shrink-0 items-center gap-2 rounded-full px-4 text-[14px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 md:h-[52px] md:px-6"
        style={{ background: 'linear-gradient(90deg, #f2b64c 0%, #7fb69a 45%, #8f7fd4 100%)' }}
        title="Add a manga, comic or graphic novel by link"
      >
        <PlusIcon /> <span className="hidden sm:inline">add</span>
      </button>

      {/* reading pile counter — desktop only */}
      <div
        className="relative hidden h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-card text-ink shadow-soft sm:grid"
        title="Series in progress"
      >
        <StackIcon />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[10px] font-extrabold text-white shadow-soft">
          {readingCount}
        </span>
      </div>

      <button
        onClick={onToggleChat}
        className={`icon-btn !h-[48px] !w-[48px] shrink-0 md:!h-[52px] md:!w-[52px] ${chatOpen ? '!text-lavdeep ring-2 ring-lavdeep/25' : ''}`}
        title={chatOpen ? 'Hide Mango (chat)' : 'Show Mango (chat)'}
        aria-pressed={chatOpen}
        aria-label="Toggle chat"
      >
        <ChatIcon />
      </button>
    </div>
  );
}

