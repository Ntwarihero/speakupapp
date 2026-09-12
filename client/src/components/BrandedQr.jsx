import { useEffect, useRef } from 'react';
import QRCodeStyling from 'qr-code-styling';

const QRCodeCtor = QRCodeStyling.default ?? QRCodeStyling;

const PURPLE = '#5C2D91';
const PURPLE_DEEP = '#3D1A6B';
const PURPLE_LIFT = '#7A4CB0';

function createQr(data) {
  return new QRCodeCtor({
    width: 920,
    height: 920,
    type: 'svg',
    data,
    margin: 12,
    qrOptions: { errorCorrectionLevel: 'M' },
    backgroundOptions: { color: '#ffffff' },
    dotsOptions: {
      type: 'extra-rounded',
      roundSize: true,
      gradient: {
        type: 'linear',
        rotation: Math.PI / 4,
        colorStops: [
          { offset: 0, color: PURPLE_DEEP },
          { offset: 0.5, color: PURPLE },
          { offset: 1, color: PURPLE_LIFT },
        ],
      },
    },
    cornersSquareOptions: {
      type: 'extra-rounded',
      color: PURPLE,
    },
    cornersDotOptions: {
      type: 'dot',
      color: PURPLE_DEEP,
    },
  });
}

export default function BrandedQr({ data }) {
  const hostRef = useRef(null);
  const qrRef = useRef(null);

  useEffect(() => {
    if (!data || !hostRef.current) return;

    if (!qrRef.current) {
      qrRef.current = createQr(data);
      qrRef.current.append(hostRef.current);
      return;
    }

    qrRef.current.update({ data });
  }, [data]);

  return <div ref={hostRef} className="poster-qr-mount" role="img" aria-label="SpeakUp QR code" />;
}
