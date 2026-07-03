'use client';

import { BookGlyph } from './icons';

const CHIP_TINTS = ['#e2574c', '#8f7fd4', '#7fb69a', '#f2b64c', '#5a8fd6', '#d97fae', '#7d6ac2', '#3f7d63', '#b06a2a', '#a53a35'];

/**
 * The little row of book-shaped genre tabs from the reference design.
 * Genres are derived live from whatever is on your shelf.
 */
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
    <div data-intro="chips" className="flex gap-1 overflow-x-auto pb-1" data-lenis-prevent>
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
              className={`transition-transform duration-300 ${isActive ? 'scale-110 -rotate-3' : ''}`}
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
