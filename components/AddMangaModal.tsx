'use client';

import { useEffect, useState } from 'react';
import { LinkIcon, PlusIcon, SparkleIcon, CloseIcon } from './icons';

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
}: {
  open: boolean;
  initialUrl?: string;
  onClose: () => void;
  onAdd: (url: string) => Promise<void>;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setUrl(initialUrl);
      setError(null);
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
      await onAdd(url.trim());
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add that link');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-manga-title"
    >
      <div
        className="w-full max-w-md rounded-panel bg-card p-6 shadow-lift"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <h2 id="add-manga-title" className="text-[19px] font-extrabold">
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
        <p className="mt-1 text-[12.5px] font-semibold leading-relaxed text-fawn">
          Paste a link to the series page — or the exact chapter you&apos;re on — and
          we&apos;ll pull the title, genres, cover and author automatically.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-full bg-parchment px-4 py-3 shadow-inner1">
          <LinkIcon className="shrink-0 text-lavdeep" />
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="https://…"
            className="w-full bg-transparent text-[14px] font-semibold outline-none placeholder:text-fawn/70"
            aria-label="Manga link"
          />
        </div>

        {error && <p className="mt-2.5 text-[12px] font-bold text-tomato">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2.5 text-[13px] font-bold text-fawn transition hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={!isUrl || adding}
            className="flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-extrabold text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift disabled:cursor-default disabled:opacity-60"
            style={{ background: 'linear-gradient(90deg, #f2b64c 0%, #7fb69a 45%, #8f7fd4 100%)' }}
          >
            {adding ? (
              <>
                <SparkleIcon className="animate-spin" /> extracting…
              </>
            ) : (
              <>
                <PlusIcon /> add to shelf
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
