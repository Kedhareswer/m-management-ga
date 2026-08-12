import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    borderRadius: {
      none: '0',
      sm: '6px',
      DEFAULT: '8px',
      md: '10px',
      lg: '12px',
      xl: '14px',
      '2xl': '16px',
      '3xl': '20px',
      blob: '10px',
      panel: '18px',
      full: '9999px',
    },
    extend: {
      colors: {
        shell: 'rgb(var(--shell) / <alpha-value>)',
        parchment: 'rgb(var(--parchment) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        fawn: 'rgb(var(--fawn) / <alpha-value>)',
        lav: 'rgb(var(--lav) / <alpha-value>)',
        lavdeep: '#6f5ec7',
        peach: 'rgb(var(--peach) / <alpha-value>)',
        tomato: '#e05a4f',
        leaf: '#4fae8a',
        sun: '#f0b13c',
        sky: '#4f8fd4',
        cta: 'rgb(var(--cta) / <alpha-value>)',
        'on-cta': 'rgb(var(--on-cta) / <alpha-value>)',
        overlay: 'rgb(var(--overlay) / <alpha-value>)',
      },
      boxShadow: {
        soft: '0 2px 8px -4px rgb(var(--shadow) / 0.12), 0 6px 20px -10px rgb(var(--shadow) / 0.18)',
        lift: '0 4px 12px -6px rgb(var(--shadow) / 0.16), 0 18px 40px -18px rgb(var(--shadow) / 0.3)',
        inner1: 'inset 0 1px 3px rgb(var(--shadow) / 0.08)',
        ring: '0 0 0 2px rgba(111, 94, 199, 0.28)',
        glow: '0 0 24px -6px rgba(111, 94, 199, 0.45)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};

export default config;
