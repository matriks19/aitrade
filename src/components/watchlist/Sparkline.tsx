interface SparklineProps {
  data: number[];
  positive: boolean;
}

/** İzleme listesi satırlarındaki küçük fiyat eğrisi. */
export function Sparkline({ data, positive }: SparklineProps) {
  const width = 62;
  const height = 26;
  const padding = 2;

  if (data.length < 2) {
    return <span className="sparkline sparkline-empty" aria-hidden="true" />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const color = positive ? "#22c55e" : "#ef4444";
  const areaPath = `M${padding},${height - padding} L${points.join(" L")} L${
    width - padding
  },${height - padding} Z`;

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity="0.12" />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
