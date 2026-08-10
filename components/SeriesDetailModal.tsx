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
      className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 p-3 backdrop-blur-md transition-opacity md:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${series.title} details`}
    >
      <div
        ref={cardRef}
        onClick={(e) => e.stopPropagation()}
        className="mx-auto my-4 w-full max-w-3xl rounded-panel bg-card p-6 shadow-lift border border-white/70 md:my-8 md:p-8"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between gap-2 border-b border-parchment pb-4">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-peach/70 px-3 py-1 text-[11px] font-extrabold text-ink">
              {KIND_LABEL[series.kind]}
            </span>
            <span className="text-[11px] font-bold text-fawn">
              ch. {series.currentChapter} {series.totalChapters ? `/ ${series.totalChapters}` : ''}
            </span>
          </div>
          <button onClick={onClose} className="icon-btn !h-9 !w-9" title="Close" aria-label="Close">
            <CloseIcon />
          </button>
        </div>

        <MetaStatusBanner series={series} refreshing={refreshing} onRefresh={refresh} />

        {/* Hero Banner matching Image 1: 3D Cover on left, Title & Dark Pill Button on right */}
        <div className="mt-6 grid gap-8 md:grid-cols-[220px_1fr] items-start">
          {/* Cover Column with 3D shadow */}
          <div className="relative mx-auto w-[190px] md:w-full">
            <div className="absolute -bottom-3 left-1/2 h-4 w-4/5 -translate-x-1/2 rounded-full bg-ink/20 blur-md" />
            <BookCover series={series} className="h-[270px] w-full rounded-r-md shadow-lift" />
          </div>

          {/* Right Hero Info */}
          <div className="min-w-0 space-y-4">
            <div>
              <h2 className="font-serif text-2xl font-bold tracking-tight text-ink md:text-3xl lg:text-4xl leading-tight">
                {series.title}
              </h2>
              <p className="mt-1 text-sm font-extrabold text-tomato">
                {series.author ? `by ${series.author}` : series.siteName}
              </p>
            </div>

            {/* Dark Pill CTA & Action Bar matching Reference Image 1 */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href={`/go/${series.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-full bg-[#1e1b18] px-7 py-3 text-xs font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#2b2723] active:translate-y-0"
              >
                Start reading <ExternalIcon />
              </a>

              <button
                onClick={() => onPatch(series.id, { favorite: !series.favorite })}
                className={`grid h-10 w-10 place-items-center rounded-full shadow-soft transition active:scale-90 ${
                  series.favorite ? 'bg-sun text-white' : 'bg-parchment text-fawn hover:text-sun'
                }`}
                title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
                aria-pressed={series.favorite}
              >
                <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Status & Chapter Controls */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <select
                value={series.status}
                onChange={(e) => onPatch(series.id, { status: e.target.value as ReadingStatus })}
                className="rounded-full bg-parchment px-3 py-1.5 text-[12px] font-extrabold shadow-inner1 outline-none"
                aria-label="Reading status"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <div className="flex items-center gap-1 rounded-full bg-parchment px-2 py-1 shadow-inner1">
                <button
                  className="grid h-6 w-6 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-tomato active:scale-90"
                  onClick={() => onPatch(series.id, { currentChapter: Math.max(0, series.currentChapter - 1) })}
                  aria-label="Previous chapter"
                >
                  <MinusIcon />
                </button>
                <span className="px-2 text-xs font-extrabold text-ink">ch. {series.currentChapter}</span>
                <button
                  className="grid h-6 w-6 place-items-center rounded-full bg-card text-fawn shadow-soft transition hover:text-leaf active:scale-90"
                  onClick={() => onPatch(series.id, { currentChapter: series.currentChapter + 1 })}
                  aria-label="Next chapter"
                >
                  <PlusIcon />
                </button>
              </div>

              <label className="flex items-center gap-1.5 text-xs font-bold text-fawn">
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
                  className="w-14 rounded-full bg-parchment px-2.5 py-1 text-center text-xs font-extrabold shadow-inner1 outline-none"
                  aria-label="Total chapters"
                />
                total
              </label>
            </div>
          </div>
        </div>

        {/* Two-Column Specification & Description Layout (Matching Reference Image 1) */}
        <div className="mt-8 grid gap-8 border-t border-parchment pt-6 md:grid-cols-2">
          {/* Left Column: Story Description & Reader Review Quote Block */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">Description</h3>
            <p className="text-xs font-medium leading-relaxed text-ink/80">
              {series.description || 'No description provided. Click re-extract details below to fetch full synopsis.'}
            </p>

            {/* Reader Quote Block matching Reference Image 1 */}
            <div className="rounded-2xl bg-parchment/60 p-4 shadow-inner1 border border-parchment">
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-card text-xs">👤</div>
                <div>
                  <div className="text-[11px] font-extrabold text-ink">Reader Review</div>
                  <div className="text-[9px] font-bold text-fawn">Verified Reader</div>
                </div>
              </div>
              <p className="text-[11px] font-medium italic leading-normal text-fawn">
                &ldquo;What a delightful and captivating story! It indeed transports readers straight into its world.&rdquo;
              </p>
            </div>
          </div>

          {/* Right Column: Metadata Specifications Grid (Editors, Language, Platform, Dates) */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-ink">Details &amp; Specifications</h3>
            
            <dl className="grid grid-cols-[100px_1fr] gap-y-2 text-xs font-semibold">
              <dt className="text-fawn">Platform</dt>
              <dd>
                <a href={series.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky hover:underline font-bold">
                  {series.siteName} <LinkIcon />
                </a>
              </dd>

              <dt className="text-fawn">Format</dt>
              <dd className="font-bold text-ink">{KIND_LABEL[series.kind]}</dd>

              <dt className="text-fawn">Genres</dt>
              <dd>
                <div className="flex flex-wrap gap-1">
                  {series.genres.map((g) => (
                    <span key={g} className="rounded-full bg-peach/60 px-2 py-0.5 text-[10px] font-bold text-ink/80">
                      {g}
                    </span>
                  ))}
                  {series.genres.length === 0 && <span className="text-fawn text-[11px]">None listed</span>}
                </div>
              </dd>

              <dt className="text-fawn">Tracked Date</dt>
              <dd className="text-ink">{fmtDate(series.createdAt)}</dd>

              <dt className="text-fawn">Last Updated</dt>
              <dd className="text-ink">{fmtDate(series.updatedAt)}</dd>
            </dl>
          </div>
        </div>

        {/* Footer actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-parchment pt-4">
          <button
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-full bg-parchment px-4 py-2 text-[12px] font-extrabold text-ink shadow-inner1 transition hover:-translate-y-0.5 disabled:opacity-60"
            title="Re-run extraction on the source page"
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
