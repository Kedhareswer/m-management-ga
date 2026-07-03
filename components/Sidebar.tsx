'use client';

import { GridIcon, StarIcon, HeartIcon, PlayIcon, BookmarkIcon, BellIcon } from './icons';

const NAV = [
  { icon: GridIcon, label: 'Shelf', active: true },
  { icon: StarIcon, label: 'Favourites' },
  { icon: HeartIcon, label: 'Loved' },
  { icon: PlayIcon, label: 'Reading' },
  { icon: BookmarkIcon, label: 'Bookmarks' },
];

export default function Sidebar() {
  return (
    <aside className="flex w-[88px] shrink-0 flex-col items-center py-7" data-intro="sidebar">
      {/* avatar */}
      <div className="grid h-14 w-14 place-items-center rounded-full bg-card shadow-soft" title="You">
        <span className="text-2xl" role="img" aria-label="reader avatar">🍊</span>
      </div>

      <nav className="mt-10 flex flex-col gap-4">
        {NAV.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            className={`icon-btn ${active ? '!text-tomato ring-2 ring-tomato/20' : ''}`}
            title={label}
            aria-label={label}
          >
            <Icon />
          </button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <button className="icon-btn !bg-sky !text-white" title="Notifications" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className="flex h-28 w-11 items-center justify-center rounded-full bg-sky text-white shadow-soft">
          <span className="rotate-180 text-[11px] font-bold tracking-widest" style={{ writingMode: 'vertical-rl' }}>
            mangashelf
          </span>
        </div>
      </div>
    </aside>
  );
}
