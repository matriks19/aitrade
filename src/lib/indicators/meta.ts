export type IndicatorKey = "ema20" | "ema50" | "bollinger" | "rsi" | "macd";

export type IndicatorGroup = "overlay" | "oscillator";

export interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  group: IndicatorGroup;
}

/** Gösterge panelindeki sıra ve görsel kimlik bilgileri. */
export const INDICATOR_META: IndicatorMeta[] = [
  {
    key: "ema20",
    label: "EMA 20",
    shortLabel: "EMA 20",
    description: "Hızlı üstel hareketli ortalama",
    color: "#38bdf8",
    group: "overlay",
  },
  {
    key: "ema50",
    label: "EMA 50",
    shortLabel: "EMA 50",
    description: "Yavaş üstel hareketli ortalama",
    color: "#f59e0b",
    group: "overlay",
  },
  {
    key: "bollinger",
    label: "Bollinger Bands",
    shortLabel: "BB 20",
    description: "20 periyot · 2 standart sapma",
    color: "#a78bfa",
    group: "overlay",
  },
  {
    key: "rsi",
    label: "RSI",
    shortLabel: "RSI 14",
    description: "14 periyot · 30 / 70 eşikleri",
    color: "#c084fc",
    group: "oscillator",
  },
  {
    key: "macd",
    label: "MACD",
    shortLabel: "MACD 12 26 9",
    description: "12 / 26 / 9 momentum osilatörü",
    color: "#2dd4bf",
    group: "oscillator",
  },
];

export type IndicatorState = Record<IndicatorKey, boolean>;

export const DEFAULT_INDICATORS: IndicatorState = {
  ema20: true,
  ema50: true,
  bollinger: false,
  rsi: true,
  macd: false,
};
