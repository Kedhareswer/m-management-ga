'use client';

import { useState } from 'react';
import type { Series } from '@/lib/types';

/** Cover palettes echoing the reference design's book jackets. */
export const COVER_PALETTES = [
  { bg: 'linear-gradient(160deg,#4b3f8f,#2e2960)', accent: '#f2b64c' }, // midnight purple
  { bg: 'linear-gradient(160deg,#7fb69a,#3f7d63)', accent: '#fdfaf3' }, // botanical green
  { bg: 'linear-gradient(160deg,#e2574c,#a53a35)', accent: '#f3d9c3' }, // tomato red
  { bg: 'linear-gradient(160deg,#5a8fd6,#33538c)', accent: '#f2b64c' }, // sea blue
  { bg: 'linear-gradient(160deg,#8f7fd4,#5c4ea3)', accent: '#f3d9c3' }, // lavender
  { bg: 'linear-gradient(160deg,#e8a04c,#b06a2a)', accent: '#fdfaf3' }, // amber
];

/**
 * A book jacket with the little bookmark ribbon from the reference design.
 * Uses the extracted cover image when there is one, otherwise a hand-drawn
 * CSS jacket with the title set like a cloth-bound classic.
 */
export default function BookCover({
  series,
  className = '',
}: {
  series: Series;
  className?: string;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const palette = COVER_PALETTES[series.coverHue % COVER_PALETTES.length];
  const showImage = series.coverUrl && !imgFailed;

  return (
    <div className={`relative ${className}`}>
      <div
        className="relative h-full w-full overflow-hidden rounded-lg rounded-r-xl shadow-lift"
        style={showImage ? undefined : { background: palette.bg }}
      >
        {showImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={series.coverUrl}
            alt={series.title}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-between p-3 text-center">
            <div
              className="mt-2 w-full border-y-2 py-2 text-[13px] font-extrabold uppercase leading-tight tracking-wide"
              style={{ color: palette.accent, borderColor: `${palette.accent}66` }}
            >
              {series.title}
            </div>
            <CoverDoodle accent={palette.accent} seed={series.coverHue} />
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-white/70">
              {series.author || series.siteName}
            </div>
          </div>
        )}
        {/* spine highlight */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[7px] bg-gradient-to-r from-black/25 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 left-[7px] w-px bg-white/25" />
      </div>

      {/* bookmark ribbon */}
      <div
        className="absolute -bottom-3 right-3 h-9 w-5 origin-top"
        style={{ animation: 'ribbon-sway 4s ease-in-out infinite' }}
        aria-hidden
      >
        <div
          className="h-full w-full"
          style={{
            background: '#f2b64c',
            clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%)',
            boxShadow: '0 4px 8px rgba(69,59,51,0.25)',
          }}
        />
      </div>
    </div>
  );
}

/** Small centered motif so generated covers feel illustrated, not empty. */
function CoverDoodle({ accent, seed }: { accent: string; seed: number }) {
  const kind = seed % 3;
  if (kind === 0) {
    return (
      <svg viewBox="0 0 60 60" width="52" height="52" aria-hidden>
        <circle cx="30" cy="30" r="16" fill="none" stroke={accent} strokeWidth="3" />
        <circle cx="30" cy="30" r="6" fill={accent} />
        <path d="M30 6v8M30 46v8M6 30h8M46 30h8" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === 1) {
    return (
      <svg viewBox="0 0 60 60" width="52" height="52" aria-hidden>
        <path d="M30 8c-8 12-16 16-16 28a16 16 0 0 0 32 0C46 24 38 20 30 8Z" fill="none" stroke={accent} strokeWidth="3" strokeLinejoin="round" />
        <path d="M30 22v22" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 60 60" width="52" height="52" aria-hidden>
      <path d="M14 44 30 12l16 32" fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="34" r="5" fill={accent} />
    </svg>
  );
}
