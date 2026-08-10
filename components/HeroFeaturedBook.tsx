'use client';

import type { Series } from '@/lib/types';
import BookCover from './BookCover';
import { ExternalIcon, StarIcon, BookmarkIcon, LinkIcon } from './icons';

export default function HeroFeaturedBook({
  series,
  onOpenReader,
  onToggleFavorite,
}: {
  series: Series;
  onOpenReader: (series: Series) => void;
  onToggleFavorite: (id: string, favorite: boolean) => void;
}) {
  if (!series) return null;

  return (
    <div className="relative mb-8 overflow-hidden rounded-blob bg-card p-6 shadow-lift transition-all duration-300 border border-white/80">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left Information Column */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-tomato/15 px-3 py-1 text-[11px] font-extrabold text-tomato">
              🔥 Keep the story going…
            </span>
            <span className="text-[11px] font-bold text-fawn">
              ch. {series.currentChapter} {series.totalChapters ? `/ ${series.totalChapters}` : ''}
            </span>
          </div>

          <h2 className="font-serif text-2xl font-bold tracking-tight text-ink md:text-3xl lg:text-4xl">
            {series.title}
          </h2>

          <p className="text-xs font-extrabold tracking-wide text-tomato/90">
            {series.author ? `by ${series.author}` : series.siteName}
          </p>

          <p className="line-clamp-2 text-xs font-medium text-fawn/90 leading-relaxed max-w-xl">
            {series.description || `Delve deeper into ${series.title}. Continue reading chapter ${series.currentChapter} where you left off.`}
          </p>

          {/* Action Row matching Reference Image 1 & 4 */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onOpenReader(series)}
              className="flex items-center gap-2.5 rounded-full bg-[#1e1b18] px-7 py-3 text-xs font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-[#2b2723] active:translate-y-0"
            >
              Start reading <ExternalIcon />
            </button>

            <button
              onClick={() => onToggleFavorite(series.id, !series.favorite)}
              className={`grid h-10 w-10 place-items-center rounded-full shadow-soft transition active:scale-90 ${
                series.favorite ? 'bg-sun text-white' : 'bg-parchment text-fawn hover:text-sun'
              }`}
              title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* Right 3D Book Showcase with Floor Shadow */}
        <div className="relative flex shrink-0 justify-center lg:justify-end">
          <div className="group relative cursor-pointer" onClick={() => onOpenReader(series)}>
            {/* 3D Floor Shadow */}
            <div className="absolute -bottom-4 left-1/2 h-5 w-4/5 -translate-x-1/2 rounded-full bg-ink/25 blur-lg transition-all group-hover:blur-xl" />

            <BookCover
              series={series}
              className="h-[220px] w-[148px] rounded-r-md transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-[-2deg] shadow-lift"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
