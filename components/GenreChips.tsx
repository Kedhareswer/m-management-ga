'use client';

import { BookGlyph } from './icons';

const CHIP_TINTS = ['#d0443c', '#5d4ec4', '#4e9c7c', '#eda92b', '#3f7fc9', '#d97fae', '#7d6ac2', '#3f7d63', '#b06a2a', '#a53a35'];

export default function GenreChips({
  genres,
  active,
  onPick,
}: {
  genres: string[];
  active: string;
  onPick: (genre: string) => void;
}) {
  const all = ['All', ...genres];
  return (
    <div data-intro="chips" className="flex gap-1 overflow-x-auto pb-1">
      {all.map((g, i) => {
        const isActive = active === g;
        return (
          <button
            key={g}
            onClick={() => onPick(g)}
            className={`chip ${isActive ? 'chip-active' : ''}`}
            aria-pressed={isActive}
          >
            <span
              className={`transition-transform duration-200 ${isActive ? 'scale-105' : ''}`}
              style={{ transitionTimingFunction: 'var(--ease-out)' }}
            >
              <BookGlyph tint={CHIP_TINTS[i % CHIP_TINTS.length]} />
            </span>
            <span className={isActive ? 'border-b-2 border-tomato pb-0.5' : ''}>{g}</span>
          </button>
        );
      })}
    </div>
  );
}
