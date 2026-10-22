"use client";

import { TIMEFRAMES } from "@/lib/market-data/types";
import { useTradingStore } from "@/store/useTradingStore";

interface ChartToolbarProps {
  onFit: () => void;
}

/** Zaman aralığı seçimi ve grafik yardımcı kontrolleri. */
export function ChartToolbar({ onFit }: ChartToolbarProps) {
  const timeframe = useTradingStore((state) => state.timeframe);
  const setTimeframe = useTradingStore((state) => state.setTimeframe);
  const status = useTradingStore((state) => state.status);

  return (
    <div className="chart-toolbar">
      <div className="timeframe-group" role="group" aria-label="Zaman aralığı">
        {TIMEFRAMES.map((item) => (
          <button
            key={item.value}
            type="button"
            title={item.title}
            className={`timeframe-button${item.value === timeframe ? " is-active" : ""}`}
            onClick={() => setTimeframe(item.value)}
            aria-pressed={item.value === timeframe}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="toolbar-spacer" />

      <span className={`feed-status${status === "loading" ? " is-loading" : ""}`}>
        <span className="live-dot" />
        {status === "loading" ? "Güncelleniyor" : "Mock akış"}
      </span>

      <button type="button" className="toolbar-button" onClick={onFit}>
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M12 4h2.5A1.5 1.5 0 0 1 16 5.5V8M16 12v2.5a1.5 1.5 0 0 1-1.5 1.5H12M8 16H5.5A1.5 1.5 0 0 1 4 14.5V12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        Ekrana sığdır
      </button>
    </div>
  );
}
