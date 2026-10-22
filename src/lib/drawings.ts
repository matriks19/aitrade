import type { Timeframe } from "@/lib/market-data/types";

/** Grafik üzerindeki çizim araçları. */
export type DrawingTool = "none" | "trendline" | "horizontal";

export type DrawingType = Exclude<DrawingTool, "none">;

export interface DrawingPoint {
  /** UNIX epoch (saniye) - grafik serisiyle aynı zaman ekseni. */
  time: number;
  price: number;
}

export interface Drawing {
  id: string;
  type: DrawingType;
  points: DrawingPoint[];
  color: string;
}

export type NewDrawing = Omit<Drawing, "id">;

/** Çizimler sembol + zaman aralığı bazında saklanır. */
export function drawingKey(symbol: string, timeframe: Timeframe): string {
  return `${symbol}:${timeframe}`;
}

export function createDrawingId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `drawing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
