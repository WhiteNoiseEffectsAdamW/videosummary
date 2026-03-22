const { Resend } = require('resend');

const FROM = process.env.FROM_EMAIL || 'digest@videosummaryapp.com';
const APP_URL = process.env.APP_URL || 'https://videosummaryapp.com';
const DIVIDER = '────────────────────────────────';

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  return new Resend(process.env.RESEND_API_KEY);
}

function verdictLabel(verdict) {
  if (!verdict) return null;
  if (verdict.action === 'Watch segment') return `Watch ${verdict.segment}`;
  if (verdict.action === 'Skip') return 'Summary covers it';
  return verdict.action;
}

function renderDigestText(summaries) {
  const count = summaries.length;
  const lines = [];

  lines.push(`Your daily digest — ${count} new video${count !== 1 ? 's' : ''} from your followed channels`);
  lines.push('');

  for (const s of summaries) {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [], verdict } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;
    const label = verdictLabel(verdict);

    lines.push(DIVIDER);

    const meta = [s.channel_name, label].filter(Boolean).join(' · ');
    lines.push(s.title || s.video_id);
    if (meta) lines.push(meta);
    lines.push('');

    // Lead quote if available
    if (quotes.length > 0) {
      lines.push(`"${quotes[0].text}"`);
      lines.push('');
    }

    // First sentence of TL;DR only
    const sentence = tldr ? tldr.split(/(?<=\.)\s+/)[0] : '';
    if (sentence) lines.push(sentence);

    lines.push('');
    lines.push(`Watch: ${videoUrl}`);
    lines.push('');
  }

  lines.push(DIVIDER);
  lines.push('');
  lines.push('Summaries are AI-generated and may be incomplete or inaccurate.');
  lines.push(`To turn off these emails: ${APP_URL}/following`);

  return lines.join('\n');
}

async function sendDigest(toEmail, summaries) {
  if (!summaries.length) return;

  const count = summaries.length;
  const text = renderDigestText(summaries);

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your digest — ${count} new video${count !== 1 ? 's' : ''}`,
    text,
  });
}

module.exports = { sendDigest };
