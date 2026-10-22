/**
 * Piyasa verisi katmanının ortak tipleri.
 *
 * Grafik, izleme listesi ve üst başlık yalnızca bu tipleri bilir.
 * Böylece ileride MockMarketDataProvider yerine gerçek bir BIST
 * sağlayıcısı (REST / WebSocket) takıldığında UI tarafı değişmez.
 */

/** Terminalde desteklenen zaman aralıkları. */
export const TIMEFRAMES = [
  { value: "1m", label: "1m", seconds: 60, title: "1 dakika" },
  { value: "5m", label: "5m", seconds: 300, title: "5 dakika" },
  { value: "15m", label: "15m", seconds: 900, title: "15 dakika" },
  { value: "1h", label: "1h", seconds: 3_600, title: "1 saat" },
  { value: "4h", label: "4h", seconds: 14_400, title: "4 saat" },
  { value: "1D", label: "1D", seconds: 86_400, title: "1 gün" },
] as const;

export type Timeframe = (typeof TIMEFRAMES)[number]["value"];

export const DEFAULT_TIMEFRAME: Timeframe = "1D";

/** Grafikte kullanılan tek bir OHLCV mumu. `time` UNIX epoch (saniye). */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** İzleme listesi ve sembol başlığı için anlık fiyat özeti. */
export interface Quote {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  updatedAt: number;
}

/** BIST sembolünün statik tanımı. */
export interface SymbolInfo {
  symbol: string;
  name: string;
  sector: string;
  exchange: "BIST";
  currency: "TRY";
  /** Mock üretiminde başlangıç fiyatı. */
  basePrice: number;
  /** Günlük baz volatilite (0.025 = %2.5). */
  dailyVolatility: number;
  /** Günlük ortalama işlem hacmi (lot). */
  baseVolume: number;
}

/**
 * Veri sağlayıcı sözleşmesi.
 *
 * Gerçek API'ye geçişte yeni bir sınıf yazıp sadece
 * `src/lib/market-data/index.ts` içindeki export'u değiştirmek yeterlidir.
 */
export interface MarketDataProvider {
  readonly id: string;
  readonly label: string;
  getCandles(symbol: string, timeframe: Timeframe, count?: number): Promise<Candle[]>;
  getQuote(symbol: string): Promise<Quote>;
  getQuotes(symbols: string[]): Promise<Quote[]>;
}
