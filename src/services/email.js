const { Resend } = require('resend');

const FROM_ADDRESS = process.env.FROM_EMAIL || 'digest@headwater.app';
const FROM_NAME = process.env.FROM_NAME || 'Headwater';
const FROM = `${FROM_NAME} <${FROM_ADDRESS}>`;
const APP_URL = process.env.APP_URL || 'https://headwater.app';
const POSTAL_ADDRESS = process.env.POSTAL_ADDRESS || '548 Market St PMB 99999, San Francisco, CA 94104';
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
  lines.push('');
  lines.push(POSTAL_ADDRESS);

  return lines.join('\n');
}

function renderDigestHtml(summaries) {
  const count = summaries.length;

  const videoSections = summaries.map((s, i) => {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [] } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;
    const thumb = `https://img.youtube.com/vi/${s.video_id}/maxresdefault.jpg`;
    const quote = quotes[0];
    const divider = i > 0 ? `<div style="border-top:1px solid #ebebeb;margin:36px 0;"></div>` : '';

    return `${divider}
      <div>
        <a href="${videoUrl}" style="display:block;line-height:0;margin-bottom:18px;">
          <img src="${thumb}" alt="${esc(s.title || '')}" width="560"
            style="width:100%;max-width:560px;height:160px;object-fit:cover;display:block;border-radius:6px;" />
        </a>
        ${s.channel_name ? `<div style="font-size:12px;font-weight:500;color:#999;margin-bottom:5px;">${esc(s.channel_name)}</div>` : ''}
        <div style="font-size:17px;font-weight:700;color:#111;line-height:1.35;margin-bottom:12px;">${esc(s.title || s.video_id)}</div>
        ${quote ? `<div style="color:#888;font-size:13px;font-style:italic;line-height:1.6;margin-bottom:14px;">&ldquo;${esc(quote.text)}&rdquo;</div>` : ''}
        ${tldr ? `<div style="font-size:14px;color:#444;line-height:1.7;margin-bottom:14px;">${esc(tldr)}</div>` : ''}
        <a href="${videoUrl}" style="font-size:13px;font-weight:600;color:#111;text-decoration:none;">Watch &rarr;</a>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your digest</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:48px 24px 64px;">

    <!-- Header -->
    <div style="margin-bottom:40px;border-bottom:1px solid #ebebeb;padding-bottom:24px;">
      <div style="font-size:13px;color:#999;margin-bottom:6px;">Daily digest</div>
      <div style="font-size:22px;font-weight:700;color:#111;">${count} new video${count !== 1 ? 's' : ''} from your channels</div>
    </div>

    <!-- Videos -->
    ${videoSections}

    <!-- Footer -->
    <div style="border-top:1px solid #ebebeb;margin-top:48px;padding-top:24px;font-size:12px;color:#bbb;line-height:1.8;">
      <a href="${APP_URL}" style="color:#999;font-weight:600;text-decoration:none;">Headwater</a><br>
      Summaries are AI-generated and may be incomplete or inaccurate.<br>
      <a href="${APP_URL}/following" style="color:#bbb;">Unsubscribe</a><br>
      ${esc(POSTAL_ADDRESS)}
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
    headers: {
      'List-Unsubscribe': `<${APP_URL}/following>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

async function sendPasswordReset(toEmail, resetUrl) {
  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Reset your Headwater password',
    text: `You requested a password reset.\n\nClick the link below to set a new password (expires in 1 hour):\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:48px 24px;">
  <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:24px;">Reset your password</div>
  <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
  <a href="${resetUrl}" style="display:inline-block;background:#22d3ee;color:#0c0f14;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset password</a>
  <p style="font-size:12px;color:#bbb;margin-top:32px;line-height:1.6;">If you didn't request this, ignore this email. Your password won't change.</p>
</div></body></html>`,
  });
}

async function sendVerificationEmail(toEmail, verifyUrl) {
  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Verify your Headwater email',
    text: `Verify your email address to complete your Headwater account.\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create an account, ignore this email.`,
    html: `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:48px 24px;">
  <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:24px;">Verify your email</div>
  <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">Click the button below to verify your email address and complete your Headwater account. This link expires in 24 hours.</p>
  <a href="${verifyUrl}" style="display:inline-block;background:#22d3ee;color:#0c0f14;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify email</a>
  <p style="font-size:12px;color:#bbb;margin-top:32px;line-height:1.6;">If you didn't create an account, ignore this email.</p>
</div></body></html>`,
  });
}

module.exports = { sendDigest, sendPasswordReset, sendVerificationEmail };
