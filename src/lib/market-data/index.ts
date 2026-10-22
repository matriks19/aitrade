import { MockMarketDataProvider } from "./mock-provider";

/**
 * Uygulamanın tek veri giriş noktası.
 *
 * Gerçek BIST API'sine geçmek için:
 *   1. `MarketDataProvider` arayüzünü uygulayan yeni bir sınıf yazın
 *      (örn. `BistRestProvider`).
 *   2. Aşağıdaki satırı `new BistRestProvider(...)` ile değiştirin.
 * UI bileşenlerinde başka hiçbir değişiklik gerekmez.
 */
export const marketData = new MockMarketDataProvider();

export * from "./mock-provider";
export * from "./symbols";
export * from "./types";
