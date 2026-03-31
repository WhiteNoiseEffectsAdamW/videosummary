const { Resend } = require('resend');

const FROM_ADDRESS = process.env.FROM_EMAIL || 'digest@headwater.app';
const FROM_NAME = process.env.FROM_NAME || 'Headwater';
const FROM = `${FROM_NAME} <${FROM_ADDRESS}>`;
const APP_URL = process.env.APP_URL || 'https://headwater.app';
const DIVIDER = '────────────────────────────────';

const cleanName = (name) => (name || '').replace(/^@/, '');

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  return new Resend(process.env.RESEND_API_KEY);
}

function renderDigestText(summaries) {
  const count = summaries.length;
  const lines = [];

  lines.push(`${count} new video${count !== 1 ? 's' : ''} from your channels`);
  lines.push('');

  for (const s of summaries) {
    const prefix = cleanName(s.channel_name) ? `${cleanName(s.channel_name)} — ` : '';
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
    if (cleanName(s.channel_name)) lines.push(cleanName(s.channel_name));
    lines.push(s.title || s.video_id);
    lines.push('');
    if (tldr) lines.push(tldr);
    lines.push('');
    if (quotes.length > 0) lines.push(`"${quotes[0].text}"`);
    lines.push('');
    lines.push(`Full summary: ${APP_URL}/s/${s.video_id}`);
    lines.push(`Watch: ${videoUrl}`);
    lines.push('');
  }

  lines.push(DIVIDER);
  lines.push('');
  lines.push('You only receive this when there\'s something new from your channels.');
  lines.push('Summaries are AI-generated and may be incomplete or inaccurate.');
  lines.push(`Manage your channels: ${APP_URL}/following`);
  lines.push(`Unsubscribe: ${APP_URL}/following`);
  lines.push('');

  return lines.join('\n');
}

function renderDigestHtml(summaries) {
  const count = summaries.length;
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const videoSections = summaries.map((s, i) => {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [] } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;
    const quote = quotes[0];
    const isLast = i === summaries.length - 1;
    const channelName = cleanName(s.channel_name);

    const thumb = `${APP_URL}/api/og/thumb/${s.video_id}`;

    return `
      <div style="margin-bottom:${isLast ? '0' : '40px'};padding-bottom:${isLast ? '0' : '40px'};${isLast ? '' : 'border-bottom:1px solid #ebebeb;'}">
        ${channelName ? `<div style="font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#22d3ee;margin-bottom:7px;">${esc(channelName)}</div>` : ''}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:12px;">
          <tr>
            <td style="vertical-align:top;padding-right:14px;width:100px;">
              <a href="${APP_URL}/s/${s.video_id}"><img src="${thumb}" alt="" width="100" style="display:block;width:100px;height:64px;object-fit:cover;border-radius:4px;" /></a>
            </td>
            <td style="vertical-align:top;">
              <div style="font-size:18px;font-weight:700;color:#111;line-height:1.3;">
                <a href="${APP_URL}/s/${s.video_id}" style="color:#111;text-decoration:none;">${esc(s.title || s.video_id)}</a>
              </div>
            </td>
          </tr>
        </table>
        ${tldr ? `<div style="font-size:15px;color:#333;line-height:1.75;margin-bottom:16px;">${esc(tldr)}</div>` : ''}
        ${quote ? `
        <div style="margin:20px 0;padding:14px 18px;background:#f9f9f9;border-left:3px solid #d4d4d4;">
          <div style="font-size:14px;font-style:italic;color:#555;line-height:1.6;">&ldquo;${esc(quote.text.length > 220 ? quote.text.slice(0, 220) + '…' : quote.text)}&rdquo;</div>
        </div>` : ''}
        <div style="margin-top:14px;">
          <a href="${APP_URL}/s/${s.video_id}" style="font-size:14px;color:#22d3ee;text-decoration:none;font-weight:600;">Full breakdown &rarr;</a>
          <span style="color:#ddd;margin:0 10px;">&middot;</span>
          <a href="${videoUrl}" style="font-size:13px;color:#bbb;text-decoration:none;">Watch on YouTube</a>
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Morning Digest</title></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px 56px;">

    <!-- Header -->
    <div style="margin-bottom:40px;border-bottom:2px solid #f0f0f0;padding-bottom:28px;">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#22d3ee;margin-bottom:12px;">Headwater</div>
      <div style="font-size:26px;font-weight:700;color:#111;line-height:1.2;margin-bottom:6px;">Morning Digest</div>
      <div style="font-size:13px;color:#aaa;line-height:1.5;">${dateStr} &nbsp;&middot;&nbsp; ${count} new video${count !== 1 ? 's' : ''} from your channels</div>
    </div>

    <!-- Videos -->
    ${videoSections}

    <!-- Footer -->
    <div style="border-top:1px solid #f0f0f0;margin-top:48px;padding-top:24px;font-size:12px;color:#bbb;line-height:1.9;">
      <a href="${APP_URL}" style="color:#999;font-weight:600;text-decoration:none;">Headwater</a><br>
      Summaries are AI-generated and may be incomplete or inaccurate.<br>
      <a href="${APP_URL}/following" style="color:#999;font-weight:500;text-decoration:none;">Manage channels</a>
      &nbsp;&middot;&nbsp;
      <a href="${APP_URL}/following" style="color:#bbb;text-decoration:none;">Unsubscribe</a>
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

  // Cap at 12 to stay well under Gmail's ~102KB clip threshold
  const capped = summaries.slice(0, 12);

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: capped.length === 1
      ? capped[0].title || 'Your morning digest'
      : `${capped[0].title || 'New videos'} — plus ${capped.length - 1} more`,
    html: renderDigestHtml(capped),
    text: renderDigestText(capped),
    headers: {
      'List-Unsubscribe': `<${APP_URL}/following>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
}

async function sendNudge(toEmail) {
  const followUrl = `${APP_URL}/following`;
  const tryUrl = APP_URL;

  const html = `<!DOCTYPE html><html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:48px 24px;">
  <div style="font-size:13px;color:#999;margin-bottom:24px;">Headwater</div>
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">You're one of the first people trying this, and that means a lot. Here's how to get the most out of it.</p>
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">You haven't added any channels yet. Add one you already follow on YouTube and tomorrow morning you'll get a summary of anything new.</p>
  <a href="${followUrl}" style="display:inline-block;background:#22d3ee;color:#0c0f14;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Follow your first channel →</a>
  <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 16px;">Not ready yet? Paste any YouTube URL and see what a summary looks like first.</p>
  <a href="${tryUrl}" style="font-size:15px;font-weight:600;color:#22d3ee;text-decoration:none;">Try a video →</a>
  <p style="font-size:15px;color:#555;font-style:italic;margin-top:40px;line-height:1.6;">— Adam at Headwater</p>
  <p style="font-size:12px;color:#bbb;margin-top:16px;line-height:1.6;">If you'd rather not receive emails like this, <a href="${followUrl}" style="color:#bbb;">unsubscribe here</a>.</p>
</div>
</body></html>`;

  const text = `You're one of the first people trying this, and that means a lot. Here's how to get the most out of it.\n\nYou haven't added any channels yet. Add one you already follow on YouTube and tomorrow morning you'll get a summary of anything new.\n\nFollow your first channel: ${followUrl}\n\nNot ready yet? Paste any YouTube URL and see what a summary looks like first.\n\nTry a video: ${tryUrl}\n\n— Adam at Headwater\n\nIf you'd rather not receive emails like this: ${followUrl}`;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Finish setting up Headwater',
    html,
    text,
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

async function sendWelcome(toEmail) {
  const followUrl = `${APP_URL}/following`;

  const html = `<!DOCTYPE html><html lang="en"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:48px 24px;">
  <div style="font-size:13px;color:#999;margin-bottom:32px;">Headwater</div>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 20px;">That's when I knew something was broken. YouTube is built to pull you in, not help you decide. So I built the opposite.</p>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 20px;">Headwater follows your channels and sends a digest each morning — key points, notable quotes, enough to know if a video is worth your time. No feed. No recommendations. Just the channels you chose. Email-first, because your inbox doesn't have an algorithm working against you.</p>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 28px;">Your first digest lands tomorrow morning.</p>
  <a href="${followUrl}" style="display:inline-block;background:#22d3ee;color:#0c0f14;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:32px;">Add your channels →</a>
  <p style="font-size:15px;color:#555;margin:0 0 16px;line-height:1.6;">— Adam</p>
  <p style="font-size:13px;color:#888;margin:0 0 48px;line-height:1.75;"><em>P.S. You can reply directly to this email with questions, suggestions, or feedback. I read everything.</em></p>
  <p style="font-size:12px;color:#bbb;line-height:1.6;">You're receiving this because you created a Headwater account.<br><a href="${followUrl}" style="color:#bbb;">Unsubscribe</a></p>
</div>
</body></html>`;

  const text = `That's when I knew something was broken. YouTube is built to pull you in, not help you decide. So I built the opposite.\n\nHeadwater follows your channels and sends a digest each morning — key points, notable quotes, enough to know if a video is worth your time. No feed. No recommendations. Just the channels you chose. Email-first, because your inbox doesn't have an algorithm working against you.\n\nYour first digest lands tomorrow morning.\n\nAdd your channels: ${followUrl}\n\n— Adam\n\nP.S. You can reply directly to this email with questions, suggestions, or feedback. I read everything.\n\nYou're receiving this because you created a Headwater account.\nUnsubscribe: ${followUrl}`;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'I was reading YouTube comments to decide what to watch',
    html,
    text,
  });
}

async function sendAdminNotify(subject, text) {
  await getResend().emails.send({
    from: FROM,
    to: process.env.ADMIN_EMAIL,
    subject,
    text,
  });
}

module.exports = { sendDigest, sendNudge, sendWelcome, sendPasswordReset, sendVerificationEmail, sendAdminNotify };
