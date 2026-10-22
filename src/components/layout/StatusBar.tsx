export function StatusBar() {
  return (
    <footer className="statusbar">
      <span className="statusbar-item">
        <span className="status-dot" />
        Sistem çalışıyor
      </span>
      <span className="statusbar-center">
        Fiyatlar mock veridir · Yatırım tavsiyesi değildir
      </span>
      <span className="statusbar-item statusbar-attribution">
        Powered by{" "}
        <a
          href="https://www.tradingview.com/lightweight-charts/"
          target="_blank"
          rel="noreferrer"
        >
          TradingView Lightweight Charts
        </a>
      </span>
    </footer>
  );
}
