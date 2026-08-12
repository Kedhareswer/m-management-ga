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
  reading: 'bg-leaf/15 text-leaf',
  paused: 'bg-sun/20 text-[#a8752a]',
  completed: 'bg-lavdeep/15 text-lavdeep',
  'plan-to-read': 'bg-sky/12 text-sky',
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
      className="group flex w-full flex-col rounded-blob border border-ink/[0.1] bg-card p-3 shadow-soft transition-[box-shadow,transform,border-color] duration-200 hover:border-lavdeep/30 hover:shadow-lift"
      style={{ transitionTimingFunction: 'var(--ease-out)' }}
    >
      <div className="relative">
        <button
          onClick={() => onOpen(series.id)}
          title={`${series.title} — details`}
          className="block w-full transition-transform duration-200 motion-safe:group-hover:-translate-y-1 motion-safe:group-hover:rotate-[0.5deg]"
          style={{ transitionTimingFunction: 'var(--ease-out)' }}
        >
          <BookCover series={series} className="h-[180px] w-full" />
        </button>
        <button
          onClick={(e) => {
            e.preventDefault();
            onToggleFavorite(series.id, !series.favorite);
          }}
          className={`pressable absolute left-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full shadow-soft ${
            series.favorite ? 'bg-sun text-on-cta' : 'bg-card/90 text-fawn hover:text-sun'
          }`}
          title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={series.favorite}
          aria-label={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-1">
        <button className="min-w-0 text-left" onClick={() => onOpen(series.id)} title={`${series.title} — details`}>
          <h3 className="truncate text-[14px] font-bold leading-tight tracking-tight">
            {series.title}
          </h3>
          <p className="truncate text-[11px] font-semibold text-tomato/80">
            {series.author || series.siteName}
          </p>
        </button>
        <button
          onClick={() => onDelete(series.id)}
          className="pressable mt-0.5 shrink-0 text-fawn/70 hover:text-tomato"
          title="Remove from shelf"
          aria-label={`Remove ${series.title}`}
        >
          <TrashIcon />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${STATUS_TINT[series.status]}`}>
          {STATUS_LABEL[series.status]}
        </span>
        {series.genres.slice(0, 2).map((g) => (
          <span key={g} className="rounded-full bg-peach/50 px-2 py-0.5 text-[10px] font-bold text-ink/65">
            {g}
          </span>
        ))}
      </div>

      {progress !== null && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-ink/[0.07] shadow-inner1">
          <div
            className="h-full rounded-full bg-leaf transition-[width] duration-200"
            style={{ width: `${progress}%`, transitionTimingFunction: 'var(--ease-out)' }}
          />
        </div>
      )}

      <div className="mt-3 flex items-center justify-between rounded-xl bg-parchment px-2 py-1.5 shadow-inner1 dark:bg-shell/60">
        <button
          className="pressable grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft hover:text-tomato"
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
            className="w-14 rounded-md bg-card text-center text-[13px] font-bold outline-none ring-2 ring-lavdeep/40"
            inputMode="decimal"
            aria-label="Chapter number"
          />
        ) : (
          <button
            onClick={() => {
              setDraft(String(series.currentChapter));
              setEditing(true);
            }}
            className="pressable text-[13px] font-bold tracking-wide"
            title="Click to type a chapter number"
          >
            ch. {series.currentChapter}
            {series.totalChapters ? <span className="text-fawn"> / {series.totalChapters}</span> : null}
          </button>
        )}
        <button
          className="pressable grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft hover:text-leaf"
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
        className="pressable mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-xl bg-cta py-2 text-[12px] font-bold text-on-cta shadow-soft hover:opacity-90 hover:shadow-lift"
      >
        Continue <ExternalIcon />
      </button>
    </article>
  );
}
