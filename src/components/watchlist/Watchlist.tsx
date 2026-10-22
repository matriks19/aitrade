"use client";

import { useEffect, useMemo, useState } from "react";

import { Sparkline } from "@/components/watchlist/Sparkline";
import { formatPercent, formatPrice } from "@/lib/format";
import { generateSparkline, marketData } from "@/lib/market-data";
import { SYMBOLS } from "@/lib/market-data/symbols";
import type { Quote } from "@/lib/market-data/types";
import { useTradingStore } from "@/store/useTradingStore";

const QUOTE_REFRESH_MS = 15_000;

/** Sol panel: BIST sembollerini, fiyatları ve mini sparkline grafiklerini gösterir. */
export function Watchlist() {
  const selectedSymbol = useTradingStore((state) => state.symbol);
  const setSymbol = useTradingStore((state) => state.setSymbol);

  const [query, setQuery] = useState("");
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});

  // Sparkline'lar deterministik mock seriden bir kez üretilir.
  const sparklines = useMemo(
    () =>
      Object.fromEntries(
        SYMBOLS.map((item) => [item.symbol, generateSparkline(item.symbol, 32)]),
      ),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function refreshQuotes() {
      const nextQuotes = await marketData.getQuotes(SYMBOLS.map((item) => item.symbol));
      if (cancelled) return;
      setQuotes(
        Object.fromEntries(nextQuotes.map((quote) => [quote.symbol, quote])),
      );
    }

    void refreshQuotes();
    const timer = window.setInterval(() => void refreshQuotes(), QUOTE_REFRESH_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const filteredSymbols = useMemo(() => {
    const normalized = query.trim().toLocaleUpperCase("tr-TR");
    if (!normalized) return SYMBOLS;

    return SYMBOLS.filter(
      (item) =>
        item.symbol.includes(normalized) ||
        item.name.toLocaleUpperCase("tr-TR").includes(normalized),
    );
  }, [query]);

  return (
    <aside className="panel watchlist-panel">
      <div className="panel-header watchlist-header">
        <div>
          <h2>İzleme Listesi</h2>
          <p>BIST · {SYMBOLS.length} sembol</p>
        </div>
        <span className="count-badge">{filteredSymbols.length}</span>
      </div>

      <label className="watchlist-search">
        <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="m13.2 13.2 3.3 3.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Sembol ara..."
          aria-label="Sembol ara"
        />
      </label>

      <div className="watchlist-head" aria-hidden="true">
        <span>Sembol</span>
        <span />
        <span>Fiyat / Değişim</span>
      </div>

      <div className="watchlist-list">
        {filteredSymbols.map((item) => {
          const quote = quotes[item.symbol];
          const positive = (quote?.changePercent ?? 0) >= 0;
          const active = item.symbol === selectedSymbol;

          return (
            <button
              key={item.symbol}
              type="button"
              className={`watchlist-row${active ? " is-active" : ""}`}
              onClick={() => setSymbol(item.symbol)}
              aria-pressed={active}
            >
              <span className="watchlist-symbol">
                <span className="symbol-code">{item.symbol}</span>
                <span className="symbol-name">{item.name}</span>
              </span>

              <Sparkline data={sparklines[item.symbol] ?? []} positive={positive} />

              <span className="watchlist-price">
                <span className={`watchlist-last${positive ? " is-up" : " is-down"}`}>
                  {quote ? formatPrice(quote.price) : "—"}
                </span>
                <span className={`change-pill${positive ? " is-up" : " is-down"}`}>
                  {quote ? formatPercent(quote.changePercent) : "—"}
                </span>
              </span>
            </button>
          );
        })}

        {filteredSymbols.length === 0 && (
          <p className="watchlist-empty">Eşleşen sembol bulunamadı.</p>
        )}
      </div>

      <div className="watchlist-footer">
        <span className="live-dot" />
        Mock veri · {QUOTE_REFRESH_MS / 1_000} sn'de bir yenilenir
      </div>
    </aside>
  );
}
