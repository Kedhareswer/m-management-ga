'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function SplashScreen({
  loading,
  onComplete,
}: {
  loading: boolean;
  onComplete?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (loading || !containerRef.current) return;

    const finish = () => {
      setHidden(true);
      onComplete?.();
    };

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      finish();
      return;
    }

    const tl = gsap.timeline({ onComplete: finish });
    tl.to(barRef.current, { width: '100%', duration: 0.22, ease: 'power3.out' })
      .to([logoRef.current, textRef.current, barRef.current], {
        opacity: 0,
        y: -10,
        duration: 0.26,
        stagger: 0.04,
        ease: 'power3.out',
      })
      .to(containerRef.current, {
        opacity: 0,
        scale: 1.02,
        duration: 0.26,
        ease: 'power2.inOut',
      });
  }, [loading, onComplete]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-shell p-6"
    >
      <div className="flex flex-col items-center text-center">
        <div
          ref={logoRef}
          className="relative grid h-20 w-20 place-items-center rounded-2xl bg-card shadow-lift motion-safe:animate-float-slow"
        >
          <span className="font-display text-3xl font-extrabold tracking-tight text-ink">MS</span>
          <div className="absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-tomato text-[9px] font-extrabold text-white shadow-soft">
            ✦
          </div>
        </div>

        <div ref={textRef} className="mt-5">
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink">MangaShelf</h1>
          <p className="mt-1 text-[13px] font-medium text-fawn">Your chapters, remembered</p>
        </div>

        <div className="mt-7 h-1.5 w-44 overflow-hidden rounded-full bg-card/80 shadow-inner1 dark:bg-card/40">
          <div
            ref={barRef}
            className="h-full rounded-full bg-gradient-to-r from-sun via-leaf to-lavdeep transition-[width] duration-300"
            style={{ width: loading ? '65%' : '100%', transitionTimingFunction: 'var(--ease-out)' }}
          />
        </div>
      </div>
    </div>
  );
}
