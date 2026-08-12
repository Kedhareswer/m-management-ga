'use client';

import { useEffect, useState } from 'react';
import { LinkIcon, PlusIcon, SparkleIcon, CloseIcon } from './icons';
import type { AddOutcome } from './Dashboard';

/**
 * The explicit "add a series" dialog. Paste-into-search was too subtle
 * (the button just relabeled itself), so adding now has its own clearly
 * labeled entry point and dedicated space to show extraction progress
 * and errors.
 */
export default function AddMangaModal({
  open,
  initialUrl = '',
  onClose,
  onAdd,
  onOpenSeries,
}: {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onAdd: (url: string) => Promise<AddOutcome>;
  onOpenSeries: (id: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<AddOutcome | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setError(null);
      setBlocked(null);
    }
  }, [open, initialUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isUrl = /^https?:\/\/\S+$/i.test(url.trim());

  const submit = async () => {
    if (!isUrl || adding) return;
    setAdding(true);
    setError(null);
    try {
      const outcome = await onAdd(url.trim());
      // Tracking always succeeded. If the site blocked auto-details, keep the
      // dialog open to explain and offer a jump to fill things in manually.
      if (outcome.metaStatus === 'blocked' || outcome.metaStatus === 'unreachable') {
        setBlocked(outcome);
      } else {
        onClose();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that link');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center modal-scrim sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-manga-title"
    >
      <div
        className="modal-in max-h-[92dvh] w-full overflow-y-auto rounded-t-panel bg-card p-5 shadow-lift sm:max-w-md sm:rounded-panel sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 id="add-manga-title" className="text-[19px] font-extrabold tracking-tight">
            Add a series
          </h2>
          <button
            onClick={onClose}
            className="icon-btn !h-8 !w-8"
            aria-label="Close"
            title="Close"
          >
            <CloseIcon />
          </button>
        </div>
        <p className="mt-1 text-[12.5px] font-medium leading-relaxed text-fawn">
          Paste a link to the series page — or the exact chapter you&apos;re on — and
          we&apos;ll pull the title, genres, cover and author automatically.
        </p>

        {blocked ? (
          <div className="mt-4">
            <div className="rounded-xl bg-sun/15 p-4">
              <div className="text-[13px] font-extrabold text-[#a8752a]">
                Tracked — but the site fought us off
              </div>
              <p className="mt-1 text-[12px] font-medium leading-relaxed text-ink/75">
                {blocked.blockReason ? <><span className="font-bold">{blocked.blockReason}</span> blocked auto-details. </> : 'The site blocked auto-details. '}
                Your chapter tracking and “continue reading” still work perfectly — only the
                genres/cover/author need a manual touch. Open the series to fill them in.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={onClose} className="pressable rounded-full px-4 py-2.5 text-[13px] font-bold text-fawn hover:text-ink">
                Done
              </button>
              <button
                onClick={() => {
                  onOpenSeries(blocked.seriesId);
                  onClose();
                }}
                className="pressable rounded-full bg-lavdeep px-5 py-2.5 text-[13px] font-extrabold text-white shadow-soft hover:shadow-lift"
              >
                Open &amp; edit details →
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-2 rounded-full bg-parchment px-4 py-3 shadow-inner1 transition-[box-shadow] duration-200 focus-within:shadow-ring dark:bg-shell/60">
              <LinkIcon className="shrink-0 text-lavdeep" />
              <input
                autoFocus
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="https://…"
                className="w-full bg-transparent text-[14px] font-medium outline-none placeholder:text-fawn/70"
                aria-label="Manga link"
              />
            </div>

            {error && <p className="mt-2.5 text-[12px] font-bold text-tomato">{error}</p>}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={onClose}
                className="pressable rounded-full px-4 py-2.5 text-[13px] font-bold text-fawn hover:text-ink"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={!isUrl || adding}
                className="pressable flex items-center gap-2 rounded-full bg-cta px-5 py-2.5 text-[13px] font-extrabold text-on-cta shadow-soft hover:opacity-90 hover:shadow-lift disabled:cursor-default disabled:opacity-50"
              >
                {adding ? (
                  <>
                    <SparkleIcon className="animate-spin" /> extracting…
                  </>
                ) : (
                  <>
                    <PlusIcon /> Add to shelf
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
