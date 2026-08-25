import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import BrandMark from '../components/BrandMark';

export default function PrintPosters() {
  const [target, setTarget] = useState(() => window.location.origin.replace(/\/$/, '') + '/');
  const [qr, setQr] = useState('');

  const cleanUrl = useMemo(() => {
    try {
      const url = new URL(target.trim() || window.location.origin);
      url.hash = '';
      url.search = '';
      if (!url.pathname.endsWith('/')) url.pathname += '/';
      return url.toString();
    } catch {
      return window.location.origin + '/';
    }
  }, [target]);

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(cleanUrl, {
      width: 900,
      margin: 1,
      color: { dark: '#5C2D91', light: '#FFFFFF' },
      errorCorrectionLevel: 'H',
    }).then((data) => {
      if (!cancelled) setQr(data);
    });
    return () => {
      cancelled = true;
    };
  }, [cleanUrl]);

  return (
    <div className="poster-pack">
      <div className="no-print p-3 p-md-4" style={{ background: '#f4f1f8' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <BrandMark compact />
          <h1 className="h3 mt-3 mb-2">SpeakUp QR poster</h1>
          <p className="text-muted">
            One poster for every location. Scanning the code opens the SpeakUp welcome page so
            anyone can report a hazard.
          </p>
          <label className="form-label" htmlFor="poster-url">
            Website address encoded in the QR code
          </label>
          <input
            id="poster-url"
            className="form-control mb-3"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
          <p className="small text-muted">
            If you have already published to Vercel, paste that URL here before printing. A
            localhost address will only work on this computer.
          </p>
          <button type="button" className="btn btn-dpw" onClick={() => window.print()}>
            Print poster
          </button>
        </div>
      </div>

      <article className="poster-page poster-single">
        <div className="hazard-stripe" />
        <div className="poster-inner poster-inner-single">
          <BrandMark light />
          <p className="poster-kicker">Health, Safety &amp; Environment</p>
          <h1 className="poster-title">Welcome to DP World Kigali Safety Reporting System</h1>
          <p className="poster-lead">
            Report hazards, unsafe acts, near misses and operational risks before they become
            incidents.
          </p>
          <div className="poster-qr-wrap poster-qr-lg">
            {qr ? (
              <img src={qr} alt="SpeakUp QR code" />
            ) : (
              <div className="poster-qr-wait">Preparing QR…</div>
            )}
          </div>
          <p className="poster-scan">Scan this code to SpeakUp</p>
          <p className="poster-url">{cleanUrl}</p>
          <div className="poster-langs">
            <span>English</span>
            <span>Français</span>
            <span>Kinyarwanda</span>
            <span>Kiswahili</span>
          </div>
        </div>
      </article>
    </div>
  );
}
