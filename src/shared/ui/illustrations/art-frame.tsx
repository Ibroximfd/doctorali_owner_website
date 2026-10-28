import type { ReactNode } from "react";

/**
 * Hamma bo'lim illyustratsiyalari uchun umumiy kanva: bir xil o'lcham, tilla
 * halqali yorug' fon. Ranglar faqat tokenlardan (`fill-gold`, `stroke-mint` …).
 */
export const ArtFrame = ({ children }: { children: ReactNode }) => (
  <svg viewBox="0 0 320 220" className="h-auto w-full overflow-visible" fill="none">
    <defs>
      <radialGradient id="art-glow" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="var(--mint)" stopOpacity="0.28" />
        <stop offset="100%" stopColor="var(--mint)" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="art-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="var(--gold)" />
        <stop offset="100%" stopColor="var(--gold)" stopOpacity="0.55" />
      </linearGradient>
      <linearGradient id="art-glass" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--hero-ink)" stopOpacity="0.22" />
        <stop offset="100%" stopColor="var(--hero-ink)" stopOpacity="0.04" />
      </linearGradient>
    </defs>
    <ellipse cx="160" cy="112" rx="150" ry="104" fill="url(#art-glow)" />
    <circle cx="160" cy="112" r="96" className="stroke-gold/25" strokeDasharray="2 6" />
    <g className="animate-spin-slow art-orbit">
      <circle cx="160" cy="16" r="2.5" className="fill-gold" />
    </g>
    {children}
  </svg>
);

/** Kichik barg — brend motivi (Mehrigiyo o'simliklari). */
export const Leaf = ({
  x,
  y,
  scale = 1,
  rotate = 0,
}: {
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
    <path d="M0 0 C 10 -14, 28 -14, 34 0 C 28 14, 10 14, 0 0 Z" className="fill-mint/80" />
    <path d="M2 0 L 30 0" className="stroke-forest/60" strokeWidth="1.2" />
  </g>
);
