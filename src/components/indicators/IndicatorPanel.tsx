"use client";

import { INDICATOR_META, type IndicatorMeta } from "@/lib/indicators/meta";
import { drawingKey, type DrawingTool } from "@/lib/drawings";
import { useTradingStore } from "@/store/useTradingStore";

function IndicatorToggle({ meta }: { meta: IndicatorMeta }) {
  const active = useTradingStore((state) => state.indicators[meta.key]);
  const toggleIndicator = useTradingStore((state) => state.toggleIndicator);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      className={`indicator-toggle${active ? " is-active" : ""}`}
      onClick={() => toggleIndicator(meta.key)}
    >
      <span className="indicator-swatch" style={{ backgroundColor: meta.color }} />
      <span className="indicator-copy">
        <span className="indicator-label">{meta.label}</span>
        <span className="indicator-description">{meta.description}</span>
      </span>
      <span className="switch" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

function CursorIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M5 3.5 15.5 9l-4.7 1.5L8.5 15 5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrendLineIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="m4 15 12-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4.5" cy="15" r="2" fill="currentColor" />
      <circle cx="15.5" cy="5" r="2" fill="currentColor" />
    </svg>
  );
}

function HorizontalLineIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="4" cy="10" r="2" fill="currentColor" />
      <circle cx="16" cy="10" r="2" fill="currentColor" />
    </svg>
  );
}

const DRAWING_TOOLS: Array<{
  tool: DrawingTool;
  label: string;
  icon: React.ReactNode;
}> = [
  { tool: "none", label: "İmleç", icon: <CursorIcon /> },
  { tool: "trendline", label: "Trend", icon: <TrendLineIcon /> },
  { tool: "horizontal", label: "Yatay", icon: <HorizontalLineIcon /> },
];

/** Sağ panel: gösterge anahtarları, çizim araçları ve veri kaynağı bilgisi. */
export function IndicatorPanel() {
  const indicators = useTradingStore((state) => state.indicators);
  const resetIndicators = useTradingStore((state) => state.resetIndicators);

  const symbol = useTradingStore((state) => state.symbol);
  const timeframe = useTradingStore((state) => state.timeframe);
  const drawingsMap = useTradingStore((state) => state.drawings);
  const drawingTool = useTradingStore((state) => state.drawingTool);
  const setDrawingTool = useTradingStore((state) => state.setDrawingTool);
  const undoDrawing = useTradingStore((state) => state.undoDrawing);
  const clearDrawings = useTradingStore((state) => state.clearDrawings);

  const currentDrawings = drawingsMap[drawingKey(symbol, timeframe)] ?? [];
  const activeCount = Object.values(indicators).filter(Boolean).length;

  return (
    <aside className="panel indicator-panel">
      <div className="panel-header">
        <div>
          <h2>Göstergeler</h2>
          <p>{activeCount} aktif çalışma</p>
        </div>
        <button type="button" className="text-button" onClick={resetIndicators}>
          Sıfırla
        </button>
      </div>

      <div className="panel-body">
        <section className="panel-section">
          <h3 className="section-title">Fiyat üzeri</h3>
          <div className="indicator-list">
            {INDICATOR_META.filter((meta) => meta.group === "overlay").map((meta) => (
              <IndicatorToggle key={meta.key} meta={meta} />
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h3 className="section-title">Osilatörler</h3>
          <div className="indicator-list">
            {INDICATOR_META.filter((meta) => meta.group === "oscillator").map((meta) => (
              <IndicatorToggle key={meta.key} meta={meta} />
            ))}
          </div>
        </section>

        <section className="panel-section">
          <div className="section-title-row">
            <h3 className="section-title">Çizim Araçları</h3>
            <span className="count-badge">{currentDrawings.length}</span>
          </div>

          <div className="drawing-tool-grid" role="group" aria-label="Çizim araçları">
            {DRAWING_TOOLS.map((item) => (
              <button
                key={item.tool}
                type="button"
                className={`tool-button${drawingTool === item.tool ? " is-active" : ""}`}
                onClick={() => setDrawingTool(item.tool)}
                aria-pressed={drawingTool === item.tool}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          <div className="drawing-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={undoDrawing}
              disabled={currentDrawings.length === 0}
            >
              Geri al
            </button>
            <button
              type="button"
              className="secondary-button is-danger"
              onClick={clearDrawings}
              disabled={currentDrawings.length === 0}
            >
              Temizle
            </button>
          </div>
        </section>

        <section className="data-card">
          <div className="data-card-title">
            <span className="live-dot" />
            Mock veri kaynağı
          </div>
          <p>
            Fiyatlar deterministik olarak üretilir. Gerçek BIST akışı için
            <code> lib/market-data </code>
            altındaki sağlayıcıyı değiştirmeniz yeterli.
          </p>
          <div className="data-card-meta">
            <span>Sağlayıcı: Mock</span>
            <span>{symbol} · {timeframe}</span>
          </div>
        </section>
      </div>
    </aside>
  );
}
