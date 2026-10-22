import type { Candle } from "@/lib/market-data/types";

/** Grafik serilerine beslenen ortak gösterge noktası. */
export interface IndicatorPoint {
  time: number;
  value: number;
}

/**
 * Exponential Moving Average.
 * İlk değer SMA ile tohumlanır, ardından klasik EMA yinelemesi uygulanır.
 */
export function calculateEMA(candles: Candle[], period: number): IndicatorPoint[] {
  if (candles.length < period || period <= 0) return [];

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let index = 0; index < period; index += 1) sum += candles[index].close;

  let previous = sum / period;
  const points: IndicatorPoint[] = [{ time: candles[period - 1].time, value: previous }];

  for (let index = period; index < candles.length; index += 1) {
    previous = (candles[index].close - previous) * multiplier + previous;
    points.push({ time: candles[index].time, value: previous });
  }

  return points;
}

/** Wilder's RSI. 0-100 aralığında osilatör döndürür. */
export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (candles.length <= period || period <= 0) return [];

  let gains = 0;
  let losses = 0;
  for (let index = 1; index <= period; index += 1) {
    const delta = candles[index].close - candles[index - 1].close;
    if (delta >= 0) gains += delta;
    else losses -= delta;
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  const toRsi = (gain: number, loss: number): number => {
    if (loss === 0) return 100;
    const relativeStrength = gain / loss;
    return 100 - 100 / (1 + relativeStrength);
  };

  const points: IndicatorPoint[] = [
    { time: candles[period].time, value: toRsi(averageGain, averageLoss) },
  ];

  for (let index = period + 1; index < candles.length; index += 1) {
    const delta = candles[index].close - candles[index - 1].close;
    const gain = delta > 0 ? delta : 0;
    const loss = delta < 0 ? -delta : 0;

    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;

    points.push({ time: candles[index].time, value: toRsi(averageGain, averageLoss) });
  }

  return points;
}

export interface BollingerBands {
  upper: IndicatorPoint[];
  middle: IndicatorPoint[];
  lower: IndicatorPoint[];
}

/** Bollinger Bands: basit hareketli ortalama ± standart sapma. */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  multiplier = 2,
): BollingerBands {
  if (candles.length < period || period <= 0) return { upper: [], middle: [], lower: [] };

  const upper: IndicatorPoint[] = [];
  const middle: IndicatorPoint[] = [];
  const lower: IndicatorPoint[] = [];

  for (let index = period - 1; index < candles.length; index += 1) {
    let sum = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      sum += candles[cursor].close;
    }
    const mean = sum / period;

    let variance = 0;
    for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
      variance += (candles[cursor].close - mean) ** 2;
    }
    const standardDeviation = Math.sqrt(variance / period);

    middle.push({ time: candles[index].time, value: mean });
    upper.push({ time: candles[index].time, value: mean + multiplier * standardDeviation });
    lower.push({ time: candles[index].time, value: mean - multiplier * standardDeviation });
  }

  return { upper, middle, lower };
}

export interface MacdResult {
  macd: IndicatorPoint[];
  signal: IndicatorPoint[];
  histogram: IndicatorPoint[];
}

/** MACD (12, 26, 9). Tüm seriler aynı zaman damgalarında hizalanır. */
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  if (candles.length < slowPeriod + signalPeriod) {
    return { macd: [], signal: [], histogram: [] };
  }

  const emaWithNulls = (period: number): Array<number | null> => {
    const output = new Array<number | null>(candles.length).fill(null);
    if (candles.length < period) return output;

    const multiplier = 2 / (period + 1);
    let sum = 0;
    for (let index = 0; index < period; index += 1) sum += candles[index].close;

    let previous = sum / period;
    output[period - 1] = previous;
    for (let index = period; index < candles.length; index += 1) {
      previous = (candles[index].close - previous) * multiplier + previous;
      output[index] = previous;
    }
    return output;
  };

  const fast = emaWithNulls(fastPeriod);
  const slow = emaWithNulls(slowPeriod);

  const rawMacd: IndicatorPoint[] = [];
  for (let index = 0; index < candles.length; index += 1) {
    const fastValue = fast[index];
    const slowValue = slow[index];
    if (fastValue !== null && slowValue !== null) {
      rawMacd.push({ time: candles[index].time, value: fastValue - slowValue });
    }
  }

  if (rawMacd.length < signalPeriod) return { macd: [], signal: [], histogram: [] };

  const multiplier = 2 / (signalPeriod + 1);
  let signalSum = 0;
  for (let index = 0; index < signalPeriod; index += 1) signalSum += rawMacd[index].value;

  let signalValue = signalSum / signalPeriod;
  const signalPoints: IndicatorPoint[] = [
    { time: rawMacd[signalPeriod - 1].time, value: signalValue },
  ];

  for (let index = signalPeriod; index < rawMacd.length; index += 1) {
    signalValue = (rawMacd[index].value - signalValue) * multiplier + signalValue;
    signalPoints.push({ time: rawMacd[index].time, value: signalValue });
  }

  const signalByTime = new Map(signalPoints.map((point) => [point.time, point.value]));

  const macd: IndicatorPoint[] = [];
  const signal: IndicatorPoint[] = [];
  const histogram: IndicatorPoint[] = [];

  for (const point of rawMacd) {
    const signalPoint = signalByTime.get(point.time);
    if (signalPoint === undefined) continue;

    macd.push(point);
    signal.push({ time: point.time, value: signalPoint });
    histogram.push({ time: point.time, value: point.value - signalPoint });
  }

  return { macd, signal, histogram };
}
