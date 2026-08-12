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
    <div className="mb-7">
      <div className="mb-3 flex items-center justify-between px-0.5">
        <h3 className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-ink">
          {title}
          <span className="rounded-full bg-peach/70 px-2.5 py-0.5 text-[11px] font-bold text-ink/70">
            {seriesList.length}
          </span>
        </h3>

        {viewMode === 'shelf' && (
          <div className="flex items-center gap-1">
            <button
              className="icon-btn !h-8 !w-8 rotate-180"
              aria-label={`Scroll ${title} shelf left`}
              onClick={() => shelfRef.current?.scrollBy({ left: -360, behavior: 'smooth' })}
            >
              <ChevronIcon />
            </button>
            <button
              className="icon-btn !h-8 !w-8"
              aria-label={`Scroll ${title} shelf right`}
              onClick={() => shelfRef.current?.scrollBy({ left: 360, behavior: 'smooth' })}
            >
              <ChevronIcon />
            </button>
          </div>
        )}
      </div>

      <div className="relative">
        <div
          ref={shelfRef}
          className={
            viewMode === 'shelf'
              ? 'flex gap-3.5 overflow-x-auto scroll-px-2 px-0.5 pb-4 pt-1'
              : 'grid grid-cols-2 gap-3.5 pb-4 pt-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
          }
        >
          {seriesList.map((s) => (
            <div
              key={s.id}
              data-card-id={s.id}
              className={viewMode === 'shelf' ? 'w-[184px] shrink-0' : 'w-full'}
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

        {viewMode === 'shelf' && (
          <div className="mt-0.5 h-3 w-full rounded-full border-b-2 border-[#b49a78] bg-gradient-to-r from-[#eadcc8] via-[#dbc7a8] to-[#c9b193] shadow-[0_3px_8px_rgba(31,35,43,0.1)] dark:border-[#6a5842] dark:from-[#3a3228] dark:via-[#2e2820] dark:to-[#241f1a] dark:shadow-[0_3px_10px_rgba(0,0,0,0.45)]" />
        )}
      </div>
    </div>
  );
}
