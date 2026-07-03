import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        shell: '#d5c7b8',       // outer backdrop taupe
        parchment: '#f7f1e6',   // main surface cream
        card: '#fdfaf3',        // raised card cream
        ink: '#453b33',         // warm dark brown text
        fawn: '#a8988a',        // muted secondary text
        lav: '#cabfec',         // lavender chat bubble
        lavdeep: '#8f7fd4',     // deeper purple
        peach: '#f3d9c3',
        tomato: '#e2574c',
        leaf: '#7fb69a',
        sun: '#f2b64c',
        sky: '#5a8fd6',
      },
      borderRadius: {
        blob: '28px',
        panel: '36px',
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(69, 59, 51, 0.25)',
        lift: '0 18px 40px -16px rgba(69, 59, 51, 0.35)',
        inner1: 'inset 0 2px 6px rgba(69, 59, 51, 0.08)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
