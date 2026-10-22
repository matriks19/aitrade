"use client";

import { useEffect } from "react";

import { ChartPanel } from "@/components/chart/ChartPanel";
import { IndicatorPanel } from "@/components/indicators/IndicatorPanel";
import { StatusBar } from "@/components/layout/StatusBar";
import { TopBar } from "@/components/layout/TopBar";
import { Watchlist } from "@/components/watchlist/Watchlist";
import { useTradingStore } from "@/store/useTradingStore";

/**
 * Terminalin istemci tarafındaki kabuğu.
 * İlk açılışta varsayılan sembolün mumlarını yükler.
 */
export function TradingTerminal() {
  const loadCandles = useTradingStore((state) => state.loadCandles);

  useEffect(() => {
    void loadCandles();
  }, [loadCandles]);

  return (
    <div className="terminal">
      <TopBar />
      <Watchlist />
      <ChartPanel />
      <IndicatorPanel />
      <StatusBar />
    </div>
  );
}
