type SparklineProps = { values: readonly number[]; className?: string };

const WIDTH = 72;
const HEIGHT = 26;
const PAD_X = 3;
const PAD_Y = 4;

/** Mini trend: chiziq sust rangda, faqat oxirgi nuqta urg'uda. Bezak — ekran o'quvchidan yashirin. */
export const Sparkline = ({ values, className }: SparklineProps) => {
  if (values.length < 2) return null;

  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const x = (index: number) => PAD_X + (index * (WIDTH - PAD_X * 2 - 2)) / (values.length - 1);
  const y = (value: number) => PAD_Y + (HEIGHT - PAD_Y * 2) * (1 - (value - min) / span);
  const path = values
    .map((value, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(value).toFixed(1)}`)
    .join("");
  const last = values[values.length - 1] ?? 0;

  return (
    <svg aria-hidden className={className} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width={WIDTH} height={HEIGHT}>
      <path
        d={path}
        fill="none"
        stroke="var(--cmp)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={x(values.length - 1)}
        cy={y(last)}
        r={3}
        fill="var(--accent)"
        stroke="var(--surface)"
        strokeWidth={1.5}
      />
    </svg>
  );
};
