'use client';

import { useState } from 'react';
import { GridIcon, StarIcon, HeartIcon, PlayIcon, BookmarkIcon, BellIcon } from './icons';

import type { Series } from '@/lib/types';
import BookCover from './BookCover';

export type NavFilter = 'all' | 'favorites' | 'completed' | 'reading' | 'plan-to-read';

const NAV: { id: NavFilter; icon: typeof GridIcon; label: string }[] = [
  { id: 'all', icon: GridIcon, label: 'Shelf' },
  { id: 'favorites', icon: StarIcon, label: 'Favourites' },
  { id: 'completed', icon: HeartIcon, label: 'Finished' },
  { id: 'reading', icon: PlayIcon, label: 'Reading' },
  { id: 'plan-to-read', icon: BookmarkIcon, label: 'Up next' },
];

export default function Sidebar({
  active,
  onPick,
  currentSeries,
  onOpenReader,
}: {
  active: NavFilter;
  onPick: (id: NavFilter) => void;
  currentSeries?: Series | null;
  onOpenReader?: (series: Series) => void;
}) {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <>
      {/* vertical rail — tablet & desktop */}
      <aside
        className="relative hidden w-[96px] shrink-0 flex-col items-center py-6 md:flex"
        data-intro="sidebar"
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-card shadow-soft" title="You">
          <span className="text-2xl" role="img" aria-label="reader avatar">🍊</span>
        </div>

        <nav className="mt-8 flex flex-col gap-3">
          {NAV.map(({ id, icon: Icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className={`icon-btn ${isActive ? '!text-tomato ring-2 ring-tomato/20' : ''}`}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
              >
                <Icon fill={id === 'favorites' && isActive ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto flex flex-col items-center gap-3 w-full px-1">
          {/* "Currently reading" Mini Card Widget matching Reference Image 2 (bottom left) */}
          {currentSeries && (
            <button
              onClick={() => onOpenReader?.(currentSeries)}
              className="group relative flex w-full flex-col items-center rounded-2xl bg-card p-2 shadow-soft transition hover:-translate-y-1 hover:shadow-lift"
              title={`Continue reading ${currentSeries.title}`}
            >
              <div className="text-[9px] font-extrabold text-tomato uppercase tracking-wider mb-1">
                Reading
              </div>
              <BookCover series={currentSeries} className="h-16 w-11 rounded shadow-sm group-hover:scale-105 transition-transform" />
              <div className="mt-1 max-w-full truncate text-[10px] font-bold text-ink text-center">
                ch. {currentSeries.currentChapter}
              </div>
            </button>
          )}

          <button
            className="icon-btn !bg-sky !text-white"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => {
              setToast("You're all caught up! 🎉");
              setTimeout(() => setToast(null), 2500);
            }}
          >
            <BellIcon />
          </button>
          {toast && (
            <div className="absolute bottom-14 left-1/2 w-max -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 text-[11px] font-bold text-parchment shadow-lift">
              {toast}
            </div>
          )}
        </div>
      </aside>

      {/* floating bottom bar — phones */}
      <nav
        className="fixed bottom-3 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-card px-3 py-2 shadow-lift md:hidden"
        aria-label="Shelf filters"
      >
        {NAV.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className={`grid h-11 w-11 place-items-center rounded-full transition active:scale-90 ${
                isActive ? 'bg-tomato text-white shadow-soft' : 'text-fawn hover:text-ink'
              }`}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
            >
              <Icon fill={id === 'favorites' && isActive ? 'currentColor' : 'none'} />
            </button>
          );
        })}
      </nav>
    </>
  );
}
