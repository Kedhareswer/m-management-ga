'use client';

import { useEffect, useRef, useState } from 'react';
import type { Series } from '@/lib/types';
import { continueUrl } from '@/lib/chapterUrl';
import {
  CloseIcon, ExternalIcon, RefreshIcon, LinkIcon, MinusIcon, PlusIcon, BookmarkIcon, SparkleIcon,
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
      className="fixed inset-0 z-50 flex flex-col bg-ink/70 p-2 backdrop-blur-md md:p-5"
      role="dialog"
      aria-modal="true"
      aria-label="In-App Reader Browser"
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-panel bg-card shadow-lift border border-white/60">
        {/* Top Animated Loading Bar */}
        <div className="h-1 w-full bg-parchment overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-sun via-leaf to-lavdeep transition-all duration-500 ${
              iframeLoading ? 'w-3/4 animate-pulse' : 'w-full'
            }`}
          />
        </div>

        {/* Browser Top Navigation Header (Checklist.design specification) */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-parchment bg-parchment/90 px-4 py-3 backdrop-blur-sm">
          {/* Site Identity & Security Lock */}
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="grid h-7 w-7 place-items-center rounded-full bg-leaf/20 text-leaf text-xs font-bold" title="SSL Encrypted Connection">
              🔒
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-xs font-extrabold text-ink">
                  {series ? series.title : 'In-App Reader'}
                </span>
                {series && (
                  <span className="rounded-full bg-lav/50 px-2 py-0.5 text-[10px] font-bold text-ink">
                    ch. {series.currentChapter}
                  </span>
                )}
              </div>
              <div className="truncate text-[11px] font-semibold text-fawn">{hostName}</div>
            </div>
          </div>

          {/* Center Action Toolbar: Chapter controls, Reload, Copy Link, Open External */}
          <div className="flex items-center gap-1.5">
            {series && onChapterChange && (
              <div className="flex items-center gap-1 rounded-full bg-card px-2 py-1 shadow-soft mr-2">
                <button
                  onClick={handlePrevChapter}
                  className="grid h-7 w-7 place-items-center rounded-full bg-parchment text-fawn transition hover:text-tomato active:scale-90"
                  title="Previous Chapter"
                  aria-label="Previous Chapter"
                >
                  <MinusIcon />
                </button>
                <span className="px-2 text-xs font-extrabold text-ink">
                  ch. {series.currentChapter}
                </span>
                <button
                  onClick={handleNextChapter}
                  className="grid h-7 w-7 place-items-center rounded-full bg-parchment text-fawn transition hover:text-leaf active:scale-90"
                  title="Next Chapter"
                  aria-label="Next Chapter"
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
              className="flex items-center gap-1.5 rounded-full bg-tomato px-3.5 py-1.5 text-xs font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 active:translate-y-0"
              title="Close reader"
            >
              <CloseIcon /> Done
            </button>
          </div>
        </header>

        {/* Embedded Webview / Reader Container */}
        <div className="relative flex-1 bg-white">
          {iframeLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/90 gap-3 text-center">
              <SparkleIcon className="h-8 w-8 animate-spin text-lavdeep" />
              <p className="text-sm font-extrabold text-ink">Loading {hostName}…</p>
              <p className="text-xs font-semibold text-fawn">
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
