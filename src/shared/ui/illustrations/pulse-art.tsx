import { ArtFrame, Leaf } from "./art-frame";

/**
 * Bosh sahifa illyustratsiyasi: biznesning «yurak urishi» — monitor chizig'i bo'ylab
 * yuguruvchi puls, atrofida tushum ustunlari o'sib boradi, tilla tanga suzadi.
 */
export const PulseArt = () => (
  <ArtFrame>
    {[
      [60, 150, 30],
      [92, 132, 48],
      [124, 118, 62],
      [156, 96, 84],
      [188, 80, 100],
      [220, 64, 116],
    ].map(([x = 0, y = 0, height = 0], index) => (
      <rect
        key={x}
        x={x}
        y={y}
        width="22"
        height={height}
        rx="6"
        fill={index === 5 ? "url(#art-gold)" : "url(#art-glass)"}
        className={index === 5 ? undefined : "stroke-hero-ink/25"}
      />
    ))}
    <path
      id="pulse-line"
      d="M30 120 H96 l10 -30 l14 60 l12 -48 l10 18 H178 l10 -40 l12 70 l10 -30 H292"
      className="stroke-mint"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M30 120 H96 l10 -30 l14 60 l12 -48 l10 18 H178 l10 -40 l12 70 l10 -30 H292"
      className="stroke-hero-ink animate-dash"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="10 38"
    />
    <circle r="6" className="fill-gold">
      <animateMotion dur="4.5s" repeatCount="indefinite">
        <mpath href="#pulse-line" />
      </animateMotion>
    </circle>
    <g className="animate-float art-self">
      <circle cx="262" cy="44" r="18" fill="url(#art-gold)" className="stroke-hero-ink/50" />
      <path d="M255 44 h14 M262 37 v14" className="stroke-forest" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <Leaf x={40} y={60} scale={0.9} rotate={-25} />
    <Leaf x={276} y={186} scale={0.7} rotate={200} />
  </ArtFrame>
);
