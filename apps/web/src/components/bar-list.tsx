import type { SeriesPoint } from "@luz-de-mae/shared";

/**
 * Horizontal bars with the value printed beside each one: readable on a
 * phone, no legend to decode, and the number never depends on color.
 */
export function BarList({
  points,
  format,
  highlight,
}: {
  points: SeriesPoint[];
  format: (value: number) => string;
  highlight?: (point: SeriesPoint) => boolean;
}) {
  const max = Math.max(...points.map((p) => p.value), 0) || 1;
  return (
    <ul className="space-y-2">
      {points.map((p) => (
        <li key={p.label} className="grid grid-cols-[minmax(7rem,10rem)_1fr_auto] items-center gap-3 text-sm">
          <span className={highlight?.(p) ? "font-bold" : ""}>{p.label}</span>
          <span className="h-4 rounded-full bg-rose-baby" aria-hidden>
            <span
              className={`block h-4 rounded-full ${highlight?.(p) ? "bg-rose-deep" : "bg-rose-deep/60"}`}
              style={{ width: `${(p.value / max) * 100}%` }}
            />
          </span>
          <span className="tabular-nums">{format(p.value)}</span>
        </li>
      ))}
    </ul>
  );
}
