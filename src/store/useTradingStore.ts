"use client";

import { create } from "zustand";

import {
  createDrawingId,
  drawingKey,
  type Drawing,
  type DrawingTool,
  type NewDrawing,
} from "@/lib/drawings";
import {
  DEFAULT_INDICATORS,
  type IndicatorKey,
  type IndicatorState,
} from "@/lib/indicators/meta";
import { DEFAULT_SYMBOL } from "@/lib/market-data/symbols";
import { marketData } from "@/lib/market-data";
import {
  DEFAULT_TIMEFRAME,
  type Candle,
  type Quote,
  type Timeframe,
} from "@/lib/market-data/types";

type LoadStatus = "idle" | "loading" | "ready" | "error";

interface TradingState {
  symbol: string;
  timeframe: Timeframe;
  candles: Candle[];
  quote: Quote | null;
  status: LoadStatus;
  error: string | null;
  indicators: IndicatorState;
  drawingTool: DrawingTool;
  drawings: Record<string, Drawing[]>;

  setSymbol: (symbol: string) => void;
  setTimeframe: (timeframe: Timeframe) => void;
  loadCandles: () => Promise<void>;
  toggleIndicator: (key: IndicatorKey) => void;
  resetIndicators: () => void;
  setDrawingTool: (tool: DrawingTool) => void;
  addDrawing: (drawing: NewDrawing) => void;
  undoDrawing: () => void;
  clearDrawings: () => void;
}

/**
 * Hızlı sembol / zaman aralığı değişimlerinde eski isteğin yeni veriyi
 * ezmesini engellemek için modül seviyesinde istek sayacı.
 */
let requestSequence = 0;

export const useTradingStore = create<TradingState>((set, get) => ({
  symbol: DEFAULT_SYMBOL,
  timeframe: DEFAULT_TIMEFRAME,
  candles: [],
  quote: null,
  status: "idle",
  error: null,
  indicators: { ...DEFAULT_INDICATORS },
  drawingTool: "none",
  drawings: {},

  setSymbol: (symbol) => {
    if (symbol === get().symbol) return;
    set({ symbol, drawingTool: "none" });
    void get().loadCandles();
  },

  setTimeframe: (timeframe) => {
    if (timeframe === get().timeframe) return;
    set({ timeframe, drawingTool: "none" });
    void get().loadCandles();
  },

  loadCandles: async () => {
    const { symbol, timeframe } = get();
    const requestId = (requestSequence += 1);

    set({ status: "loading", error: null });

    try {
      const [candles, quote] = await Promise.all([
        marketData.getCandles(symbol, timeframe),
        marketData.getQuote(symbol),
      ]);

      // Bu istekten sonra başka bir istek atıldıysa sonucu yoksay.
      if (requestId !== requestSequence) return;

      set({ candles, quote, status: "ready", error: null });
    } catch (error) {
      if (requestId !== requestSequence) return;
      set({
        status: "error",
        error: error instanceof Error ? error.message : "Veri alınamadı.",
      });
    }
  },

  toggleIndicator: (key) => {
    set((state) => ({
      indicators: { ...state.indicators, [key]: !state.indicators[key] },
    }));
  },

  resetIndicators: () => {
    set({ indicators: { ...DEFAULT_INDICATORS } });
  },

  setDrawingTool: (tool) => {
    set({ drawingTool: tool });
  },

  addDrawing: (drawing) => {
    const { symbol, timeframe } = get();
    const key = drawingKey(symbol, timeframe);
    const next: Drawing = { ...drawing, id: createDrawingId() };

    set((state) => ({
      drawings: {
        ...state.drawings,
        [key]: [...(state.drawings[key] ?? []), next],
      },
    }));
  },

  undoDrawing: () => {
    const { symbol, timeframe } = get();
    const key = drawingKey(symbol, timeframe);
    const current = get().drawings[key] ?? [];
    if (current.length === 0) return;

    set((state) => ({
      drawings: {
        ...state.drawings,
        [key]: current.slice(0, -1),
      },
    }));
  },

  clearDrawings: () => {
    const { symbol, timeframe } = get();
    const key = drawingKey(symbol, timeframe);

    set((state) => ({
      drawings: {
        ...state.drawings,
        [key]: [],
      },
    }));
  },
}));
