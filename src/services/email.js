const { Resend } = require('resend');

const FROM = process.env.FROM_EMAIL || 'digest@videosummaryapp.com';
const APP_URL = process.env.APP_URL || 'https://videosummaryapp.com';
const DIVIDER = '────────────────────────────────';

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  return new Resend(process.env.RESEND_API_KEY);
}

function renderDigestText(summaries) {
  const count = summaries.length;
  const lines = [];

  lines.push(`Your daily digest — ${count} new video${count !== 1 ? 's' : ''} from your followed channels`);
  lines.push('');

  for (const s of summaries) {
    const prefix = s.channel_name ? `${s.channel_name} — ` : '';
    lines.push(`· ${prefix}${s.title || s.video_id}`);
  }
  lines.push('');
  lines.push(DIVIDER);
  lines.push('');

  for (const s of summaries) {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [] } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;

    lines.push(DIVIDER);
    if (s.channel_name) lines.push(s.channel_name);
    lines.push(s.title || s.video_id);
    lines.push('');
    if (tldr) lines.push(tldr);
    lines.push('');
    if (quotes.length > 0) lines.push(`"${quotes[0].text}"`);
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

function renderDigestHtml(summaries) {
  const count = summaries.length;

  const videoListItems = summaries.map((s) => {
    const prefix = s.channel_name ? `<span style="color:#888;">${esc(s.channel_name)} &mdash;</span> ` : '';
    return `<li style="margin:0 0 6px;">${prefix}${esc(s.title || s.video_id)}</li>`;
  }).join('');

  const videoCards = summaries.map((s) => {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [] } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;
    const thumb = `https://img.youtube.com/vi/${s.video_id}/maxresdefault.jpg`;
    const quote = quotes[0];

    return `
      <div style="border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;margin-bottom:28px;">
        <a href="${videoUrl}" style="display:block;line-height:0;">
          <img src="${thumb}" alt="${esc(s.title || '')}" width="600"
            style="width:100%;max-width:600px;height:220px;object-fit:cover;display:block;border-bottom:1px solid #e8e8e8;" />
        </a>
        <div style="padding:20px 24px 24px;">
          ${s.channel_name ? `<div style="font-size:12px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:6px;">${esc(s.channel_name)}</div>` : ''}
          <div style="font-size:18px;font-weight:700;color:#111;line-height:1.35;margin-bottom:14px;">${esc(s.title || s.video_id)}</div>
          ${tldr ? `<div style="font-size:14px;color:#333;line-height:1.65;margin-bottom:16px;">${esc(tldr)}</div>` : ''}
          ${quote ? `<div style="border-left:3px solid #ddd;padding:8px 0 8px 14px;margin-bottom:20px;color:#666;font-size:13px;font-style:italic;line-height:1.6;">&ldquo;${esc(quote.text)}&rdquo;</div>` : ''}
          <a href="${videoUrl}"
            style="display:inline-block;background:#111;color:#fff;font-size:13px;font-weight:600;text-decoration:none;padding:10px 18px;border-radius:8px;">
            Watch on YouTube &rarr;
          </a>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your digest</title></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:620px;margin:0 auto;padding:32px 16px 48px;">

    <!-- Header -->
    <div style="margin-bottom:28px;">
      <div style="font-size:13px;font-weight:600;color:#888;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">Daily digest</div>
      <div style="font-size:24px;font-weight:700;color:#111;">${count} new video${count !== 1 ? 's' : ''} from your channels</div>
    </div>

    <!-- Quick list -->
    <div style="background:#fff;border:1px solid #e8e8e8;border-radius:12px;padding:16px 20px;margin-bottom:32px;">
      <ul style="margin:0;padding:0 0 0 16px;font-size:14px;color:#333;line-height:1.7;">
        ${videoListItems}
      </ul>
    </div>

    <!-- Video cards -->
    ${videoCards}

    <!-- Footer -->
    <div style="font-size:12px;color:#aaa;text-align:center;margin-top:8px;line-height:1.7;">
      Summaries are AI-generated and may be incomplete or inaccurate.<br>
      <a href="${APP_URL}/following" style="color:#aaa;">Turn off these emails</a>
    </div>

  </div>
</body>
</html>`;
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendDigest(toEmail, summaries) {
  if (!summaries.length) return;

  const count = summaries.length;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your digest — ${count} new video${count !== 1 ? 's' : ''}`,
    html: renderDigestHtml(summaries),
    text: renderDigestText(summaries),
  });
}

module.exports = { sendDigest };
