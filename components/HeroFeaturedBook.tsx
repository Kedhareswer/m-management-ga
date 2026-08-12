'use client';

import type { Series } from '@/lib/types';
import BookCover from './BookCover';
import { ExternalIcon, StarIcon } from './icons';

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
    <div
      className="relative mb-5 overflow-hidden rounded-panel border border-ink/[0.1] bg-card p-4 shadow-soft md:mb-7 md:p-6"
      data-intro="banner"
    >      <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sun via-leaf to-sky" />
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-lavdeep/10 blur-3xl dark:bg-lavdeep/20" />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-tomato/12 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-tomato">
              Continue
            </span>
            <span className="text-[12px] font-semibold text-fawn">
              ch. {series.currentChapter}
              {series.totalChapters ? ` / ${series.totalChapters}` : ''}
            </span>
          </div>

          <h2 className="font-display text-[22px] font-extrabold leading-[1.12] tracking-tight text-ink md:text-[30px]">
            {series.title}
          </h2>

          <p className="text-[12px] font-bold uppercase tracking-wide text-tomato/85">
            {series.author ? `by ${series.author}` : series.siteName}
          </p>

          <p className="line-clamp-2 max-w-xl text-[13px] font-medium leading-relaxed text-fawn">
            {series.description ||
              `Pick up ${series.title} at chapter ${series.currentChapter}.`}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
            <button
              onClick={() => onOpenReader(series)}
              className="pressable flex items-center gap-2 rounded-full bg-cta px-5 py-2.5 text-[12px] font-extrabold text-on-cta shadow-soft hover:opacity-90 hover:shadow-lift"
            >
              Start reading <ExternalIcon />
            </button>

            <button
              onClick={() => onToggleFavorite(series.id, !series.favorite)}
              className={`pressable grid h-10 w-10 place-items-center rounded-full shadow-soft ${
                series.favorite ? 'bg-sun text-on-cta' : 'bg-parchment text-fawn hover:text-sun'
              }`}
              title={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
              aria-pressed={series.favorite}
              aria-label={series.favorite ? 'Remove from favourites' : 'Add to favourites'}
            >
              <StarIcon fill={series.favorite ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        <div className="relative hidden shrink-0 sm:flex sm:justify-end">
          <button
            type="button"
            className="group relative cursor-pointer"
            onClick={() => onOpenReader(series)}
            aria-label={`Continue reading ${series.title}`}
          >
          <div
            className="absolute -bottom-3 left-1/2 h-4 w-3/4 -translate-x-1/2 rounded-full bg-ink/20 blur-md transition-[opacity,filter] duration-200 group-hover:opacity-70"
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          />
            <BookCover
              series={series}
              className="h-[140px] w-[94px] rounded-r-md shadow-lift transition-transform duration-200 motion-safe:group-hover:-translate-y-1 sm:h-[200px] sm:w-[134px]"
            />
          </button>
        </div>
      </div>
    </div>
  );
}
