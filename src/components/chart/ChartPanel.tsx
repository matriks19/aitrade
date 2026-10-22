"use client";

import { useRef } from "react";

import { ChartToolbar } from "@/components/chart/ChartToolbar";
import { SymbolHeader } from "@/components/chart/SymbolHeader";
import { TradingChart, type TradingChartHandle } from "@/components/chart/TradingChart";
import { useTradingStore } from "@/store/useTradingStore";

/** Sembol başlığı, araç çubuğu ve grafik alanını bir araya getirir. */
export function ChartPanel() {
  const chartRef = useRef<TradingChartHandle | null>(null);

  const drawingTool = useTradingStore((state) => state.drawingTool);
  const status = useTradingStore((state) => state.status);
  const candles = useTradingStore((state) => state.candles);
  const error = useTradingStore((state) => state.error);
  const loadCandles = useTradingStore((state) => state.loadCandles);

  const showLoadingOverlay = status === "loading" && candles.length === 0;
  const showErrorOverlay = status === "error" && candles.length === 0;

  return (
    <section className="chart-panel">
      <SymbolHeader />
      <ChartToolbar onFit={() => chartRef.current?.fitContent()} />

      <div className="chart-stage">
        <TradingChart ref={chartRef} />

        {drawingTool !== "none" && (
          <div className="drawing-hint" role="status">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path
                d="M3 16 17 4M3 16h4M3 16v-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>
              {drawingTool === "trendline"
                ? "Trend çizgisi: iki nokta seçin"
                : "Yatay çizgi: bir seviye seçin"}
            </span>
            <kbd>Esc</kbd>
          </div>
        )}

        {showLoadingOverlay && (
          <div className="chart-overlay">
            <span className="spinner" />
            <p>Piyasa verisi hazırlanıyor…</p>
          </div>
        )}

        {showErrorOverlay && (
          <div className="chart-overlay chart-overlay-error">
            <p>{error ?? "Veri yüklenemedi."}</p>
            <button type="button" className="primary-button" onClick={() => void loadCandles()}>
              Tekrar dene
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
