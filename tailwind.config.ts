import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    // Sharp, editorial corners — override the whole radius scale so every
    // existing rounded-* utility (incl. rounded-full pills/circles) reads
    // crisp instead of bubbly. "blob"/"panel" are the app's card/panel tokens.
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
      md: '2px',
      lg: '3px',
      xl: '3px',
      '2xl': '4px',
      '3xl': '4px',
      blob: '3px',
      panel: '4px',
      full: '4px',
    },
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
      boxShadow: {
        soft: '0 8px 22px -14px rgba(69, 59, 51, 0.28)',
        lift: '0 16px 34px -18px rgba(69, 59, 51, 0.4)',
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
