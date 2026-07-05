import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const SearchIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export const GridIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <rect x="4" y="4" width="7" height="7" rx="2" />
    <rect x="13" y="4" width="7" height="7" rx="2" />
    <rect x="4" y="13" width="7" height="7" rx="2" />
    <rect x="13" y="13" width="7" height="7" rx="2" />
  </svg>
);

export const StarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="m12 3 2.7 5.6 6.3.9-4.5 4.3 1 6.2-5.5-3-5.5 3 1-6.2L3 9.5l6.3-.9L12 3Z" />
  </svg>
);

export const HeartIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M12 20.5S4 15 4 9.6C4 6.8 6.2 5 8.5 5c1.6 0 2.8.8 3.5 2 .7-1.2 1.9-2 3.5-2C17.8 5 20 6.8 20 9.6c0 5.4-8 10.9-8 10.9Z" />
  </svg>
);

export const PlayIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </svg>
);

export const BookmarkIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1Z" />
  </svg>
);

export const BellIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </svg>
);

export const StackIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M4 7h16M4 12h16M4 17h10" />
  </svg>
);

export const PlusIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M5 12h14" />
  </svg>
);

export const SendIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="m4 11 16-7-5 16-3.5-6L4 11Z" />
    <path d="m11.5 14 8.5-10" />
  </svg>
);

export const ClipIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L14 7" />
  </svg>
);

export const TrashIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-1 13a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 7" />
  </svg>
);

export const ExternalIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M14 5h5v5M19 5l-8 8" />
    <path d="M19 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
  </svg>
);

export const ChevronIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="m9 6 6 6-6 6" />
  </svg>
);

export const LinkIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M10 14a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1.5 1.5" />
    <path d="M14 10a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1.5-1.5" />
  </svg>
);

export const SparkleIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
    <path d="M19 16l.9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9L19 16Z" />
  </svg>
);

export const ChatIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const ShieldIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const EyeOffIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
    <path d="M9.4 5.2A9.3 9.3 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.7M6.3 6.3A16.8 16.8 0 0 0 2 12s4 7 10 7a9.2 9.2 0 0 0 3.2-.6" />
  </svg>
);

export const GearIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2.1-1.2L14 3h-4l-.5 2.7a7 7 0 0 0-2.1 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2.1 1.2L10 21h4l.5-2.7a7 7 0 0 0 2.1-1.2l2.3 1 2-3.4-2-1.5c.07-.4.1-.8.1-1.2Z" />
  </svg>
);

export const KeyIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={16} height={16} {...base} {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="m11 12 9-9M17 6l3 3M14 9l2 2" />
  </svg>
);

export const RefreshIcon = (p: P) => (
  <svg viewBox="0 0 24 24" width={18} height={18} {...base} {...p}>
    <path d="M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6" />
  </svg>
);

/** Tiny book glyph used in the genre chips row. */
export const BookGlyph = ({ tint = '#e2574c', ...p }: P & { tint?: string }) => (
  <svg viewBox="0 0 32 32" width={34} height={34} {...p}>
    <rect x="6" y="4" width="20" height="24" rx="3" fill={tint} />
    <rect x="6" y="4" width="5" height="24" rx="2" fill="rgba(0,0,0,0.15)" />
    <path d="M19 4h5v10l-2.5-2L19 14V4Z" fill="#fdfaf3" opacity="0.9" />
  </svg>
);
