import type { Metadata } from 'next';
import { Baloo_2 } from 'next/font/google';
import './globals.css';

const baloo = Baloo_2({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'MangaShelf — never lose your chapter again',
  description:
    'A playful reading tracker for manga, manhwa, comics and graphic novels. Paste a link, we remember the rest.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={baloo.variable}>
      <body>{children}</body>
    </html>
  );
}
