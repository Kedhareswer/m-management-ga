'use client';

import { useState } from 'react';
import { SearchIcon, LinkIcon, StackIcon, SparkleIcon } from './icons';

/**
 * The top bar from the reference design. One input, two moods:
 * type words → it filters your shelf; paste a link → the gradient
 * button flips to "add to shelf" and auto-extracts everything.
 */
export default function AddBar({
  query,
  onQuery,
  onAdd,
  adding,
  readingCount,
}: {
  query: string;
  onQuery: (q: string) => void;
  onAdd: (url: string) => Promise<void>;
  adding: boolean;
  readingCount: number;
}) {
  const [flash, setFlash] = useState<string | null>(null);
  const isUrl = /^https?:\/\/\S+$/i.test(query.trim());

  const submit = async () => {
    if (!isUrl || adding) return;
    try {
      await onAdd(query.trim());
      onQuery('');
      setFlash('Filed on your shelf! 🔖');
    } catch (e) {
      setFlash(e instanceof Error ? e.message : 'Could not add that link 😢');
    }
    setTimeout(() => setFlash(null), 3500);
  };

  return (
    <div data-intro="addbar" className="relative flex items-center gap-3">
      <div className="flex h-[52px] flex-1 items-center gap-3 rounded-full bg-card px-5 shadow-soft">
        {isUrl ? <LinkIcon className="shrink-0 text-lavdeep" /> : <SearchIcon className="shrink-0 text-fawn" />}
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Search your shelf, or paste a manga link to add it…"
          className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-fawn/80"
          aria-label="Search or paste link"
        />
      </div>

      <button
        onClick={submit}
        disabled={adding || (!isUrl && query.length > 0)}
        className="flex h-[52px] items-center gap-2 rounded-full px-7 text-[14px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0 disabled:cursor-default disabled:opacity-80"
        style={{
          background: 'linear-gradient(90deg, #f2b64c 0%, #7fb69a 45%, #8f7fd4 100%)',
        }}
        title={isUrl ? 'Extract details & add to shelf' : 'Paste a link to add a series'}
      >
        {adding ? (
          <>
            <SparkleIcon className="animate-spin" /> extracting…
          </>
        ) : isUrl ? (
          <>
            <SparkleIcon /> add to shelf
          </>
        ) : (
          'search'
        )}
      </button>

      {/* reading pile counter, standing in for the basket in the reference */}
      <div className="relative grid h-[52px] w-[52px] shrink-0 place-items-center rounded-full bg-card text-ink shadow-soft" title="Series in progress">
        <StackIcon />
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[10px] font-extrabold text-white shadow-soft">
          {readingCount}
        </span>
      </div>

      {flash && (
        <div className="absolute -bottom-9 left-5 rounded-full bg-ink px-4 py-1.5 text-[12px] font-bold text-parchment shadow-lift">
          {flash}
        </div>
      )}
    </div>
  );
}
