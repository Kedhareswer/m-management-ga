'use client';

import { SearchIcon, StackIcon, PlusIcon, ChatIcon } from './icons';

/**
 * The top bar. Search is now single-purpose (filters your shelf as you
 * type) — adding a series has its own explicit "+ add" button that opens
 * a dedicated dialog, so it's discoverable instead of being a hidden second
 * mode of the search field.
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
  return (
    <div data-intro="addbar" className="flex items-center gap-3">
      <div className="flex h-[52px] flex-1 items-center gap-3 rounded-full bg-card px-5 shadow-soft">
        <SearchIcon className="shrink-0 text-fawn" />
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search your shelf by title, author or genre…"
          className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-fawn/80"
          aria-label="Search your shelf"
        />
      </div>

      <button
        onClick={onOpenAdd}
        className="flex h-[52px] shrink-0 items-center gap-2 rounded-full px-6 text-[14px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
        style={{ background: 'linear-gradient(90deg, #f2b64c 0%, #7fb69a 45%, #8f7fd4 100%)' }}
        title="Add a manga, comic or graphic novel by link"
      >
        <PlusIcon /> add
      </button>

      {/* reading pile counter */}
      <div
        className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-card text-ink shadow-soft"
        title="Series in progress"
      >
        <StackIcon />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[10px] font-extrabold text-white shadow-soft">
          {readingCount}
        </span>
      </div>

      <button
        onClick={onToggleChat}
        className={`icon-btn !h-[52px] !w-[52px] shrink-0 ${chatOpen ? '!text-lavdeep ring-2 ring-lavdeep/25' : ''}`}
        title={chatOpen ? 'Hide Mango (chat)' : 'Show Mango (chat)'}
        aria-pressed={chatOpen}
        aria-label="Toggle chat"
      >
        <ChatIcon />
      </button>
    </div>
  );
}
