import { ArtFrame, Leaf } from "./art-frame";

/*
 * Bo'lim illyustratsiyalari — qo'lda chizilgan SVG, Doctor Ali uslubida (yashil + tilla,
 * o'simlik motivi). Har birida bitta-ikkita jonli detal: suzish, oqim, puls.
 * Faqat bezak — `aria-hidden` ni `SectionHero` qo'yadi.
 */

/** Ombor: javon, qutilar, ustida barg; bitta quti yuqoriga «suzadi». */
export const WarehouseArt = () => (
  <ArtFrame>
    <rect
      x="64"
      y="58"
      width="192"
      height="132"
      rx="10"
      fill="url(#art-glass)"
      className="stroke-hero-ink/30"
    />
    {[96, 136, 176].map((y) => (
      <path key={y} d={`M64 ${y} H256`} className="stroke-hero-ink/25" strokeWidth="2" />
    ))}
    {/* [x, javon chizig'i, eni, bo'yi] — quti javon ustida turadi */}
    {[
      [76, 96, 34, 26],
      [116, 96, 28, 20],
      [152, 96, 40, 30],
      [204, 96, 32, 24],
      [80, 136, 40, 28],
      [130, 136, 28, 22],
      [208, 136, 36, 30],
      [88, 176, 30, 24],
      [134, 176, 40, 30],
      [190, 176, 28, 20],
    ].map(([x = 0, shelf = 0, width = 0, height = 0]) => (
      <g key={`${x}-${shelf}`}>
        <rect x={x} y={shelf - height} width={width} height={height} rx="4" fill="url(#art-gold)" />
        <path
          d={`M${x + width / 2} ${shelf - height} V${shelf - height + 8}`}
          className="stroke-forest/50"
          strokeWidth="2"
        />
      </g>
    ))}
    <g className="animate-float art-self">
      <rect x="228" y="22" width="40" height="30" rx="5" className="fill-mint/90" />
      <path d="M248 22 V30" className="stroke-forest/60" strokeWidth="2" />
      <path d="M238 60 L248 66 L258 60" className="stroke-gold" strokeWidth="2" strokeLinecap="round" />
    </g>
    <Leaf x={52} y={52} scale={0.9} rotate={-30} />
    <Leaf x={252} y={196} scale={0.7} rotate={200} />
  </ArtFrame>
);

/** Prognoz: tarix chizig'i + ishonch oralig'i bilan kelajak, oxirida tilla yulduzcha. */
export const ForecastArt = () => (
  <ArtFrame>
    <path d="M40 186 H284" className="stroke-hero-ink/30" strokeWidth="1.5" />
    {[70, 110, 150].map((y) => (
      <path key={y} d={`M40 ${y} H284`} className="stroke-hero-ink/10" strokeDasharray="3 6" />
    ))}
    <path
      d="M172 112 C 206 88, 236 70, 284 40 L 284 104 C 236 120, 206 128, 172 124 Z"
      className="fill-gold/20"
    />
    <path
      d="M40 160 C 70 150, 84 166, 106 140 S 146 128, 172 118"
      className="stroke-mint"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    <path
      d="M172 118 C 206 104, 236 92, 284 72"
      className="stroke-gold animate-dash"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeDasharray="8 8"
    />
    <path d="M172 52 V186" className="stroke-hero-ink/40" strokeDasharray="2 4" />
    <circle cx="172" cy="118" r="6" className="fill-hero-ink" />
    <circle cx="172" cy="118" r="12" className="stroke-hero-ink/40 animate-ping-soft art-self" />
    <g className="animate-float art-self">
      <path d="M284 58 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 Z" className="fill-gold" />
    </g>
    <Leaf x={36} y={60} scale={0.8} rotate={-20} />
  </ArtFrame>
);

/** Muammolar markazi: radar aylanadi, nuqtalar «ping» beradi. */
export const IssuesArt = () => (
  <ArtFrame>
    {[30, 58, 86].map((r) => (
      <circle key={r} cx="160" cy="112" r={r} className="stroke-hero-ink/25" />
    ))}
    <path d="M74 112 H246 M160 26 V198" className="stroke-hero-ink/15" />
    <g className="animate-spin-slow art-orbit">
      <path d="M160 112 L160 26 A86 86 0 0 1 234 70 Z" className="fill-mint/25" />
      <path d="M160 112 L160 26" className="stroke-mint" strokeWidth="2" />
    </g>
    {[
      [204, 76, "fill-hero-alert"],
      [118, 150, "fill-gold"],
      [196, 156, "fill-mint"],
    ].map(([x, y, tone]) => (
      <g key={`${x}`}>
        <circle
          cx={Number(x)}
          cy={Number(y)}
          r="12"
          className={`${String(tone)} animate-ping-soft art-self opacity-60`}
        />
        <circle cx={Number(x)} cy={Number(y)} r="5" className={String(tone)} />
      </g>
    ))}
    <g className="animate-float art-self">
      <path d="M244 30 l14 24 h-28 Z" className="fill-gold" />
      <path d="M244 38 v8 M244 50 v1" className="stroke-forest" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <Leaf x={58} y={180} scale={0.8} rotate={-40} />
  </ArtFrame>
);

/** Hisob-kitob: tanga ustunlari va daftar; yuqoridagi tanga suzadi. */
export const SettlementsArt = () => (
  <ArtFrame>
    <rect
      x="170"
      y="54"
      width="104"
      height="132"
      rx="10"
      fill="url(#art-glass)"
      className="stroke-hero-ink/30"
    />
    {[78, 98, 118, 138, 158].map((y, index) => (
      <g key={y}>
        <path
          d={`M184 ${y} H${index % 2 ? 236 : 252}`}
          className="stroke-hero-ink/40"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="262" cy={y} r="3" className={index === 2 ? "fill-hero-alert" : "fill-mint"} />
      </g>
    ))}
    {[
      [64, 4],
      [104, 6],
      [144, 3],
    ].map(([x = 0, count = 0]) =>
      Array.from({ length: count }, (_, level) => (
        <ellipse
          key={`${x}-${level}`}
          cx={x}
          cy={184 - level * 12}
          rx="18"
          ry="7"
          fill="url(#art-gold)"
          className="stroke-forest/40"
        />
      )),
    )}
    <g className="animate-float art-self">
      <circle cx="104" cy="56" r="16" fill="url(#art-gold)" className="stroke-hero-ink/50" />
      <path d="M98 56 h12 M104 50 v12" className="stroke-forest" strokeWidth="2.5" strokeLinecap="round" />
    </g>
    <Leaf x={40} y={110} scale={0.8} rotate={-60} />
  </ArtFrame>
);

/** Tizim holati: tugunlar tarmog'i, chiziqlar bo'ylab ma'lumot oqadi. */
export const SystemArt = () => {
  const nodes = [
    [160, 112, 18],
    [80, 64, 11],
    [244, 60, 11],
    [70, 168, 10],
    [252, 164, 12],
    [160, 32, 8],
  ] as const;
  return (
    <ArtFrame>
      {nodes.slice(1).map(([x, y]) => (
        <path
          key={`${x}-${y}`}
          d={`M160 112 L${x} ${y}`}
          className="stroke-mint/70 animate-dash"
          strokeWidth="2"
          strokeDasharray="4 8"
        />
      ))}
      {nodes.map(([x, y, r], index) => (
        <g key={`n-${x}-${y}`}>
          {index === 0 ? (
            <circle cx={x} cy={y} r={r + 12} className="stroke-gold/60 animate-ping-soft art-self" />
          ) : null}
          <circle cx={x} cy={y} r={r} className={index === 0 ? "fill-gold" : "fill-hero-ink/90"} />
          <circle cx={x} cy={y} r={r * 0.45} className={index === 0 ? "fill-forest" : "fill-mint"} />
        </g>
      ))}
      <Leaf x={196} y={196} scale={0.7} rotate={-15} />
    </ArtFrame>
  );
};

/** Yetkazib berish (jonli): egri yo'l, ustida harakatlanuvchi nuqta, manzil belgisi. */
export const CourierArt = () => (
  <ArtFrame>
    <path
      id="courier-route"
      d="M40 180 C 90 180, 80 110, 140 112 S 200 60, 262 54"
      className="stroke-hero-ink/30"
      strokeWidth="10"
      strokeLinecap="round"
    />
    <path
      d="M40 180 C 90 180, 80 110, 140 112 S 200 60, 262 54"
      className="stroke-gold animate-dash"
      strokeWidth="2.5"
      strokeDasharray="6 10"
      strokeLinecap="round"
    />
    <circle r="7" className="fill-mint">
      <animateMotion dur="7s" repeatCount="indefinite" rotate="auto">
        <mpath href="#courier-route" />
      </animateMotion>
    </circle>
    <g className="animate-float art-self">
      <path
        d="M262 22 c-11 0 -18 8 -18 17 c0 13 18 29 18 29 s18 -16 18 -29 c0 -9 -7 -17 -18 -17 z"
        className="fill-gold"
      />
      <circle cx="262" cy="39" r="6" className="fill-forest" />
    </g>
    <circle cx="40" cy="180" r="6" className="fill-hero-ink" />
    <Leaf x={64} y={70} scale={0.9} rotate={-35} />
  </ArtFrame>
);

/** Ruxsatlar: qalqon, ichida ko'z (faqat ko'rish), atrofida orbitadagi kalitlar va odamlar. */
export const AccessArt = () => (
  <ArtFrame>
    <path
      d="M160 40 L222 64 V112 C222 152 196 182 160 194 C124 182 98 152 98 112 V64 Z"
      fill="url(#art-glass)"
      className="stroke-hero-ink/40"
      strokeWidth="2"
    />
    <path
      d="M128 116 C140 98 150 92 160 92 C170 92 180 98 192 116 C180 134 170 140 160 140 C150 140 140 134 128 116 Z"
      className="fill-hero-ink/90"
    />
    <circle cx="160" cy="116" r="13" className="fill-forest" />
    <circle cx="160" cy="116" r="5" className="fill-gold animate-breathe art-self" />
    <g className="animate-spin-slow art-orbit">
      {[
        [62, 70],
        [258, 92],
        [92, 186],
      ].map(([x = 0, y = 0], index) => (
        <g key={index}>
          <circle cx={x} cy={y} r="15" className={index === 1 ? "fill-gold" : "fill-mint/90"} />
          <circle cx={x} cy={y - 4} r="4.5" className="fill-forest" />
          <path d={`M${x - 7} ${y + 8} a7 6 0 0 1 14 0`} className="fill-forest" />
        </g>
      ))}
    </g>
    <g className="animate-float art-self">
      <circle cx="246" cy="178" r="9" className="stroke-gold" strokeWidth="3" />
      <path
        d="M253 184 L272 203 M264 195 l5 -5 M268 199 l4 -4"
        className="stroke-gold"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </g>
    <Leaf x={36} y={130} scale={0.8} rotate={-40} />
  </ArtFrame>
);
