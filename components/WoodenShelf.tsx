'use client';

import { useRef } from 'react';
import type { Series } from '@/lib/types';
import MangaCard from './MangaCard';
import { ChevronIcon } from './icons';

export default function WoodenShelf({
  title,
  seriesList,
  viewMode,
  onChapterChange,
  onToggleFavorite,
  onDelete,
  onOpen,
  onOpenReader,
}: {
  title: string;
  seriesList: Series[];
  viewMode: 'shelf' | 'grid';
  onChapterChange: (id: string, chapter: number) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
  onDelete: (id: string) => void;
  onOpen: (id: string) => void;
  onOpenReader?: (series: Series) => void;
}) {
  const shelfRef = useRef<HTMLDivElement>(null);

  if (seriesList.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Shelf Title Bar */}
      <div className="flex items-center justify-between px-1 mb-3">
        <h3 className="text-lg font-black text-ink flex items-center gap-2">
          {title}
          <span className="rounded-full bg-peach/80 px-2.5 py-0.5 text-xs font-extrabold text-ink/70">
            {seriesList.length}
          </span>
        </h3>

        {viewMode === 'shelf' && (
          <div className="flex items-center gap-1">
            <button
              className="icon-btn !h-7 !w-7 rotate-180"
              aria-label={`Scroll ${title} shelf left`}
              onClick={() => shelfRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
            >
              <ChevronIcon />
            </button>
            <button
              className="icon-btn !h-7 !w-7"
              aria-label={`Scroll ${title} shelf right`}
              onClick={() => shelfRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
            >
              <ChevronIcon />
            </button>
          </div>
        )}
      </div>

      {/* Book Cards Container */}
      <div className="relative">
        <div
          ref={shelfRef}
          data-lenis-prevent
          className={
            viewMode === 'shelf'
              ? 'flex gap-4 overflow-x-auto pb-4 pt-1 px-1'
              : 'grid grid-cols-2 gap-4 pb-4 pt-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }
        >
          {seriesList.map((s) => (
            <div
              key={s.id}
              data-card-id={s.id}
              className={viewMode === 'shelf' ? 'w-[196px] shrink-0' : 'w-full'}
            >
              <MangaCard
                series={s}
                onChapterChange={onChapterChange}
                onToggleFavorite={onToggleFavorite}
                onDelete={onDelete}
                onOpen={onOpen}
                onOpenReader={onOpenReader}
              />
            </div>
          ))}
        </div>

        {/* Physical 3D Wooden Shelf Ledge (Readowl reference design) */}
        {viewMode === 'shelf' && (
          <div className="mt-1 h-3.5 w-full rounded-full bg-gradient-to-r from-[#e7d8c4] via-[#d4bf0] to-[#c5ad91] shadow-[0_4px_10px_rgba(0,0,0,0.12)] border-b-2 border-[#a68c6e]" />
        )}
      </div>
    </div>
  );
}
