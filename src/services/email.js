const { Resend } = require('resend');

const FROM_ADDRESS = process.env.FROM_EMAIL || 'digest@headwaterapp.com';
const FROM_NAME = process.env.FROM_NAME || 'Headwater';
const FROM = `${FROM_NAME} <${FROM_ADDRESS}>`;
const APP_URL = process.env.APP_URL || 'https://headwaterapp.com';
const DIVIDER = '────────────────────────────────';

const cleanName = (name) => (name || '').replace(/^@/, '');

// Normalize all-caps titles to title case (e.g. "THIS IS A TITLE" → "This Is a Title")
function normalizeTitle(title) {
  if (!title) return title;
  if (title === title.toUpperCase() && title.length > 4) {
    return title.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return title;
}

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
    lines.push(`Full summary: ${APP_URL}/s/${s.slug || s.video_id}`);
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
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const channelNames = [...new Set(summaries.map(s => cleanName(s.channel_name)).filter(Boolean))];
  const channelDisplay = channelNames.slice(0, 2).map(esc).join(', ') + (channelNames.length > 2 ? ' &amp; more' : '');

  // Feature the longest video of the day, with an 8-minute floor.
  // If nothing clears the floor, fall back to the first video (still need a featured slot).
  const FLOOR_SECONDS = 8 * 60;
  let featuredIdx = 0;
  let longest = -1;
  summaries.forEach((s, i) => {
    const dur = s.duration_seconds || 0;
    if (dur >= FLOOR_SECONDS && dur > longest) {
      longest = dur;
      featuredIdx = i;
    }
  });
  const featured = summaries[featuredIdx];
  const rest = summaries.filter((_, i) => i !== featuredIdx);

  function renderFeatured(s) {
    const data = JSON.parse(s.summary_json);
    const { tldr, quotes = [], topics = [], bestFor, titleVsDelivered, inContext } = data;
    // Hierarchy: titleVsDelivered suppresses inContext and bestFor
    const flag = titleVsDelivered ? { label: 'Title vs Delivered', text: titleVsDelivered } : inContext ? { label: 'In Context', text: inContext } : null;
    const showBestFor = !titleVsDelivered && bestFor;
    // Pick shortest quote under 25 words, or truncate the first
    const rawQuote = quotes.find(q => q.text.split(/\s+/).length <= 25) || quotes[0];
    const quote = rawQuote ? { ...rawQuote, text: rawQuote.text.split(/\s+/).slice(0, 25).join(' ') + (rawQuote.text.split(/\s+/).length > 25 ? '…' : '') } : null;
    const summaryUrl = `${APP_URL}/s/${s.slug || s.video_id}`;
    const thumb = `${APP_URL}/api/og/thumb/${s.video_id}`;
    const channelName = cleanName(s.channel_name);
    const durationMins = s.duration_seconds ? Math.round(s.duration_seconds / 60) : null;
    const topicsCapped = (topics || []).slice(0, 4);
    const stats = [durationMins ? `${durationMins} min` : null, topicsCapped.length ? `${topicsCapped.length} topics` : null].filter(Boolean).join(' &middot; ');

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
  <tr>
    <td style="padding:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <a href="${summaryUrl}" style="display:block;line-height:0;"><img src="${thumb}" alt="" width="520" style="display:block;width:100%;max-width:520px;height:auto;border-radius:6px;background-color:#eae6de;" /></a>
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 10px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      ${channelName ? `<div style="font-size:13px;font-weight:700;color:#b8924a;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">${esc(channelName)}</div>` : ''}
      <div style="font-size:20px;font-weight:700;color:#1a1a1a;line-height:1.3;letter-spacing:-0.01em;margin-bottom:8px;"><a href="${summaryUrl}" style="color:#1a1a1a;text-decoration:none;">${esc(normalizeTitle(s.title) || s.video_id)}</a></div>
      ${stats ? `<div style="font-size:12px;color:#888;margin-bottom:4px;">${stats}</div>` : ''}
    </td>
  </tr>
  <tr>
    <td style="padding:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      ${tldr ? `<p style="font-size:15px;color:#2a2a2a;line-height:1.7;margin:0 0 16px;">${esc(tldr)}</p>` : ''}
      ${flag ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:16px;"><tr><td style="border-left:2px solid #c49a2a;padding-left:14px;"><span style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#c49a2a;">${flag.label}</span><p style="font-size:13px;color:#555;line-height:1.55;margin:4px 0 0;">${esc(flag.text)}</p></td></tr></table>` : ''}
      ${quote ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-bottom:16px;"><tr><td style="border-left:2px solid #b8924a;padding-left:16px;"><p style="font-size:15px;font-style:italic;color:#3d3d3d;line-height:1.6;margin:0;">&ldquo;${esc(quote.text)}&rdquo;</p></td></tr></table>` : ''}
      ${showBestFor ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-top:1px solid #e8e4dc;"><tr><td style="padding-top:14px;vertical-align:top;width:58px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><span style="font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#888;">Best For</span></td><td style="padding:14px 0 0 8px;vertical-align:top;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><span style="font-size:13px;color:#3d3d3d;line-height:1.5;">${esc(bestFor)}</span></td></tr></table>` : ''}
    </td>
  </tr>
  ${topicsCapped.length > 0 ? `<tr><td style="padding:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-top:1px solid #e8e4dc;">${topicsCapped.map((t, i) => `<tr><td style="padding:10px 10px 10px 0;vertical-align:top;width:48px;${i < topicsCapped.length - 1 ? 'border-bottom:1px solid #f0ece4;' : ''}"><span style="font-size:11px;color:#b8924a;font-weight:500;">${esc(t.timestamp || '')}</span></td><td style="padding:10px 0;vertical-align:top;${i < topicsCapped.length - 1 ? 'border-bottom:1px solid #f0ece4;' : ''}"><span style="font-size:13px;font-weight:600;color:#333;">${esc(t.title || '')}</span>${t.description ? `<span style="font-size:13px;color:#666;"> — ${esc(t.description)}</span>` : ''}</td></tr>`).join('')}</table></td></tr>` : ''}
  <tr>
    <td style="padding:6px 0 20px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <a href="${summaryUrl}" style="font-size:14px;font-weight:600;color:#b8924a;text-decoration:none;">Read full summary &rarr;</a>
      <span style="color:#d8d2c6;padding:0 10px;">&middot;</span>
      <a href="https://www.youtube.com/watch?v=${s.video_id}" style="font-size:13px;color:#777;text-decoration:none;">Watch on YouTube &#x2197;</a>
    </td>
  </tr>
</table>`;
  }

  function renderCompact(s) {
    const data = JSON.parse(s.summary_json);
    const { tldr, bestFor, titleVsDelivered, inContext } = data;
    const summaryUrl = `${APP_URL}/s/${s.slug || s.video_id}`;
    const thumb = `${APP_URL}/api/og/thumb/${s.video_id}`;
    const channelName = cleanName(s.channel_name);
    const tldrShort = tldr ? (tldr.match(/^.+?[.!?](?:\s|$)/) || [tldr])[0].trim() : '';
    const flagLabel = titleVsDelivered ? 'Title vs Delivered' : inContext ? 'In Context' : null;
    const flagText = titleVsDelivered || inContext || null;
    const showBestFor = !titleVsDelivered && bestFor;

    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-bottom:1px solid #ede9e1;">
  <tr>
    <td style="padding:16px 14px 16px 0;vertical-align:middle;width:72px;">
      <a href="${summaryUrl}" style="display:block;line-height:0;"><img src="${thumb}" alt="" width="72" style="display:block;width:72px;height:auto;border-radius:3px;background-color:#eae6de;" /></a>
    </td>
    <td style="padding:16px 0;vertical-align:middle;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      ${channelName ? `<div style="font-size:11px;font-weight:600;color:#b8924a;margin-bottom:2px;">${esc(channelName)}</div>` : ''}
      <div style="font-size:14px;font-weight:500;color:#1a1a1a;line-height:1.35;margin-bottom:4px;"><a href="${summaryUrl}" style="color:#1a1a1a;text-decoration:none;">${esc(normalizeTitle(s.title) || s.video_id)}</a></div>
      ${tldrShort ? `<div style="font-size:13px;color:#555;line-height:1.5;margin-bottom:4px;">${esc(tldrShort)}</div>` : ''}
      ${flagLabel ? `<div style="font-size:11px;color:#c49a2a;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">${flagLabel}: <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#777;font-size:12px;">${esc(flagText)}</span></div>` : ''}
      ${showBestFor ? `<div style="font-size:11px;color:#888;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-top:2px;">Best For: <span style="font-weight:400;text-transform:none;letter-spacing:0;color:#777;">${esc(bestFor)}</span></div>` : ''}
    </td>
  </tr>
</table>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Morning Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#e8e4dc;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<center>
<table width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#fafaf7" style="border-collapse:collapse;max-width:600px;margin:0 auto;background-color:#fafaf7;">

  <tr>
    <td style="padding:28px 40px 24px;border-bottom:1px solid #e8e4dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#1a1a1a;margin-bottom:16px;">Head<span style="color:#b8924a;">water</span></div>
      <div style="font-size:13px;color:#999;margin-bottom:4px;">${dateStr}</div>
      <div style="font-size:22px;font-weight:700;color:#1a1a1a;letter-spacing:-0.02em;line-height:1.25;">${channelDisplay} &mdash; <span style="color:#b8924a;">${count} new video${count !== 1 ? 's' : ''}</span></div>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 40px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:14px;color:#777;line-height:1.6;">Here's what's new from your channels.</td>
  </tr>

  <tr>
    <td style="padding:20px 40px;">
      ${renderFeatured(featured)}
    </td>
  </tr>

  ${rest.length > 0 ? `
  <tr>
    <td style="padding:0 40px;border-top:1px solid #e8e4dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#aaa;padding-top:20px;margin-bottom:4px;">Also posted</div>
    </td>
  </tr>
  <tr>
    <td style="padding:0 40px;">
      ${rest.map(renderCompact).join('')}
    </td>
  </tr>` : ''}

  <tr>
    <td style="padding:4px 40px 24px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <a href="${APP_URL}/videos" style="font-size:13px;font-weight:600;color:#b8924a;text-decoration:none;border-bottom:1px solid rgba(184,146,74,0.3);padding-bottom:1px;">View all summaries in Headwater &rarr;</a>
    </td>
  </tr>

  <tr>
    <td style="padding:28px 40px;border-top:1px solid #e8e4dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
      <p style="font-size:12px;color:#bbb;line-height:1.7;margin:0 0 4px;">You're following ${channelNames.length} channel${channelNames.length !== 1 ? 's' : ''} on <a href="${APP_URL}" style="color:#999;text-decoration:underline;">Headwater</a>.</p>
      <p style="font-size:12px;color:#bbb;line-height:1.7;margin:0 0 16px;"><a href="${APP_URL}/following" style="color:#999;text-decoration:underline;">Manage channels</a> &middot; <a href="${APP_URL}/account" style="color:#bbb;text-decoration:underline;">Email settings</a> &middot; <a href="${APP_URL}/following" style="color:#bbb;text-decoration:underline;">Unsubscribe</a></p>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:14px;color:#ccc;">Head<span style="color:#b8924a;">water</span></div>
    </td>
  </tr>

</table>
</center>
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
    subject: (() => {
      const channels = [...new Set(capped.map(s => cleanName(s.channel_name)).filter(Boolean))];
      if (channels.length) return `${channels.slice(0, 3).join(', ')} — ${capped.length} new video${capped.length !== 1 ? 's' : ''}`;
      return capped.length === 1 ? normalizeTitle(capped[0].title) || 'Your morning digest' : `${capped.length} new videos from your channels`;
    })(),
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
  <div style="font-size:13px;color:#999;margin-bottom:32px;">Head<span style="color:#b8924a;">water</span></div>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 24px;">Your first digest is waiting on you — add a channel and it arrives tomorrow morning. Pick one you already follow on YouTube; that's all it takes.</p>
  <a href="${followUrl}" style="display:inline-block;background:#1a1a1a;color:#fafaf7;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:24px;">Follow your first channel →</a>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 16px;">Not ready yet? Paste any YouTube URL and see what a summary looks like first.</p>
  <a href="${tryUrl}" style="font-size:15px;font-weight:600;color:#b8924a;text-decoration:none;">Try a video →</a>
  <p style="font-size:15px;color:#555;font-style:italic;margin-top:40px;line-height:1.6;">— Adam at Headwater</p>
  <p style="font-size:12px;color:#bbb;margin-top:16px;line-height:1.6;">If you'd rather not receive emails like this, <a href="${followUrl}" style="color:#bbb;">unsubscribe here</a>.</p>
</div>
</body></html>`;

  const text = `Your first digest is waiting on you — add a channel and it arrives tomorrow morning. Pick one you already follow on YouTube; that's all it takes.\n\nFollow your first channel: ${followUrl}\n\nNot ready yet? Paste any YouTube URL and see what a summary looks like first.\n\nTry a video: ${tryUrl}\n\n— Adam at Headwater\n\nIf you'd rather not receive emails like this: ${followUrl}`;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Your first digest is one step away',
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
  <div style="font-size:13px;color:#999;margin-bottom:32px;">Head<span style="color:#b8924a;">water</span></div>
  <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:24px;">Reset your password</div>
  <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">Click the button below to set a new password. This link expires in 1 hour.</p>
  <a href="${resetUrl}" style="display:inline-block;background:#1a1a1a;color:#fafaf7;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Reset password</a>
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
  <div style="font-size:13px;color:#999;margin-bottom:32px;">Head<span style="color:#b8924a;">water</span></div>
  <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:24px;">Verify your email</div>
  <p style="font-size:14px;color:#555;line-height:1.6;margin:0 0 24px;">Click the button below to verify your email address and complete your Headwater account. This link expires in 24 hours.</p>
  <a href="${verifyUrl}" style="display:inline-block;background:#1a1a1a;color:#fafaf7;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">Verify email</a>
  <p style="font-size:12px;color:#bbb;margin-top:32px;line-height:1.6;">If you didn't create an account, ignore this email.</p>
</div></body></html>`,
  });
}

async function sendWelcome(toEmail) {
  const followUrl = `${APP_URL}/following`;

  const html = `<!DOCTYPE html><html lang="en"><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#fff;margin:0;padding:0;">
<div style="max-width:480px;margin:0 auto;padding:48px 24px;">
  <div style="font-size:13px;color:#999;margin-bottom:32px;">Head<span style="color:#b8924a;">water</span></div>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 20px;">Tomorrow morning you'll get your first digest.</p>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 20px;">It's not a feed. It's not recommendations. Just the channels you chose — summarized well enough that most days you won't need to click through.</p>
  <p style="font-size:15px;color:#333;line-height:1.75;margin:0 0 28px;">Your attention is yours. This is a small tool to help keep it that way.</p>
  <a href="${followUrl}" style="display:inline-block;background:#1a1a1a;color:#fafaf7;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin-bottom:32px;">Add your channels →</a>
  <p style="font-size:15px;color:#555;margin:0 0 16px;line-height:1.6;">— Adam</p>
  <p style="font-size:13px;color:#888;margin:0 0 48px;line-height:1.75;"><em>P.S. Reply anytime. I read everything.</em></p>
  <p style="font-size:12px;color:#bbb;line-height:1.6;">You're receiving this because you created a Headwater account.<br><a href="${followUrl}" style="color:#bbb;">Unsubscribe</a></p>
</div>
</body></html>`;

  const text = `Tomorrow morning you'll get your first digest.\n\nIt's not a feed. It's not recommendations. Just the channels you chose — summarized well enough that most days you won't need to click through.\n\nYour attention is yours. This is a small tool to help keep it that way.\n\nAdd your channels: ${followUrl}\n\n— Adam\n\nP.S. Reply anytime. I read everything.\n\nYou're receiving this because you created a Headwater account.\nUnsubscribe: ${followUrl}`;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: 'Your attention is yours.',
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
