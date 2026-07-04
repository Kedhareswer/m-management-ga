'use client';

import type { Series } from '@/lib/types';
import { ChevronIcon } from './icons';

/**
 * The bottom banner from the reference design — stacked books illustration,
 * headline, and three little highlight cards on the right.
 */
export default function StatsBanner({ library }: { library: Series[] }) {
  const chapters = library.reduce((n, s) => n + (s.currentChapter || 0), 0);
  const genreCounts = new Map<string, number>();
  for (const s of library) for (const g of s.genres) genreCounts.set(g, (genreCounts.get(g) || 0) + 1);
  const topGenre = [...genreCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const almostDone = library
    .filter((s) => s.totalChapters && s.currentChapter > 0)
    .sort((a, b) => b.currentChapter / b.totalChapters! - a.currentChapter / a.totalChapters!)[0];

  const newest = [...library].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];

  const highlights = [
    {
      title: `Top genre: ${topGenre}`,
      body: `${genreCounts.get(topGenre) ?? 0} series on your shelf wear this tag.`,
      doodle: 'shapes' as const,
    },
    {
      title: almostDone ? `Almost done: ${almostDone.title}` : 'Nothing near the end',
      body: almostDone
        ? `Chapter ${almostDone.currentChapter} of ${almostDone.totalChapters} — the finale is close!`
        : 'Add total chapters to a series to track the finish line.',
      doodle: 'flask' as const,
    },
    {
      title: newest ? `Fresh pick: ${newest.title}` : 'Shelf is empty',
      body: newest ? `Added from ${newest.siteName}. Dive in!` : 'Paste a link above to start.',
      doodle: 'planet' as const,
    },
  ];

  return (
    <section data-intro="banner" className="mt-8 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex items-center gap-6 rounded-panel bg-peach/70 p-5 shadow-soft md:p-7">
        <BookPile />
        <div>
          <h2 className="text-[19px] font-extrabold leading-snug md:text-[22px]">
            {chapters.toLocaleString()} chapters read
            <br /> across {library.length} series
          </h2>
          <p className="mt-1.5 max-w-[280px] text-[12.5px] font-semibold leading-relaxed text-fawn">
            Your bookmarks live here — wherever you wander off to read, MangaShelf remembers the exact chapter.
          </p>
          <button className="mt-4 flex items-center gap-2 rounded-full bg-tomato px-5 py-2.5 text-[13px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
            <EyeGlyph /> view all
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {highlights.map((h) => (
          <button
            key={h.title}
            className="flex items-center gap-4 rounded-blob bg-card px-4 py-3 text-left shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <Doodle kind={h.doodle} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-extrabold">{h.title}</div>
              <div className="truncate text-[11px] font-semibold text-fawn">{h.body}</div>
            </div>
            <ChevronIcon className="shrink-0 text-fawn" />
          </button>
        ))}
      </div>
    </section>
  );
}

function BookPile() {
  const books = [
    { w: 120, c: '#7fb69a' },
    { w: 132, c: '#8f7fd4' },
    { w: 112, c: '#e2574c' },
    { w: 126, c: '#f2b64c' },
    { w: 108, c: '#5a8fd6' },
  ];
  return (
    <div className="hidden shrink-0 flex-col items-center lg:flex animate-float-slow" aria-hidden>
      {books.map((b, i) => (
        <div
          key={i}
          className="h-6 rounded-md shadow-soft"
          style={{
            width: b.w,
            background: b.c,
            transform: `rotate(${i % 2 ? -2 : 2}deg)`,
            marginTop: i === 0 ? 0 : -2,
          }}
        >
          <div className="ml-3 mt-2 h-1.5 w-8 rounded-full bg-white/40" />
        </div>
      ))}
    </div>
  );
}

function Doodle({ kind }: { kind: 'shapes' | 'flask' | 'planet' }) {
  if (kind === 'shapes') {
    return (
      <svg viewBox="0 0 44 44" width="42" height="42" aria-hidden>
        <rect x="4" y="6" width="16" height="16" rx="4" fill="#8f7fd4" />
        <circle cx="31" cy="14" r="8" fill="#f2b64c" />
        <path d="M12 26 22 40H2L12 26Z" fill="#e2574c" />
        <rect x="26" y="28" width="14" height="10" rx="3" fill="#7fb69a" />
      </svg>
    );
  }
  if (kind === 'flask') {
    return (
      <svg viewBox="0 0 44 44" width="42" height="42" aria-hidden>
        <path d="M18 6h8v10l8 16a4 4 0 0 1-4 6H14a4 4 0 0 1-4-6l8-16V6Z" fill="none" stroke="#5a8fd6" strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 30h16" stroke="#e2574c" strokeWidth="3" strokeLinecap="round" />
        <circle cx="22" cy="35" r="2.5" fill="#f2b64c" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 44 44" width="42" height="42" aria-hidden>
      <circle cx="22" cy="22" r="10" fill="#8f7fd4" />
      <ellipse cx="22" cy="22" rx="18" ry="6" fill="none" stroke="#f2b64c" strokeWidth="3" transform="rotate(-18 22 22)" />
      <circle cx="34" cy="10" r="2.5" fill="#e2574c" />
    </svg>
  );
}

function EyeGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" fill="currentColor" />
    </svg>
  );
}
