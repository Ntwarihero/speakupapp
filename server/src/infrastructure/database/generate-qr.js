const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const slugs = [
  'gate-1',
  'gate-2',
  'warehouse-a',
  'warehouse-b',
  'loading-bay',
  'parking',
  'fuel-station',
  'container-yard',
  'customs',
  'main-road',
  'office-block',
  'other',
];

async function generate() {
  const out = path.resolve(__dirname, '../../../../client/public/qr');
  fs.mkdirSync(out, { recursive: true });
  const base = process.env.APP_URL || 'https://speakupapp.vercel.app';
  for (const slug of slugs) {
    await QRCode.toFile(path.join(out, `${slug}.png`), `${base.replace(/\/$/, '')}/?loc=${slug}`, {
      width: 640,
      margin: 2,
      color: { dark: '#5C2D91', light: '#FFFFFF' },
    });
  }
  console.log('QR codes written to', out);
}

generate().catch((err) => {
  console.error(err);
  process.exit(1);
});
