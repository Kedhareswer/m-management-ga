'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon } from './icons';

/**
 * Theme toggle — persists to localStorage, mirrors to <html class="dark">.
 * Inline script in layout.tsx applies the class before first paint.
 */
export default function ThemeToggle({ className = '' }: { className?: string }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <button
      onClick={toggle}
      className={`icon-btn ${className}`}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={dark}
    >
      <span
        key={dark ? 'sun' : 'moon'}
        className="grid place-items-center transition-[transform,opacity] duration-200"
        style={{
          transform: dark ? 'rotate(0deg) scale(1)' : 'rotate(-20deg) scale(1)',
          transitionTimingFunction: 'var(--ease-out)',
        }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </span>
    </button>
  );
}
