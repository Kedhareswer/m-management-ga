'use client';

import { useState } from 'react';
import type { Series } from '@/lib/types';
import BookCover from './BookCover';
import { MinusIcon, PlusIcon, TrashIcon, ExternalIcon, StarIcon } from './icons';

const STATUS_LABEL: Record<Series['status'], string> = {
  reading: 'Reading',
  paused: 'Paused',
  completed: 'Finished',
  'plan-to-read': 'Up next',
};

const STATUS_TINT: Record<Series['status'], string> = {
  reading: 'bg-leaf/20 text-leaf',
  paused: 'bg-sun/25 text-[#a8752a]',
  completed: 'bg-lavdeep/20 text-lavdeep',
  'plan-to-read': 'bg-sky/15 text-sky',
};

export default function MangaCard({
  series,
  onChapterChange,
  onToggleFavorite,
  onDelete,
  onOpen,
  onOpenReader,
}: {
  series: Series;
  onChapterChange: (id: string, chapter: number) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenReader?: (series: Series) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(series.currentChapter));

  const commitDraft = () => {
    const n = parseFloat(draft);
    if (!Number.isNaN(n) && n !== series.currentChapter) onChapterChange(series.id, n);
    setEditing(false);
  };

  const progress =
    series.totalChapters && series.totalChapters > 0
      ? Math.min(100, (series.currentChapter / series.totalChapters) * 100)
      : null;

  return (
    <article
      data-shelf-card
      className="group flex w-full flex-col rounded-blob bg-card p-4 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
    >
      {/* Cover opens the detail view; "Continue reading" jumps to the chapter */}
      <div className="relative">
        <button
          onClick={() => onOpen(series.id)}
          title={`${series.title} — details`}
          className="block w-full transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-[-1.5deg]"
        >
          <BookCover series={series} className="h-[190px] w-full" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(series.id, !series.favorite);
          }}
          className={`absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full shadow-soft transition active:scale-90 ${
            series.favorite ? 'bg-sun text-white' : 'bg-card/90 text-fawn hover:text-sun'
          }`}
          title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={series.favorite}
          aria-label={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="mt-5 flex items-start justify-between gap-1">
        <button className="min-w-0 text-left" onClick={() => onOpen(series.id)} title={`${series.title} — details`}>
          <h3 className="truncate text-[15px] font-bold leading-tight">
            {series.title}
          </h3>
          <p className="truncate text-[11px] font-semibold text-tomato/80">
            {series.author || series.siteName}
          </p>
        </button>
        <button
          onClick={() => onDelete(series.id)}
          className="mt-0.5 hidden shrink-0 text-fawn transition hover:text-tomato group-hover:block"
          title="Remove from shelf"
          aria-label={`Remove ${series.title}`}
        >
          <TrashIcon />
        </button>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TINT[series.status]}`}>
          {STATUS_LABEL[series.status]}
        </span>
        {series.genres.slice(0, 2).map((g) => (
          <span key={g} className="rounded-full bg-peach/60 px-2 py-0.5 text-[10px] font-bold text-ink/70">
            {g}
          </span>
        ))}
      </div>

      {progress !== null && (
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-parchment shadow-inner1">
          <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {/* chapter stepper */}
      <div className="mt-3 flex items-center justify-between rounded-2xl bg-parchment px-2 py-1.5 shadow-inner1">
        <button
          className="grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-tomato active:scale-90"
          onClick={() => onChapterChange(series.id, Math.max(0, series.currentChapter - 1))}
          aria-label="Previous chapter"
        >
          <MinusIcon />
        </button>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => e.key === 'Enter' && commitDraft()}
            className="w-14 rounded-lg bg-card text-center text-[13px] font-bold outline-none ring-2 ring-lavdeep/50"
            inputMode="decimal"
            aria-label="Chapter number"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(String(series.currentChapter));
              setEditing(true);
            }}
            className="text-[13px] font-bold tracking-wide"
            title="Click to type a chapter number"
          >
            ch. {series.currentChapter}
            {series.totalChapters ? <span className="text-fawn"> / {series.totalChapters}</span> : null}
          </button>
        )}
        <button
          className="grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-leaf active:scale-90"
          onClick={() => onChapterChange(series.id, series.currentChapter + 1)}
          aria-label="Next chapter"
        >
          <PlusIcon />
        </button>
      </div>

      <button
        onClick={() => {
          if (onOpenReader) {
            onOpenReader(series);
          } else {
            window.open(`/go/${series.id}`, '_blank');
          }
        }}
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-2xl bg-lavdeep py-2 text-[12px] font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift active:translate-y-0"
      >
        Continue reading <ExternalIcon />
      </button>
    </article>
  );
}
