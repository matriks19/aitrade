import { getSymbolInfo } from "./symbols";
import type { Candle, MarketDataProvider, Quote, Timeframe } from "./types";
import { TIMEFRAMES } from "./types";

/**
 * Deterministik mock veri üretici.
 *
 * Tüm zaman aralıkları aynı günlük fiyat yolundan türetilir:
 *   - Günlük seri sembol bazında sabit ve deterministiktir.
 *   - 1m verisi her gün için ayrı üretilir ve daha yüksek aralıklara
 *     (5m, 15m, 1h, 4h) gerçek OHLCV agregasyonu ile toplanır.
 *
 * Böylece farklı zaman aralıkları arasında son fiyat tutarlı kalır ve
 * gerçek API'ye geçildiğinde davranış beklentisi aynı olur.
 */

const DAY_SECONDS = 86_400;
const MINUTE_SECONDS = 60;

/** BIST seansı: 10:00 - 18:00 (Europe/Istanbul) = 07:00 - 15:00 UTC. */
const SESSION_START_SECONDS = 7 * 3_600;
const SESSION_END_SECONDS = 15 * 3_600;
const SESSION_MINUTES = (SESSION_END_SECONDS - SESSION_START_SECONDS) / MINUTE_SECONDS;

/** Tüm hesaplamalarda kullanılan sabit günlük geçmiş. */
const DAILY_HISTORY = 600;
const MOCK_LATENCY_MS = 90;

const dailyCache = new Map<string, Candle[]>();
const candleCache = new Map<string, Candle[]>();

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getTimeframeSeconds(timeframe: Timeframe): number {
  return TIMEFRAMES.find((item) => item.value === timeframe)?.seconds ?? DAY_SECONDS;
}

function hashString(value: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}

/** Küçük ve hızlı bir PRNG (mulberry32). */
function mulberry32(seed: number): () => number {
  let value = seed;
  return () => {
    value |= 0;
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function isWeekend(timestamp: number): boolean {
  const day = new Date(timestamp * 1_000).getUTCDay();
  return day === 0 || day === 6;
}

function startOfUtcDay(timestamp: number): number {
  return Math.floor(timestamp / DAY_SECONDS) * DAY_SECONDS;
}

function previousWeekday(dayStart: number): number {
  let cursor = dayStart - DAY_SECONDS;
  while (isWeekend(cursor)) cursor -= DAY_SECONDS;
  return cursor;
}

function previousTradingDay(timestamp: number): number {
  let cursor = timestamp - DAY_SECONDS;
  while (isWeekend(cursor)) cursor -= DAY_SECONDS;
  return cursor;
}

function latestDailyClose(now: number): number {
  const todayClose = startOfUtcDay(now) + SESSION_END_SECONDS;
  if (todayClose <= now && !isWeekend(todayClose)) return todayClose;
  const previousDay = previousWeekday(startOfUtcDay(now));
  return previousDay + SESSION_END_SECONDS;
}

function latestIntradayBarStart(now: number, timeframeSeconds: number): number {
  const todayStart = startOfUtcDay(now);
  const sessionStart = todayStart + SESSION_START_SECONDS;
  const sessionEnd = todayStart + SESSION_END_SECONDS;

  if (isWeekend(now) || now < sessionStart) {
    const previousDay = previousWeekday(todayStart);
    return previousDay + SESSION_END_SECONDS - timeframeSeconds;
  }
  if (now >= sessionEnd) return sessionEnd - timeframeSeconds;

  const elapsedBars = Math.floor((now - sessionStart) / timeframeSeconds);
  return sessionStart + elapsedBars * timeframeSeconds;
}

function previousIntradayBar(current: number, timeframeSeconds: number): number {
  const todayStart = startOfUtcDay(current);
  const sessionStart = todayStart + SESSION_START_SECONDS;

  if (current - timeframeSeconds >= sessionStart) return current - timeframeSeconds;
  const previousDay = previousWeekday(todayStart);
  return previousDay + SESSION_END_SECONDS - timeframeSeconds;
}

/** Seans saatlerine hizalı, artan sıralı zaman damgaları üretir. */
function buildTimeGrid(timeframe: Timeframe, count: number): number[] {
  const timeframeSeconds = getTimeframeSeconds(timeframe);
  const now = Math.floor(Date.now() / 1_000);
  const times = new Array<number>(count);

  if (timeframe === "1D") {
    let cursor = latestDailyClose(now);
    for (let index = count - 1; index >= 0; index -= 1) {
      times[index] = cursor;
      cursor = previousTradingDay(cursor);
    }
    return times;
  }

  let cursor = latestIntradayBarStart(now, timeframeSeconds);
  for (let index = count - 1; index >= 0; index -= 1) {
    times[index] = cursor;
    cursor = previousIntradayBar(cursor, timeframeSeconds);
  }
  return times;
}

function roundPrice(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Sembolün sabit günlük serisi. Tüm zaman aralıkları bu seriden türetilir,
 * böylece 1D grafik ile intraday grafiklerin son kapanışı aynı olur.
 */
function getDailySeries(symbol: string): Candle[] {
  const cacheKey = `${symbol}:${latestDailyClose(Math.floor(Date.now() / 1_000))}`;
  const cached = dailyCache.get(cacheKey);
  if (cached) return cached;

  const info = getSymbolInfo(symbol);
  const times = buildTimeGrid("1D", DAILY_HISTORY);
  const random = mulberry32(hashString(`${symbol}:daily:aitrade`));

  let previousClose = info.basePrice * (0.88 + random() * 0.24);
  const candles: Candle[] = [];

  for (let index = 0; index < DAILY_HISTORY; index += 1) {
    const gap = (random() - 0.5) * info.dailyVolatility * 0.3;
    const open = previousClose * (1 + gap);

    const meanReversion = (info.basePrice / previousClose - 1) * 0.004;
    const drift = (random() - 0.5) * info.dailyVolatility * 2.1 + meanReversion;
    const close = Math.max(0.5, open * (1 + drift));

    const wickRange = info.dailyVolatility * (0.25 + random() * 0.9);
    const highRaw = Math.max(open, close) * (1 + wickRange);
    const lowRaw = Math.min(open, close) * (1 - wickRange);

    const openPrice = roundPrice(open);
    const closePrice = roundPrice(close);
    const high = Math.max(roundPrice(highRaw), openPrice, closePrice);
    const low = Math.min(roundPrice(lowRaw), openPrice, closePrice);

    const volume = Math.max(
      10_000,
      Math.round(info.baseVolume * (0.55 + random() * 1.15) * (1 + Math.abs(drift) * 18)),
    );

    candles.push({
      time: times[index],
      open: openPrice,
      high,
      low,
      close: closePrice,
      volume,
    });

    previousClose = close;
  }

  dailyCache.set(cacheKey, candles);
  return candles;
}

/**
 * Bir günün 1 dakikalık mumlarını üretir.
 *
 * Brownian bridge kullanarak günün açılışından kapanışına yumuşak bir yol
 * oluşturur; böylece günlük kapanış ile intraday son kapanış birebir eşleşir.
 */
function generateMinuteDay(symbol: string, daily: Candle): Candle[] {
  const random = mulberry32(hashString(`${symbol}:${daily.time}:1m`));
  const sessionStart = daily.time - SESSION_END_SECONDS + SESSION_START_SECONDS;
  const range = Math.max(daily.high - daily.low, daily.close * 0.002);
  const stepVolatility = (range / daily.close / 16) * 0.6;

  const walk: number[] = [];
  let value = 0;
  for (let index = 0; index < SESSION_MINUTES; index += 1) {
    value += (random() + random() + random() - 1.5) * stepVolatility;
    walk.push(value);
  }
  const endWalk = walk[walk.length - 1] ?? 0;

  const closes: number[] = [];
  for (let index = 0; index < SESSION_MINUTES; index += 1) {
    const progress = (index + 1) / SESSION_MINUTES;
    const bridge = walk[index] - progress * endWalk;
    const price =
      daily.open + (daily.close - daily.open) * progress + bridge * daily.close;
    closes.push(Math.min(daily.high, Math.max(daily.low, price)));
  }
  closes[closes.length - 1] = daily.close;

  // Günlük hacmi mumlara ağırlıklı olarak dağıt.
  const weights = closes.map(() => 0.45 + random() * 1.1);
  const weightSum = weights.reduce((total, weight) => total + weight, 0);

  const candles: Candle[] = [];
  let previousClose = daily.open;

  for (let index = 0; index < SESSION_MINUTES; index += 1) {
    const open = previousClose;
    const close = closes[index];
    const wick = 0.00015 + random() * 0.00045;

    const high = Math.min(daily.high, Math.max(open, close) * (1 + wick));
    const low = Math.max(daily.low, Math.min(open, close) * (1 - wick));

    candles.push({
      time: sessionStart + index * MINUTE_SECONDS,
      open: roundPrice(open),
      high: roundPrice(high),
      low: roundPrice(low),
      close: roundPrice(close),
      volume: Math.max(
        100,
        Math.round((daily.volume * weights[index]) / weightSum),
      ),
    });

    previousClose = close;
  }

  return candles;
}

/** 1m mumları istenen zaman aralığına gerçek OHLCV agregasyonu ile toplar. */
function aggregateCandles(bars: Candle[], timeframeSeconds: number): Candle[] {
  const groupSize = Math.max(1, Math.round(timeframeSeconds / MINUTE_SECONDS));
  if (groupSize === 1) return bars;

  const aggregated: Candle[] = [];
  for (let index = 0; index < bars.length; index += groupSize) {
    const group = bars.slice(index, index + groupSize);
    if (group.length === 0) continue;

    let high = group[0].high;
    let low = group[0].low;
    let volume = 0;

    for (const bar of group) {
      if (bar.high > high) high = bar.high;
      if (bar.low < low) low = bar.low;
      volume += bar.volume;
    }

    aggregated.push({
      time: group[0].time,
      open: group[0].open,
      high,
      low,
      close: group[group.length - 1].close,
      volume,
    });
  }

  return aggregated;
}

export function generateMockCandles(
  symbol: string,
  timeframe: Timeframe,
  count = 500,
): Candle[] {
  const daily = getDailySeries(symbol);
  const safeCount = Math.max(1, Math.min(count, DAILY_HISTORY * 2));
  const cacheKey = `${symbol}:${timeframe}:${safeCount}:${daily[daily.length - 1].time}`;
  const cached = candleCache.get(cacheKey);
  if (cached) return cached;

  let result: Candle[];

  if (timeframe === "1D") {
    result = daily.slice(-safeCount);
  } else {
    const timeframeSeconds = getTimeframeSeconds(timeframe);
    const barsPerDay = Math.max(
      1,
      Math.round((SESSION_END_SECONDS - SESSION_START_SECONDS) / timeframeSeconds),
    );
    const daysNeeded = Math.min(
      daily.length,
      Math.ceil(safeCount / barsPerDay) + 1,
    );

    const minuteBars: Candle[] = [];
    for (const day of daily.slice(-daysNeeded)) {
      minuteBars.push(...generateMinuteDay(symbol, day));
    }

    result = aggregateCandles(minuteBars, timeframeSeconds).slice(-safeCount);
  }

  candleCache.set(cacheKey, result);
  return result;
}

export function generateMockQuote(symbol: string): Quote {
  const daily = getDailySeries(symbol);
  const last = daily[daily.length - 1];
  const previous = daily[daily.length - 2] ?? last;

  // İzleme listesinin canlı hissettirmesi için çok küçük, deterministik bir salınım.
  const wobble =
    Math.sin(Date.now() / 45_000 + (hashString(symbol) % 360) * (Math.PI / 180)) *
    0.0012;
  const price = roundPrice(last.close * (1 + wobble));
  const change = roundPrice(price - previous.close);

  return {
    symbol,
    price,
    previousClose: previous.close,
    change,
    changePercent: previous.close === 0 ? 0 : (change / previous.close) * 100,
    open: last.open,
    high: last.high,
    low: last.low,
    volume: last.volume,
    updatedAt: Math.floor(Date.now() / 1_000),
  };
}

export class MockMarketDataProvider implements MarketDataProvider {
  readonly id = "mock";
  readonly label = "Mock veri";

  async getCandles(symbol: string, timeframe: Timeframe, count = 500): Promise<Candle[]> {
    await wait(MOCK_LATENCY_MS);
    return generateMockCandles(symbol, timeframe, count);
  }

  async getQuote(symbol: string): Promise<Quote> {
    await wait(MOCK_LATENCY_MS / 2);
    return generateMockQuote(symbol);
  }

  async getQuotes(symbols: string[]): Promise<Quote[]> {
    await wait(MOCK_LATENCY_MS);
    return symbols.map((symbol) => generateMockQuote(symbol));
  }
}

/** İzleme listesindeki tüm sembollerin sparkline kapanışları. */
export function generateSparkline(symbol: string, count = 30): number[] {
  return generateMockCandles(symbol, "1D", count).map((candle) => candle.close);
}
