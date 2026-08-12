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
    <div data-intro="addbar" className="flex items-center gap-2 md:gap-2.5">
      <div
        className="flex h-[46px] min-w-0 flex-1 items-center gap-3 rounded-full border border-ink/[0.1] bg-card px-4 shadow-soft transition-[box-shadow,border-color] duration-200 focus-within:border-lavdeep/40 focus-within:shadow-ring md:h-[50px] md:px-5"
        style={{ transitionTimingFunction: 'var(--ease-out)' }}
      >
        <SearchIcon className="shrink-0 text-fawn" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your shelf…"
          className="w-full min-w-0 bg-transparent text-[14px] font-medium outline-none placeholder:text-fawn/70"
          aria-label="Search your shelf"
        />
        <kbd className="hidden shrink-0 rounded-md bg-parchment px-2 py-0.5 text-[10px] font-extrabold text-fawn shadow-inner1 sm:inline-block">
          ⌘K
        </kbd>
      </div>

      <button
        onClick={onOpenAdd}
        className="pressable flex h-[46px] shrink-0 items-center gap-2 rounded-full bg-cta px-4 text-[13px] font-extrabold text-on-cta shadow-soft hover:opacity-90 hover:shadow-lift md:h-[50px] md:px-5"
        title="Add a manga, comic or graphic novel by link"
      >
        <PlusIcon /> <span className="hidden sm:inline">Add</span>
      </button>

      {/* reading pile counter — desktop only */}
      <div
        className="relative hidden h-[50px] w-[50px] shrink-0 place-items-center rounded-full bg-card text-ink shadow-soft sm:grid"
        title="Series in progress"
      >
        <StackIcon />
        <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[10px] font-extrabold text-white shadow-soft">
          {readingCount}
        </span>
      </div>

      <button
        onClick={onToggleChat}
        className={`icon-btn !h-[46px] !w-[46px] shrink-0 md:!h-[50px] md:!w-[50px] ${chatOpen ? '!text-lavdeep ring-2 ring-lavdeep/25' : ''}`}
        title={chatOpen ? 'Hide Mango (chat)' : 'Show Mango (chat)'}
        aria-pressed={chatOpen}
        aria-label="Toggle chat"
      >
        <ChatIcon />
      </button>
    </div>
  );
}

