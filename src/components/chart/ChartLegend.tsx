import { formatCandleTime, formatCompact, formatPrice } from "@/lib/format";
import type { Timeframe } from "@/lib/market-data/types";

export interface LegendSnapshot {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartLegendProps {
  snapshot: LegendSnapshot | null;
  timeframe: Timeframe;
  isHovering: boolean;
}

/** Grafik üzerinde imleçle birlikte hareket eden OHLCV bilgi şeridi. */
export function ChartLegend({ snapshot, timeframe, isHovering }: ChartLegendProps) {
  if (!snapshot) return null;

  const positive = snapshot.close >= snapshot.open;

  return (
    <div className={`chart-legend${isHovering ? " is-hovering" : ""}`}>
      <span className="legend-time">{formatCandleTime(snapshot.time, timeframe)}</span>
      <span className="legend-separator" />
      <span className="legend-item">
        A <b>{formatPrice(snapshot.open)}</b>
      </span>
      <span className="legend-item">
        Y <b>{formatPrice(snapshot.high)}</b>
      </span>
      <span className="legend-item">
        D <b>{formatPrice(snapshot.low)}</b>
      </span>
      <span className="legend-item">
        K <b className={positive ? "is-up" : "is-down"}>{formatPrice(snapshot.close)}</b>
      </span>
      <span className="legend-separator" />
      <span className="legend-item legend-volume">
        Hacim <b>{formatCompact(snapshot.volume)}</b>
      </span>
    </div>
  );
}
