export function TopBar() {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" fill="none">
            <rect x="3" y="13" width="3" height="10" rx="1.2" fill="currentColor" />
            <rect x="9" y="8" width="3" height="18" rx="1.2" fill="currentColor" />
            <rect x="15" y="4" width="3" height="15" rx="1.2" fill="currentColor" />
            <rect x="21" y="11" width="3" height="13" rx="1.2" fill="currentColor" />
            <rect x="27" y="6" width="3" height="16" rx="1.2" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-copy">
          <span className="brand-name">AITRADE</span>
          <span className="brand-sub">Terminal</span>
        </span>
      </div>

      <div className="topbar-center">
        <span className="market-pill">
          <span className="pulse-dot" />
          BIST · Mock Piyasa
        </span>
        <span className="topbar-note">Gerçek veri entegrasyonuna hazır altyapı</span>
      </div>

      <div className="topbar-right">
        <span className="data-badge">DEMO</span>
        <span className="topbar-version">v0.1</span>
      </div>
    </header>
  );
}
