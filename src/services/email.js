const { Resend } = require('resend');

const FROM = process.env.FROM_EMAIL || 'digest@yourdomain.com';

function getResend() {
  if (!process.env.RESEND_API_KEY) throw new Error('RESEND_API_KEY not set');
  return new Resend(process.env.RESEND_API_KEY);
}

function renderDigestHtml(summaries) {
  const items = summaries.map((s) => {
    const data = JSON.parse(s.summary_json);
    const { tldr, topics = [], verdict } = data;
    const videoUrl = `https://www.youtube.com/watch?v=${s.video_id}`;

    const verdictHtml = verdict ? `
      <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:${
        verdict.action === 'Watch' ? '#22c55e' : verdict.action === 'Skip' ? '#ef4444' : '#f59e0b'
      }">
        ${verdict.action === 'Watch segment' ? `Watch ${verdict.segment}` : verdict.action}
        <span style="font-weight:400;color:#666;"> — ${verdict.reason}</span>
      </p>` : '';

    const topicsHtml = topics.slice(0, 3).map((t) =>
      `<li style="margin-bottom:4px;font-size:13px;color:#444;">${t.title}${t.timestamp ? ` <span style="color:#999">(${t.timestamp})</span>` : ''}</li>`
    ).join('');

    return `
      <div style="border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:20px;">
        <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;">
          <a href="${videoUrl}" style="color:#111;text-decoration:none;">${s.title || s.video_id}</a>
        </h2>
        ${verdictHtml}
        <p style="margin:0 0 12px;font-size:14px;color:#444;line-height:1.6;">${tldr}</p>
        ${topicsHtml ? `<ul style="margin:0;padding-left:18px;">${topicsHtml}</ul>` : ''}
        <p style="margin:12px 0 0;">
          <a href="${videoUrl}" style="font-size:13px;color:#6366f1;">Watch on YouTube →</a>
        </p>
      </div>`;
  }).join('');

  return `
    <div style="max-width:600px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
      <h1 style="font-size:20px;font-weight:600;margin:0 0 4px;">Your daily digest</h1>
      <p style="margin:0 0 24px;font-size:13px;color:#999;">${summaries.length} new video${summaries.length !== 1 ? 's' : ''} from your followed channels</p>
      ${items}
      <p style="margin:32px 0 0;font-size:12px;color:#999;border-top:1px solid #e5e7eb;padding-top:16px;">
        You're receiving this because you follow these channels on VideoSummary.
      </p>
    </div>`;
}

async function sendDigest(toEmail, summaries) {
  if (!summaries.length) return;

  await getResend().emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your digest — ${summaries.length} new video${summaries.length !== 1 ? 's' : ''}`,
    html: renderDigestHtml(summaries),
  });
}

module.exports = { sendDigest };
