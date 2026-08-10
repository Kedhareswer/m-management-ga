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
    if (!loading && containerRef.current) {
      const tl = gsap.timeline({
        onComplete: () => {
          setHidden(true);
          onComplete?.();
        },
      });
      tl.to(barRef.current, { width: '100%', duration: 0.3, ease: 'power2.out' })
        .to([logoRef.current, textRef.current, barRef.current], {
          opacity: 0,
          y: -15,
          duration: 0.4,
          stagger: 0.05,
          ease: 'power2.in',
        })
        .to(containerRef.current, {
          opacity: 0,
          scale: 1.03,
          duration: 0.4,
          ease: 'power2.inOut',
        });
    }
  }, [loading, onComplete]);

  if (hidden) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-shell p-6"
      style={{ backgroundImage: 'var(--paper-grain)' }}
    >
      <div className="flex flex-col items-center text-center">
        {/* Animated Brand Logo */}
        <div
          ref={logoRef}
          className="relative grid h-24 w-24 place-items-center rounded-3xl bg-card shadow-lift transition-transform animate-float-slow"
        >
          <span className="text-5xl" role="img" aria-label="MangaShelf logo">
            🍊
          </span>
          <div className="absolute -bottom-2 -right-2 h-7 w-7 rounded-full bg-tomato text-center text-[12px] font-extrabold leading-7 text-white shadow-soft">
            📚
          </div>
        </div>

        {/* Text Details */}
        <div ref={textRef} className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-ink">MangaShelf</h1>
          <p className="mt-1 text-sm font-semibold text-fawn">Never lose your chapter again 🔖</p>
        </div>

        {/* Loading Progress Bar */}
        <div className="mt-8 h-2 w-48 overflow-hidden rounded-full bg-parchment shadow-inner1">
          <div
            ref={barRef}
            className="h-full rounded-full bg-gradient-to-r from-sun via-leaf to-lavdeep transition-all duration-300"
            style={{ width: loading ? '65%' : '100%' }}
          />
        </div>
      </div>
    </div>
  );
}
