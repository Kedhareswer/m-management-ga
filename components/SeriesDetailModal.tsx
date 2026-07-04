'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import type { Series, ReadingStatus } from '@/lib/types';
import BookCover from './BookCover';
import {
  CloseIcon, ExternalIcon, MinusIcon, PlusIcon, SparkleIcon, StarIcon, TrashIcon, LinkIcon,
} from './icons';

const STATUS_OPTIONS: { value: ReadingStatus; label: string }[] = [
  { value: 'reading', label: '📖 Reading' },
  { value: 'paused', label: '⏸ Paused' },
  { value: 'completed', label: '✅ Finished' },
  { value: 'plan-to-read', label: '🔜 Up next' },
];

const KIND_LABEL: Record<Series['kind'], string> = {
  manga: 'Manga',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  comic: 'Comic',
  'graphic-novel': 'Graphic novel',
  webtoon: 'Webtoon',
};

/** A small honesty banner: how good is this series' auto-filled metadata? */
function MetaStatusBanner({
  series,
  refreshing,
  onRefresh,
}: {
  series: Series;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const s = series.metaStatus;
  if (!s || s === 'ok' || s === 'manual') return null;

  const copy: Record<string, { emoji: string; title: string; body: string; tint: string }> = {
    blocked: {
      emoji: '🛡️',
      title: 'The site blocked auto-details',
      body: 'Chapter tracking & “continue reading” work fine — genres, cover and author need a manual touch below. You can retry when the site is calmer.',
      tint: 'bg-sun/15 text-[#a8752a]',
    },
    unreachable: {
      emoji: '📡',
      title: "Couldn't reach the site",
      body: 'Tracking still works from the link. Fill details in below, or retry the extraction.',
      tint: 'bg-tomato/10 text-tomato',
    },
    partial: {
      emoji: '🧩',
      title: 'Only partial details',
      body: 'We got some info but not all. Add the missing genres/author below, or retry the extraction.',
      tint: 'bg-lav/40 text-lavdeep',
    },
  };
  const c = copy[s];
  if (!c) return null;

  return (
    <div className={`mt-4 flex items-start gap-3 rounded-blob p-3.5 ${c.tint}`}>
      <span className="text-lg leading-none">{c.emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-extrabold">{c.title}</div>
        <p className="mt-0.5 text-[11.5px] font-semibold leading-relaxed text-ink/70">{c.body}</p>
      </div>
      <button
        onClick={onRefresh}
        disabled={refreshing}
        className="shrink-0 rounded-full bg-card px-3 py-1.5 text-[11px] font-extrabold text-ink shadow-soft transition hover:-translate-y-0.5 disabled:opacity-60"
      >
        {refreshing ? '…' : 'retry'}
      </button>
    </div>
  );
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * The expanded view of a series — everything we know about it, editable
 * where it makes sense: status, chapter, total chapters, genres. Metadata
 * can be re-extracted from the source page at any time.
 */
export default function SeriesDetailModal({
  series,
  onClose,
  onPatch,
  onDelete,
  onRefreshMeta,
}: {
  series: Series | null;
  onClose: () => void;
  onPatch: (id: string, patch: Partial<Series>) => void;
  onDelete: (id: string) => void;
  onRefreshMeta: (id: string) => Promise<void>;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [genreDraft, setGenreDraft] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!series) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { scale: 0.9, y: 24, opacity: 0 },
        { scale: 1, y: 0, opacity: 1, duration: 0.45, ease: 'back.out(1.6)' }
      );
    }
    return () => window.removeEventListener('keydown', onKey);
    // re-run the pop animation per series opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series?.id]);

  if (!series) return null;

  const addGenre = () => {
    const g = genreDraft.trim();
    if (!g || series.genres.some((x) => x.toLowerCase() === g.toLowerCase())) {
      setGenreDraft('');
      return;
    }
    onPatch(series.id, { genres: [...series.genres, g] });
    setGenreDraft('');
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefreshMeta(series.id);
    } finally {
      setRefreshing(false);
    }
  };

  const progress =
    series.totalChapters && series.totalChapters > 0
      ? Math.min(100, (series.currentChapter / series.totalChapters) * 100)
      : null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-3 backdrop-blur-sm md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${series.title} details`}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-4 w-full max-w-2xl rounded-panel bg-card p-5 shadow-lift md:my-10 md:p-7"
      >
        {/* header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-lav/50 px-3 py-1 text-[11px] font-extrabold text-ink">
              {KIND_LABEL[series.kind]}
            </span>
            <button
              onClick={() => onPatch(series.id, { favorite: !series.favorite })}
              className={`grid h-8 w-8 place-items-center rounded-full transition active:scale-90 ${
                series.favorite ? 'bg-sun text-white shadow-soft' : 'bg-parchment text-fawn hover:text-sun'
              }`}
              title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={series.favorite}
            >
              <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
          <button onClick={onClose} className="icon-btn !h-9 !w-9" title="Close" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <MetaStatusBanner series={series} refreshing={refreshing} onRefresh={refresh} />

        <div className="mt-5 grid gap-6 md:grid-cols-[210px_1fr]">
          {/* cover column */}
          <div className="mx-auto w-[180px] md:w-auto">
            <BookCover series={series} className="h-[260px] w-full md:h-[290px]" />
            <a
              href={`/go/${series.id}`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 flex items-center justify-center gap-1.5 rounded-2xl bg-lavdeep py-2.5 text-[13px] font-bold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              Continue ch. {series.currentChapter} <ExternalIcon />
            </a>
          </div>

          {/* info column */}
          <div className="min-w-0">
            <h2 className="text-[24px] font-extrabold leading-tight">{series.title}</h2>

            <dl className="mt-3 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5 text-[13px] font-semibold">
              <dt className="text-fawn">Author</dt>
              <dd>{series.author || <span className="text-fawn">unknown — try re-extract ↓</span>}</dd>
              <dt className="text-fawn">Platform</dt>
              <dd>
                <a href={series.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky hover:underline">
                  {series.siteName} <LinkIcon />
                </a>
                <span className="ml-1 text-[11px] text-fawn">({series.site})</span>
              </dd>
              <dt className="text-fawn">Started</dt>
              <dd>{fmtDate(series.startedAt || series.createdAt)}</dd>
              <dt className="text-fawn">Finished</dt>
              <dd>{series.status === 'completed' ? fmtDate(series.completedAt) : <span className="text-fawn">still going 🏃</span>}</dd>
              <dt className="text-fawn">Added</dt>
              <dd>{fmtDate(series.createdAt)}</dd>
              <dt className="text-fawn">Updated</dt>
              <dd>{fmtDate(series.updatedAt)}</dd>
            </dl>

            {/* status + chapter controls */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <select
                value={series.status}
                onChange={(e) => onPatch(series.id, { status: e.target.value as ReadingStatus })}
                className="rounded-full bg-parchment px-3 py-2 text-[12.5px] font-bold shadow-inner1 outline-none"
                aria-label="Reading status"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 rounded-full bg-parchment px-2 py-1 shadow-inner1">
                <button
                  className="grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-tomato active:scale-90"
                  onClick={() => onPatch(series.id, { currentChapter: Math.max(0, series.currentChapter - 1) })}
                  aria-label="Previous chapter"
                >
                  <MinusIcon />
                </button>
                <span className="px-1 text-[13px] font-bold">ch. {series.currentChapter}</span>
                <button
                  className="grid h-7 w-7 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-leaf active:scale-90"
                  onClick={() => onPatch(series.id, { currentChapter: series.currentChapter + 1 })}
                  aria-label="Next chapter"
                >
                  <PlusIcon />
                </button>
              </div>

              <label className="flex items-center gap-1.5 text-[12px] font-bold text-fawn">
                of
                <input
                  type="number"
                  min={0}
                  value={series.totalChapters ?? ''}
                  placeholder="?"
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    onPatch(series.id, { totalChapters: Number.isNaN(n) || n <= 0 ? undefined : n });
                  }}
                  className="w-16 rounded-full bg-parchment px-3 py-1.5 text-center text-[12.5px] font-bold shadow-inner1 outline-none"
                  aria-label="Total chapters"
                />
                total
              </label>
            </div>

            {progress !== null && (
              <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-parchment shadow-inner1">
                <div className="h-full rounded-full bg-leaf transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            {/* genres — editable */}
            <div className="mt-4">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-fawn">Genres</div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {series.genres.map((genre) => (
                  <span key={genre} className="group/chip flex items-center gap-1 rounded-full bg-peach/60 px-2.5 py-1 text-[11.5px] font-bold text-ink/80">
                    {genre}
                    <button
                      onClick={() => onPatch(series.id, { genres: series.genres.filter((x) => x !== genre) })}
                      className="text-fawn transition hover:text-tomato"
                      aria-label={`Remove genre ${genre}`}
                    >
                      <CloseIcon width={11} height={11} />
                    </button>
                  </span>
                ))}
                <input
                  value={genreDraft}
                  onChange={(e) => setGenreDraft(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addGenre()}
                  onBlur={addGenre}
                  placeholder="+ add genre"
                  className="w-24 rounded-full bg-parchment px-3 py-1 text-[11.5px] font-bold shadow-inner1 outline-none placeholder:text-fawn/70"
                  aria-label="Add genre"
                />
              </div>
            </div>

            {series.description && (
              <p className="mt-4 text-[13px] font-semibold leading-relaxed text-ink/80">
                {series.description}
              </p>
            )}
          </div>
        </div>

        {/* footer actions */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-parchment pt-4">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full bg-parchment px-4 py-2 text-[12px] font-extrabold text-ink shadow-inner1 transition hover:-translate-y-0.5 disabled:opacity-60"
            title="Re-run extraction on the source page to fill genres, author, cover…"
          >
            <SparkleIcon className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'extracting…' : 're-extract details'}
          </button>
          <button
            onClick={() => {
              onDelete(series.id);
              onClose();
            }}
            className="flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-extrabold text-tomato transition hover:bg-tomato/10"
          >
            <TrashIcon /> remove from shelf
          </button>
        </div>
      </div>
    </div>
  );
}
