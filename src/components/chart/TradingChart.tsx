"use client";

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
  type CandlestickData,
  type HistogramData,
  type IChartApi,
  type ISeriesApi,
  type MouseEventParams,
  type SeriesType,
  type UTCTimestamp,
} from "lightweight-charts";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

import { ChartLegend, type LegendSnapshot } from "@/components/chart/ChartLegend";
import { DrawingOverlay } from "@/components/chart/DrawingOverlay";
import { drawingKey, type Drawing, type NewDrawing } from "@/lib/drawings";
import { calculateBollingerBands, calculateEMA, calculateMACD, calculateRSI } from "@/lib/indicators";
import type { Candle } from "@/lib/market-data/types";
import { useTradingStore } from "@/store/useTradingStore";

interface ChartBundle {
  chart: IChartApi;
  candleSeries: ISeriesApi<"Candlestick">;
  volumeSeries: ISeriesApi<"Histogram">;
}

export interface TradingChartHandle {
  fitContent: () => void;
}

const EMPTY_DRAWINGS: Drawing[] = [];

interface IndicatorRegistry {
  chart: IChartApi | null;
  series: ISeriesApi<SeriesType>[];
}

/** Ana grafik: mumlar, hacim, göstergeler ve çizim katmanı. */
export const TradingChart = forwardRef<TradingChartHandle>(function TradingChart(_props, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const registryRef = useRef<IndicatorRegistry>({ chart: null, series: [] });
  const lastFitKeyRef = useRef("");
  const labelVersionRef = useRef(0);

  const [bundle, setBundle] = useState<ChartBundle | null>(null);
  const [hovered, setHovered] = useState<LegendSnapshot | null>(null);

  const symbol = useTradingStore((state) => state.symbol);
  const timeframe = useTradingStore((state) => state.timeframe);
  const candles = useTradingStore((state) => state.candles);
  const indicators = useTradingStore((state) => state.indicators);
  const drawingTool = useTradingStore((state) => state.drawingTool);
  const drawingsMap = useTradingStore((state) => state.drawings);
  const addDrawing = useTradingStore((state) => state.addDrawing);
  const setDrawingTool = useTradingStore((state) => state.setDrawingTool);

  const drawings = drawingsMap[drawingKey(symbol, timeframe)] ?? EMPTY_DRAWINGS;

  useImperativeHandle(
    ref,
    () => ({
      fitContent: () => bundle?.chart.timeScale().fitContent(),
    }),
    [bundle],
  );

  // Grafik örneğini yalnızca bir kez oluştur.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "#080d16" },
        textColor: "#7f8ea6",
        fontSize: 11,
        fontFamily: 'Inter, "Segoe UI", system-ui, sans-serif',
        attributionLogo: false,
        panes: {
          enableResize: true,
          separatorColor: "#1a2434",
          separatorHoverColor: "rgba(59, 130, 246, 0.18)",
        },
      },
      grid: {
        vertLines: { color: "#0f1725" },
        horzLines: { color: "#0f1725" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(148, 163, 184, 0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
        horzLine: {
          color: "rgba(148, 163, 184, 0.35)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#1e293b",
        },
      },
      rightPriceScale: {
        borderColor: "#182233",
        scaleMargins: { top: 0.08, bottom: 0.24 },
      },
      timeScale: {
        borderColor: "#182233",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 6,
        barSpacing: 8,
        minBarSpacing: 2,
        lockVisibleTimeRangeOnResize: true,
      },
      localization: { locale: "tr-TR" },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      priceLineColor: "#3b82f6",
      priceLineWidth: 1,
      lastValueVisible: true,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceScaleId: "volume",
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    registryRef.current = { chart, series: [] };
    setBundle({ chart, candleSeries, volumeSeries });

    return () => {
      registryRef.current = { chart: null, series: [] };
      chart.remove();
    };
  }, []);

  // Mum ve hacim verisini güncelle; sembol/timeframe değişiminde görünümü sığdır.
  useEffect(() => {
    if (!bundle || candles.length === 0) return;

    const candleData: CandlestickData<UTCTimestamp>[] = candles.map((candle) => ({
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    const volumeData: HistogramData<UTCTimestamp>[] = candles.map((candle, index) => ({
      time: candle.time as UTCTimestamp,
      value: candle.volume,
      color:
        index > 0 && candle.close < candles[index - 1].close
          ? "rgba(239, 68, 68, 0.28)"
          : "rgba(34, 197, 94, 0.28)",
    }));

    bundle.candleSeries.setData(candleData);
    bundle.volumeSeries.setData(volumeData);

    const fitKey = `${symbol}:${timeframe}`;
    if (lastFitKeyRef.current !== fitKey) {
      lastFitKeyRef.current = fitKey;
      window.requestAnimationFrame(() => bundle.chart.timeScale().fitContent());
    }
  }, [bundle, candles, symbol, timeframe]);

  // Göstergeleri oluştur/kaldır ve alt panelleri yönet.
  useEffect(() => {
    if (!bundle || candles.length === 0) return;

    const { chart } = bundle;
    const registry = registryRef.current;

    if (registry.chart === chart) {
      for (const series of registry.series) {
        try {
          chart.removeSeries(series);
        } catch {
          // Seri zaten kaldırılmış olabilir.
        }
      }
    }

    registry.chart = chart;
    registry.series = [];

    containerRef.current
      ?.querySelectorAll<HTMLElement>("[data-pane-label]")
      .forEach((element) => element.remove());

    while (chart.panes().length > 1) {
      chart.removePane(chart.panes().length - 1);
    }

    const labelVersion = (labelVersionRef.current += 1);

    // Pane DOM'u bir sonraki karede hazır olabildiği için kısa bir retry döngüsü.
    const schedulePaneLabel = (
      paneIndex: number,
      text: string,
      color: string,
      attempt = 0,
    ) => {
      if (labelVersion !== labelVersionRef.current) return;

      const element = chart.panes()[paneIndex]?.getHTMLElement();
      if (!element) {
        if (attempt < 30) {
          window.requestAnimationFrame(() =>
            schedulePaneLabel(paneIndex, text, color, attempt + 1),
          );
        }
        return;
      }

      if (getComputedStyle(element).position === "static") {
        element.style.position = "relative";
      }

      const label = document.createElement("div");
      label.className = "pane-label";
      label.dataset.paneLabel = "true";
      label.textContent = text;
      label.style.color = color;
      element.appendChild(label);
    };

    const addLine = (
      data: { time: number; value: number }[],
      color: string,
      lineWidth: 1 | 2 = 2,
      lineStyle: LineStyle = LineStyle.Solid,
    ) => {
      const series = chart.addSeries(LineSeries, {
        color,
        lineWidth,
        lineStyle,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      series.setData(
        data.map((point) => ({ time: point.time as UTCTimestamp, value: point.value })),
      );
      registry.series.push(series);
      return series;
    };

    if (indicators.ema20) {
      addLine(calculateEMA(candles, 20), "#38bdf8", 2);
    }
    if (indicators.ema50) {
      addLine(calculateEMA(candles, 50), "#f59e0b", 2);
    }
    if (indicators.bollinger) {
      const bands = calculateBollingerBands(candles, 20, 2);
      addLine(bands.upper, "rgba(167, 139, 250, 0.6)", 1, LineStyle.Dotted);
      addLine(bands.middle, "rgba(167, 139, 250, 0.9)", 1, LineStyle.Dashed);
      addLine(bands.lower, "rgba(167, 139, 250, 0.6)", 1, LineStyle.Dotted);
    }

    if (indicators.rsi) {
      chart.addPane();
      const paneIndex = chart.panes().length - 1;
      const rsiSeries = chart.addSeries(
        LineSeries,
        {
          color: "#c084fc",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
          priceFormat: { type: "price", precision: 0, minMove: 1 },
        },
        paneIndex,
      );

      rsiSeries.setData(
        calculateRSI(candles, 14).map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.value,
        })),
      );

      rsiSeries.createPriceLine({
        price: 70,
        color: "rgba(239, 68, 68, 0.6)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "70",
      });
      rsiSeries.createPriceLine({
        price: 30,
        color: "rgba(34, 197, 94, 0.6)",
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: "30",
      });
      rsiSeries.createPriceLine({
        price: 50,
        color: "rgba(148, 163, 184, 0.35)",
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: false,
        title: "50",
      });

      rsiSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.15, bottom: 0.15 },
        borderColor: "#182233",
      });

      registry.series.push(rsiSeries);
      schedulePaneLabel(paneIndex, "RSI 14", "#c084fc");
    }

    if (indicators.macd) {
      chart.addPane();
      const paneIndex = chart.panes().length - 1;
      const macd = calculateMACD(candles, 12, 26, 9);

      const histogramSeries = chart.addSeries(
        HistogramSeries,
        {
          priceLineVisible: false,
          lastValueVisible: false,
          priceFormat: { type: "price", precision: 2, minMove: 0.01 },
          base: 0,
        },
        paneIndex,
      );
      histogramSeries.setData(
        macd.histogram.map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.value,
          color: point.value >= 0 ? "rgba(34, 197, 94, 0.5)" : "rgba(239, 68, 68, 0.5)",
        })),
      );

      const macdSeries = chart.addSeries(
        LineSeries,
        {
          color: "#2dd4bf",
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        paneIndex,
      );
      macdSeries.setData(
        macd.macd.map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.value,
        })),
      );

      const signalSeries = chart.addSeries(
        LineSeries,
        {
          color: "#f472b6",
          lineWidth: 1,
          priceLineVisible: false,
          lastValueVisible: false,
          crosshairMarkerVisible: false,
        },
        paneIndex,
      );
      signalSeries.setData(
        macd.signal.map((point) => ({
          time: point.time as UTCTimestamp,
          value: point.value,
        })),
      );

      histogramSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.15, bottom: 0.15 },
        borderColor: "#182233",
      });

      registry.series.push(histogramSeries, macdSeries, signalSeries);
      schedulePaneLabel(paneIndex, "MACD 12 26 9", "#2dd4bf");
    }

    window.requestAnimationFrame(() => {
      chart.panes().forEach((pane, index) => {
        pane.setStretchFactor(index === 0 ? 3.2 : 1);
      });
    });
  }, [bundle, candles, indicators]);

  // Üstteki OHLCV şeridi için crosshair takibi.
  useEffect(() => {
    if (!bundle) return;

    const handler = (param: MouseEventParams) => {
      if (!param.point || typeof param.time !== "number") {
        setHovered(null);
        return;
      }

      const candleData = param.seriesData.get(bundle.candleSeries) as
        | CandlestickData
        | undefined;

      if (!candleData || typeof candleData.open !== "number") {
        setHovered(null);
        return;
      }

      const volumeData = param.seriesData.get(bundle.volumeSeries) as
        | HistogramData
        | undefined;

      setHovered({
        time: Number(param.time),
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: volumeData?.value ?? 0,
      });
    };

    bundle.chart.subscribeCrosshairMove(handler);
    return () => bundle.chart.unsubscribeCrosshairMove(handler);
  }, [bundle]);

  // Sembol değişince eski crosshair bilgisini temizle.
  useEffect(() => {
    setHovered(null);
  }, [symbol, timeframe]);

  // Escape ile çizim modundan çık.
  useEffect(() => {
    if (drawingTool === "none") return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawingTool("none");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawingTool, setDrawingTool]);

  const handleAddDrawing = (drawing: NewDrawing) => {
    addDrawing(drawing);
    setDrawingTool("none");
  };

  const lastCandle: Candle | undefined = candles[candles.length - 1];
  const defaultSnapshot: LegendSnapshot | null = lastCandle
    ? {
        time: lastCandle.time,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
        volume: lastCandle.volume,
      }
    : null;

  return (
    <div className="chart-shell">
      <div ref={containerRef} className="chart-canvas" />
      <ChartLegend
        snapshot={hovered ?? defaultSnapshot}
        timeframe={timeframe}
        isHovering={hovered !== null}
      />
      {bundle && (
        <DrawingOverlay
          chart={bundle.chart}
          series={bundle.candleSeries}
          drawings={drawings}
          tool={drawingTool}
          onAdd={handleAddDrawing}
        />
      )}
    </div>
  );
});
