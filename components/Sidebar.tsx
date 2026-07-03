'use client';

import { useState } from 'react';
import { GridIcon, StarIcon, HeartIcon, PlayIcon, BookmarkIcon, BellIcon } from './icons';

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
}: {
  active: NavFilter;
  onPick: (id: NavFilter) => void;
}) {
  const [toast, setToast] = useState<string | null>(null);

  return (
    <aside className="relative flex w-[88px] shrink-0 flex-col items-center py-7" data-intro="sidebar">
      {/* avatar */}
      <div className="grid h-14 w-14 place-items-center rounded-full bg-card shadow-soft" title="You">
        <span className="text-2xl" role="img" aria-label="reader avatar">🍊</span>
      </div>

      <nav className="mt-10 flex flex-col gap-4">
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

      <div className="relative mt-auto flex flex-col items-center gap-4">
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
        <div className="flex h-28 w-11 items-center justify-center rounded-full bg-sky text-white shadow-soft">
          <span className="rotate-180 text-[11px] font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>
            mangashelf
          </span>
        </div>
      </div>
    </aside>
  );
}
