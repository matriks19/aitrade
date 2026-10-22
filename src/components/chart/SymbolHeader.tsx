"use client";

import { formatCompact, formatPercent, formatPrice, formatSignedPrice } from "@/lib/format";
import { getSymbolInfo } from "@/lib/market-data/symbols";
import { useTradingStore } from "@/store/useTradingStore";

/** Grafik panelinin üst kısmındaki sembol kimliği ve günlük fiyat özeti. */
export function SymbolHeader() {
  const symbol = useTradingStore((state) => state.symbol);
  const quote = useTradingStore((state) => state.quote);
  const info = getSymbolInfo(symbol);

  const positive = (quote?.change ?? 0) >= 0;
  const direction = quote ? (positive ? "is-up" : "is-down") : "";

  return (
    <header className="symbol-header">
      <div className="symbol-identity">
        <span className="symbol-avatar" aria-hidden="true">
          {info.symbol.slice(0, 2)}
        </span>
        <div className="symbol-meta">
          <div className="symbol-title-row">
            <h1>{info.symbol}</h1>
            <span className="exchange-badge">BIST</span>
            <span className="sector-badge">{info.sector}</span>
          </div>
          <p>
            {info.name} <span className="dot-separator">·</span> {info.currency}
          </p>
        </div>
      </div>

      <div className="quote-block">
        <div className="quote-main">
          <span className={`quote-price ${direction}`}>
            {quote ? formatPrice(quote.price) : "—"}
          </span>
          <span className={`quote-change ${direction}`}>
            {quote ? `${formatSignedPrice(quote.change)}  ${formatPercent(quote.changePercent)}` : "—"}
          </span>
        </div>

        <dl className="quote-stats">
          <div>
            <dt>Açılış</dt>
            <dd>{formatPrice(quote?.open)}</dd>
          </div>
          <div>
            <dt>Yüksek</dt>
            <dd>{formatPrice(quote?.high)}</dd>
          </div>
          <div>
            <dt>Düşük</dt>
            <dd>{formatPrice(quote?.low)}</dd>
          </div>
          <div>
            <dt>Hacim</dt>
            <dd>{formatCompact(quote?.volume)}</dd>
          </div>
        </dl>
      </div>
    </header>
  );
}
