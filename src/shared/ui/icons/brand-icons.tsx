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

/** Ombor: tomida barg bo'lgan javonli bino. */
export const WarehouseIcon: IconComponent = (props) => (
  <Base {...props}>
    <path d="M3.5 9.5 12 4.5l8.5 5v10.5h-17Z" />
    <path d="M7.5 20v-6.5h9V20M7.5 16.8h9" />
    <path d="M12 4.5c.6-1.5 2-2.2 3.6-2-.2 1.6-1.4 2.6-3.6 2Z" />
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
