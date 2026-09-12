export default function BrandMark({ light = false, compact = false }) {
  const size = compact ? 36 : 44;
  const logoHeight = compact ? 40 : 56;

  return (
    <div className="brand-mark d-flex flex-column align-items-start gap-2">
      <img
        src="/dp-world-logo.svg"
        alt="DP World"
        className={`brand-mark-logo${light ? ' brand-mark-logo-on-dark' : ''}`}
        style={{ height: logoHeight }}
      />
      <div className="d-flex align-items-center gap-2">
        <span
          className="d-inline-flex align-items-center justify-content-center"
          style={{
            width: size,
            height: size,
            borderRadius: 12,
            background: light ? '#ffffff' : '#5C2D91',
            color: light ? '#5C2D91' : '#C9A84C',
            fontSize: compact ? 18 : 22,
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <i className="fa-solid fa-bullhorn" />
        </span>
        <div className="lh-1">
          <div
            className="fw-bold"
            style={{
              fontFamily: 'Barlow Condensed, sans-serif',
              fontSize: compact ? 20 : 26,
              letterSpacing: '0.04em',
            }}
          >
            SPEAKUP
          </div>
          <div className="small" style={{ opacity: 0.8 }}>
            DP WORLD KIGALI
          </div>
        </div>
      </div>
    </div>
  );
}
