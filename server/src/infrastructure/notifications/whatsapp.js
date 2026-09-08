const { env } = require('../../config/env');

function formatAlert({ reportNo, location, severity, description, reviewUrl }) {
  const lines = [
    'SAFETY ALERT',
    '',
    `Report No: ${reportNo}`,
    `Location: ${location}`,
    `Severity: ${severity}`,
    `Description: ${description}`,
  ];
  if (reviewUrl) {
    lines.push('', `Open in SpeakUp: ${reviewUrl}`);
  }
  return lines.join('\n');
}

async function sendWhatsApp({ to, body }) {
  if (!env.whatsapp.enabled || !env.whatsapp.token || !env.whatsapp.phoneId || !to) {
    console.warn('[whatsapp] Not configured. Skipping message to', to);
    return { skipped: true };
  }

  const url = `https://graph.facebook.com/v21.0/${env.whatsapp.phoneId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.whatsapp.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`WhatsApp API error: ${res.status} ${detail}`);
  }
  return { skipped: false };
}

module.exports = { sendWhatsApp, formatAlert };
