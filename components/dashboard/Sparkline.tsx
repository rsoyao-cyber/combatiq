// Tiny trend line for 0–max values. Gaps (null) break the line rather than
// being drawn as zero, so missed check-ins don't look like a crash.
export function Sparkline({
  values,
  max = 5,
  width = 88,
  height = 24,
  label,
}: {
  values: (number | null)[];
  max?: number;
  width?: number;
  height?: number;
  label: string;
}) {
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const y = (v: number) => height - 2 - (v / max) * (height - 4);

  // Split into runs of consecutive values
  const runs: string[] = [];
  let current: string[] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (current.length) runs.push(current.join(" "));
      current = [];
    } else {
      current.push(`${(i * step).toFixed(1)},${y(v).toFixed(1)}`);
    }
  });
  if (current.length) runs.push(current.join(" "));

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} className="shrink-0">
      <line x1="0" x2={width} y1={y(max / 2)} y2={y(max / 2)} className="stroke-border" strokeDasharray="2 3" />
      {runs.map((points, i) =>
        points.includes(" ") ? (
          <polyline key={i} points={points} fill="none" className="stroke-primary" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        ) : (
          <circle key={i} cx={points.split(",")[0]} cy={points.split(",")[1]} r={2} className="fill-primary" />
        ),
      )}
    </svg>
  );
}
