export default function BrandMark({ light = false, compact = false }) {
  return (
    <div className="d-flex align-items-center gap-2">
      <svg width={compact ? 36 : 44} height={compact ? 36 : 44} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="12" fill={light ? '#ffffff' : '#5C2D91'} />
        <path
          d="M12 40c8-14 14-14 20 0s12 14 20 0"
          fill="none"
          stroke={light ? '#C9A84C' : '#C9A84C'}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="32" cy="22" r="6" fill={light ? '#5C2D91' : '#FFFFFF'} />
      </svg>
      <div className="lh-1">
        <div className="fw-bold" style={{ fontFamily: 'Barlow Condensed, sans-serif', fontSize: compact ? 20 : 26, letterSpacing: '0.04em' }}>
          SPEAKUP
        </div>
        <div className="small" style={{ opacity: 0.8 }}>
          DP WORLD KIGALI
        </div>
      </div>
    </div>
  );
}
