'use client';

import { useEffect, useRef, useState } from 'react';
import type { Series } from '@/lib/types';
import { continueUrl } from '@/lib/chapterUrl';
import {
  CloseIcon, ExternalIcon, RefreshIcon, LinkIcon, MinusIcon, PlusIcon,
} from './icons';

export default function InAppBrowserModal({
  series,
  overrideUrl,
  onClose,
  onChapterChange,
}: {
  series: Series | null;
  overrideUrl?: string;
  onClose: () => void;
  onChapterChange?: (id: string, chapter: number) => void;
}) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);

  const activeUrl = overrideUrl || (series ? continueUrl(series) : '');

  let hostName = 'reader';
  try {
    if (activeUrl) hostName = new URL(activeUrl).hostname.replace(/^www\./, '');
  } catch {}

  useEffect(() => {
    setIframeLoading(true);
  }, [activeUrl, iframeKey]);

  useEffect(() => {
    if (!series && !overrideUrl) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [series, overrideUrl, onClose]);

  if (!series && !overrideUrl) return null;

  const copyLink = async () => {
    if (!activeUrl) return;
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleNextChapter = () => {
    if (series && onChapterChange) {
      onChapterChange(series.id, series.currentChapter + 1);
    }
  };

  const handlePrevChapter = () => {
    if (series && onChapterChange) {
      onChapterChange(series.id, Math.max(0, series.currentChapter - 1));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-overlay/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="In-App Reader Browser"
      style={{ padding: '0 env(safe-area-inset-right) 0 env(safe-area-inset-left)' }}
    >
      <div className="flex h-full w-full flex-col overflow-hidden bg-card md:m-3 md:rounded-panel md:shadow-lift">
        {/* Top loading bar */}
        <div className="h-[3px] w-full overflow-hidden bg-parchment dark:bg-shell">
          <div
            className={`h-full bg-gradient-to-r from-sun via-leaf to-lavdeep transition-[width] duration-500 ${
              iframeLoading ? 'w-3/4' : 'w-full'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out)' }}
          />
        </div>

        {/* Browser Top Navigation Header (Checklist.design specification) */}
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/[0.08] bg-parchment/95 px-3 py-2.5 backdrop-blur-sm">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-leaf/15 text-xs font-bold text-leaf" title="SSL encrypted connection">
              🔒
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-bold text-ink">
                  {series ? series.title : 'In-App Reader'}
                </span>
                {series && (
                  <span className="rounded-full bg-lav/50 px-2 py-0.5 text-[10px] font-bold text-ink">
                    ch. {series.currentChapter}
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] font-medium text-fawn">{hostName}</div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {series && onChapterChange && (
              <div className="mr-1 flex items-center gap-0.5 rounded-full bg-card px-1.5 py-1 shadow-soft">
                <button
                  onClick={handlePrevChapter}
                  className="pressable grid h-7 w-7 place-items-center rounded-full bg-parchment text-fawn hover:text-tomato"
                  title="Previous chapter"
                  aria-label="Previous chapter"
                >
                  <MinusIcon />
                </button>
                <span className="px-1.5 text-[11px] font-extrabold text-ink">
                  ch. {series.currentChapter}
                </span>
                <button
                  onClick={handleNextChapter}
                  className="pressable grid h-7 w-7 place-items-center rounded-full bg-parchment text-fawn hover:text-leaf"
                  title="Next chapter"
                  aria-label="Next chapter"
                >
                  <PlusIcon />
                </button>
              </div>
            )}

            <button
              onClick={() => setIframeKey((k) => k + 1)}
              className="icon-btn !h-8 !w-8"
              title="Reload page"
              aria-label="Reload page"
            >
              <RefreshIcon className={iframeLoading ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={copyLink}
              className="icon-btn !h-8 !w-8"
              title={copied ? 'Link copied!' : 'Copy chapter link'}
              aria-label="Copy chapter link"
            >
              {copied ? <span className="text-xs font-bold text-leaf">✓</span> : <LinkIcon />}
            </button>

            <a
              href={activeUrl}
              target="_blank"
              rel="noreferrer"
              className="icon-btn !h-8 !w-8"
              title="Open in external browser"
              aria-label="Open in external browser"
            >
              <ExternalIcon />
            </a>

            <button
              onClick={onClose}
              className="pressable flex items-center gap-1.5 rounded-full bg-tomato px-3 py-1.5 text-[11px] font-extrabold text-white shadow-soft"
              title="Close reader"
            >
              <CloseIcon /> Done
            </button>
          </div>
        </header>

        {/* Embedded Webview / Reader Container */}
        <div className="relative flex-1 bg-white dark:bg-shell">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-card/90 text-center">
              <span className="relative flex h-3 w-3">
                <span className="absolute h-full w-full animate-ping rounded-full bg-lavdeep/60" />
                <span className="h-3 w-3 rounded-full bg-lavdeep" />
              </span>
              <p className="text-sm font-bold text-ink">Loading {hostName}…</p>
              <p className="text-xs font-medium text-fawn">
                Preparing chapter view inside MangaShelf
              </p>
            </div>
          )}

          <iframe
            key={iframeKey}
            src={activeUrl}
            onLoad={() => setIframeLoading(false)}
            className="h-full w-full border-0"
            title={series ? `${series.title} Reader` : 'In-App Reader'}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      </div>
    </div>
  );
}
