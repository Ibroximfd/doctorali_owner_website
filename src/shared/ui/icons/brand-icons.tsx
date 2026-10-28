import type { ReactNode, SVGProps } from "react";

/**
 * Doctor Ali brend ikonkalari — yangi bo'limlar uchun qo'lda chizilgan. API lucide bilan
 * bir xil (`className`, `strokeWidth`, `aria-hidden`), shuning uchun navigatsiyada
 * lucide ikonkalari bilan yonma-yon ishlaydi. Motiv: barg va puls chizig'i.
 */
export type IconProps = SVGProps<SVGSVGElement> & { strokeWidth?: number };
export type IconComponent = (props: IconProps) => ReactNode;

const Base = ({ strokeWidth = 1.75, children, ...props }: IconProps) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    {children}
  </svg>
);

/** Muammolar markazi: qalqon ichida puls chizig'i. */
export const IssuesIcon: IconComponent = (props) => (
  <Base {...props}>
    <path d="M12 2.8 4.5 5.6v5.6c0 4.6 3.1 8.6 7.5 10 4.4-1.4 7.5-5.4 7.5-10V5.6Z" />
    <path d="M7.5 12.4h2.3l1.4-3 2 5.6 1.4-2.6h1.9" />
  </Base>
);

/** Prognoz: tarix chizig'i, uzuq kelajak va yulduzcha. */
export const ForecastIcon: IconComponent = (props) => (
  <Base {...props}>
    <path d="M3 20.5h18" />
    <path d="M3.5 16.5 7.5 12l3 2.5 3-3.5" />
    <path d="m13.5 11 2.2-2.4 2-1.6" strokeDasharray="1.6 2.2" />
    <path d="M19.5 2.8v3.4M17.8 4.5h3.4" />
  </Base>
);

/** Ombor: tomida barg bo'lgan javonli bino. */
export const WarehouseIcon: IconComponent = (props) => (
  <Base {...props}>
    <path d="M3.5 9.5 12 4.5l8.5 5v10.5h-17Z" />
    <path d="M7.5 20v-6.5h9V20M7.5 16.8h9" />
    <path d="M12 4.5c.6-1.5 2-2.2 3.6-2-.2 1.6-1.4 2.6-3.6 2Z" />
  </Base>
);

/** Hisob-kitob: tanga va qaytuvchi strelka (qarz → to'lov). */
export const SettlementsIcon: IconComponent = (props) => (
  <Base {...props}>
    <circle cx="9.5" cy="12" r="6" />
    <path d="M9.5 9v6M7.8 10.5h2.8a1.2 1.2 0 0 1 0 2.4H8.4a1.2 1.2 0 0 0 0 2.4h2.8" />
    <path d="M16.5 6.5a7.2 7.2 0 0 1 0 11M18.8 15.3l-2.3 2.2 2.6 1.5" />
  </Base>
);

/** Tizim holati: uchta tugun va yurak urishi. */
export const SystemIcon: IconComponent = (props) => (
  <Base {...props}>
    <rect x="3.5" y="3.5" width="17" height="6" rx="2" />
    <rect x="3.5" y="14.5" width="17" height="6" rx="2" />
    <path d="M6.5 6.5h.01M6.5 17.5h.01" strokeWidth={2.6} />
    <path d="M10.5 6.5h2l1-1.5 1.5 3 1-1.5h1.5" />
    <path d="M10.5 17.5h7" />
  </Base>
);

/** AI tahlil: lupa ichida uchqun (AI o'zi tekshiradi). */
export const AiIcon: IconComponent = (props) => (
  <Base {...props}>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="m15.5 15.5 5 5" />
    <path d="M10.5 6.8c.4 2 1.3 2.9 3.3 3.3-2 .4-2.9 1.3-3.3 3.3-.4-2-1.3-2.9-3.3-3.3 2-.4 2.9-1.3 3.3-3.3Z" />
  </Base>
);

/** Ruxsatlar: kalit va ko'z (faqat ko'rish huquqi). */
export const AccessIcon: IconComponent = (props) => (
  <Base {...props}>
    <circle cx="8" cy="8.5" r="4.5" />
    <path d="M11.3 11.6 20 20.3M16.5 16.8l2-2M18.5 18.8l1.6-1.6" />
    <path d="M6 8.5c.6-1 1.3-1.5 2-1.5s1.4.5 2 1.5c-.6 1-1.3 1.5-2 1.5s-1.4-.5-2-1.5Z" />
  </Base>
);
