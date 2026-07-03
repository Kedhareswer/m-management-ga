'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import gsap from 'gsap';
import Lenis from 'lenis';
import type { Series } from '@/lib/types';
import Sidebar from './Sidebar';
import AddBar from './AddBar';
import GenreChips from './GenreChips';
import MangaCard from './MangaCard';
import StatsBanner from './StatsBanner';
import ChatPanel from './ChatPanel';
import { ChevronIcon } from './icons';

export default function Dashboard() {
  const [library, setLibrary] = useState<Series[] | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('All');
  const [adding, setAdding] = useState(false);
  const scrollHostRef = useRef<HTMLDivElement>(null);
  const shelfRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const introPlayed = useRef(false);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/manga', { cache: 'no-store' });
    setLibrary(await res.json());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Lenis smooth scrolling on the main column.
  useEffect(() => {
    const host = scrollHostRef.current;
    if (!host) return;
    const lenis = new Lenis({
      wrapper: host,
      duration: 1.15,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);

  // Entrance choreography, once the library has loaded.
  useEffect(() => {
    if (!library || introPlayed.current || !rootRef.current) return;
    introPlayed.current = true;
    const ctx = gsap.context(() => {
      gsap.set('[data-intro]', { opacity: 0 });
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo('[data-intro="sidebar"]', { x: -30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 })
        .fromTo('[data-intro="addbar"]', { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
        .fromTo('[data-intro="chips"]', { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45 }, '-=0.25')
        .fromTo(
          '[data-shelf-card]',
          { y: 36, opacity: 0, rotate: -2 },
          { y: 0, opacity: 1, rotate: 0, duration: 0.55, stagger: 0.08, ease: 'back.out(1.4)' },
          '-=0.2'
        )
        .fromTo('[data-intro="banner"]', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 }, '-=0.3')
        .fromTo('[data-intro="chat"]', { x: 30, opacity: 0 }, { x: 0, opacity: 1, duration: 0.5 }, '-=0.4');
    }, rootRef);
    return () => ctx.revert();
  }, [library]);

  const genres = useMemo(() => {
    if (!library) return [];
    const counts = new Map<string, number>();
    for (const s of library) for (const g of s.genres) counts.set(g, (counts.get(g) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g).slice(0, 9);
  }, [library]);

  const visible = useMemo(() => {
    if (!library) return [];
    const q = query.trim().toLowerCase();
    const searching = q.length > 0 && !/^https?:\/\//i.test(q);
    return library.filter((s) => {
      if (genre !== 'All' && !s.genres.includes(genre)) return false;
      if (searching) {
        const hay = `${s.title} ${s.author || ''} ${s.siteName} ${s.genres.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [library, genre, query]);

  const addByUrl = useCallback(
    async (url: string) => {
      setAdding(true);
      try {
        const res = await fetch('/api/manga', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Extraction failed');
        await refresh();
        // pop the freshly added card in
        requestAnimationFrame(() => {
          const cards = shelfRef.current?.querySelectorAll('[data-shelf-card]');
          const first = cards?.[0];
          if (first) {
            gsap.fromTo(first, { scale: 0.8, opacity: 0, rotate: -4 }, { scale: 1, opacity: 1, rotate: 0, duration: 0.6, ease: 'back.out(1.8)' });
          }
        });
      } finally {
        setAdding(false);
      }
    },
    [refresh]
  );

  const changeChapter = useCallback(async (id: string, chapter: number) => {
    // optimistic update — the stepper should feel instant
    setLibrary((lib) =>
      lib ? lib.map((s) => (s.id === id ? { ...s, currentChapter: chapter } : s)) : lib
    );
    await fetch(`/api/manga/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ currentChapter: chapter }),
    });
  }, []);

  const removeSeries = useCallback(
    async (id: string) => {
      const card = shelfRef.current?.querySelector<HTMLElement>(`[data-card-id="${id}"]`);
      if (card) {
        await gsap.to(card, { scale: 0.7, opacity: 0, rotate: 6, duration: 0.3, ease: 'power2.in' }).then();
      }
      await fetch(`/api/manga/${id}`, { method: 'DELETE' });
      await refresh();
    },
    [refresh]
  );

  const readingCount = library?.filter((s) => s.status === 'reading').length ?? 0;

  return (
    <div ref={rootRef} className="mx-auto flex min-h-screen max-w-[1440px] gap-2 p-3 md:p-5">
      <div className="flex min-w-0 flex-1 gap-2 overflow-hidden rounded-[44px] bg-parchment p-4 shadow-lift md:p-6">
        <Sidebar />

        {/* main scrolling column */}
        <main
          ref={scrollHostRef}
          className="h-[calc(100vh-88px)] min-w-0 flex-1 overflow-y-auto overscroll-contain rounded-panel px-2 md:px-4"
        >
          <div className="sticky top-0 z-10 -mx-2 bg-parchment/95 px-2 pb-4 pt-2 backdrop-blur-sm md:-mx-4 md:px-4">
            <AddBar query={query} onQuery={setQuery} onAdd={addByUrl} adding={adding} readingCount={readingCount} />
            <div className="mt-5">
              <GenreChips genres={genres} active={genre} onPick={setGenre} />
            </div>
          </div>

          <section className="mt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold">
                {genre === 'All' ? 'Your shelf' : genre}
                <span className="ml-2 text-[13px] font-bold text-fawn">{visible.length}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button className="rounded-full bg-card px-4 py-1.5 text-[12px] font-bold text-fawn shadow-soft transition hover:text-ink" onClick={() => { setGenre('All'); setQuery(''); }}>
                  View All
                </button>
                <button className="icon-btn !h-8 !w-8 rotate-180" aria-label="Scroll shelf left" onClick={() => shelfRef.current?.scrollBy({ left: -420, behavior: 'smooth' })}>
                  <ChevronIcon />
                </button>
                <button className="icon-btn !h-8 !w-8" aria-label="Scroll shelf right" onClick={() => shelfRef.current?.scrollBy({ left: 420, behavior: 'smooth' })}>
                  <ChevronIcon />
                </button>
              </div>
            </div>

            <div
              ref={shelfRef}
              data-lenis-prevent
              className="mt-4 flex gap-4 overflow-x-auto pb-6 pt-2"
            >
              {library === null ? (
                [...Array(4)].map((_, i) => (
                  <div key={i} className="h-[380px] w-[196px] shrink-0 animate-pulse rounded-blob bg-card/70" />
                ))
              ) : visible.length === 0 ? (
                <div className="flex h-[300px] w-full flex-col items-center justify-center gap-2 text-center">
                  <span className="text-4xl">🏜️</span>
                  <p className="text-[14px] font-bold text-fawn">
                    Nothing here yet — paste a manga link in the bar above
                    <br /> and I&apos;ll shelve it with all its details.
                  </p>
                </div>
              ) : (
                visible.map((s) => (
                  <div key={s.id} data-card-id={s.id} className="shrink-0">
                    <MangaCard series={s} onChapterChange={changeChapter} onDelete={removeSeries} />
                  </div>
                ))
              )}
            </div>
          </section>

          {library && library.length > 0 && <StatsBanner library={library} />}

          <footer className="py-8 text-center text-[11px] font-bold text-fawn/70">
            MangaShelf · your chapters, remembered 🔖
          </footer>
        </main>

        <ChatPanel onLibraryChange={refresh} />
      </div>
    </div>
  );
}
