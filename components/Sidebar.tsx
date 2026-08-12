'use client';

import { useState } from 'react';
import { GridIcon, StarIcon, HeartIcon, PlayIcon, BookmarkIcon, BellIcon } from './icons';
import ThemeToggle from './ThemeToggle';

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
      <aside
        className="relative hidden w-[92px] shrink-0 flex-col items-center py-5 md:flex"
        data-intro="sidebar"
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-card shadow-soft" title="You">
          <span className="text-2xl" role="img" aria-label="reader avatar">🍊</span>
        </div>

        <nav className="mt-8 flex flex-col gap-2">
          {NAV.map(({ id, icon: Icon, label }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => onPick(id)}
                className={`icon-btn ${isActive ? '!bg-cta !text-on-cta shadow-lift' : ''}`}
                title={label}
                aria-label={label}
                aria-pressed={isActive}
              >
                <Icon fill={id === 'favorites' && isActive ? 'currentColor' : 'none'} />
              </button>
            );
          })}
        </nav>

        <div className="relative mt-auto flex w-full flex-col items-center gap-2 px-1">
          {currentSeries && (
            <button
              onClick={() => onOpenReader?.(currentSeries)}
              className="group relative flex w-full flex-col items-center rounded-xl bg-card p-2 shadow-soft transition-[box-shadow,transform] duration-150 hover:shadow-lift active:scale-[0.97] motion-safe:hover:-translate-y-0.5"
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
              title={`Continue reading ${currentSeries.title}`}
            >
              <div className="mb-1 text-[9px] font-extrabold uppercase tracking-wider text-tomato">
                Reading
              </div>
              <BookCover
                series={currentSeries}
                className="h-16 w-11 rounded shadow-sm transition-transform duration-200 motion-safe:group-hover:scale-[1.03]"
              />
              <div className="mt-1 max-w-full truncate text-center text-[10px] font-bold text-ink">
                ch. {currentSeries.currentChapter}
              </div>
            </button>
          )}

          <button
            className="icon-btn !bg-sky !text-white"
            title="Notifications"
            aria-label="Notifications"
            onClick={() => {
              setToast("You're all caught up");
              setTimeout(() => setToast(null), 2500);
            }}
          >
            <BellIcon />
          </button>
          <ThemeToggle />
          {toast && (
            <div className="ui-toast absolute bottom-14 left-1/2 w-max -translate-x-1/2 whitespace-nowrap rounded-full bg-cta px-3 py-1.5 text-[11px] font-bold text-on-cta shadow-lift">
              {toast}
            </div>
          )}
        </div>
      </aside>

      <nav
        className="fixed left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-ink/[0.1] bg-card/95 px-2 py-1.5 shadow-lift backdrop-blur-md md:hidden"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        aria-label="Library filters"
      >
        {NAV.map(({ id, icon: Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onPick(id)}
              className={`pressable grid h-10 w-10 place-items-center rounded-full ${
                isActive ? 'bg-cta text-on-cta shadow-soft' : 'text-fawn'
              }`}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
            >
              <Icon fill={id === 'favorites' && isActive ? 'currentColor' : 'none'} />
            </button>
          );
        })}
        <div className="mx-1 h-5 w-px bg-ink/10" />
        <ThemeToggle className="!h-10 !w-10 !shadow-none !bg-transparent" />
      </nav>
    </>
  );
}
