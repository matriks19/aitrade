import type { SymbolInfo } from "./types";

/**
 * Terminal açılışında gösterilen BIST sembolleri.
 * Fiyatlar mock veri üretimi için başlangıç değerleridir; gerçek fiyat değildir.
 */
export const SYMBOLS: SymbolInfo[] = [
  {
    symbol: "THYAO",
    name: "Türk Hava Yolları",
    sector: "Ulaştırma",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 312.5,
    dailyVolatility: 0.025,
    baseVolume: 118_000_000,
  },
  {
    symbol: "ASELS",
    name: "Aselsan",
    sector: "Savunma",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 74.2,
    dailyVolatility: 0.028,
    baseVolume: 92_000_000,
  },
  {
    symbol: "KCHOL",
    name: "Koç Holding",
    sector: "Holding",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 198.4,
    dailyVolatility: 0.02,
    baseVolume: 34_000_000,
  },
  {
    symbol: "BIMAS",
    name: "BİM Mağazalar",
    sector: "Perakende",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 512.75,
    dailyVolatility: 0.015,
    baseVolume: 12_400_000,
  },
  {
    symbol: "TUPRS",
    name: "Tüpraş",
    sector: "Enerji",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 168.9,
    dailyVolatility: 0.022,
    baseVolume: 28_500_000,
  },
  {
    symbol: "GARAN",
    name: "Garanti BBVA",
    sector: "Bankacılık",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 148.3,
    dailyVolatility: 0.025,
    baseVolume: 86_000_000,
  },
  {
    symbol: "AKBNK",
    name: "Akbank",
    sector: "Bankacılık",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 72.45,
    dailyVolatility: 0.024,
    baseVolume: 104_000_000,
  },
  {
    symbol: "EREGL",
    name: "Ereğli Demir Çelik",
    sector: "Metal",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 31.8,
    dailyVolatility: 0.03,
    baseVolume: 156_000_000,
  },
  {
    symbol: "FROTO",
    name: "Ford Otosan",
    sector: "Otomotiv",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 1_285,
    dailyVolatility: 0.02,
    baseVolume: 3_800_000,
  },
  {
    symbol: "SISE",
    name: "Şişe Cam",
    sector: "Cam",
    exchange: "BIST",
    currency: "TRY",
    basePrice: 54.6,
    dailyVolatility: 0.023,
    baseVolume: 61_000_000,
  },
];

export const DEFAULT_SYMBOL = SYMBOLS[0].symbol;

export const SYMBOL_MAP: Record<string, SymbolInfo> = Object.fromEntries(
  SYMBOLS.map((item) => [item.symbol, item]),
);

export function getSymbolInfo(symbol: string): SymbolInfo {
  return SYMBOL_MAP[symbol] ?? SYMBOLS[0];
}
