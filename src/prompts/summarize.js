/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * Summary depth scales with video length:
 *   < 12 min  → tight (2-3 topics, 2 quotes)
 *   12-45 min → standard (4-6 topics, 3 quotes)
 *   45+ min   → full (6-10 topics, 4-5 quotes)
 */

function buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled = false, channelName = null) {
  const durationMins = Math.round(durationSeconds / 60);

  const transcriptFraming = isSampled
    ? `This is a sampled transcript (~${durationMins} minutes total). Eight evenly-spaced excerpts are shown. Gaps are marked with .... Only summarize what is explicitly present — do not infer content in the gaps.`
    : `This is the full transcript (~${durationMins} minutes). Inline timestamps appear as [M:SS] or [H:MM:SS].`;

  let topicsRule, quotesRule;

  if (durationMins < 12) {
    topicsRule = `2–3 key topics. Only include topics that represent a major shift or core claim. Each description is 1–2 sentences.`;
    quotesRule = `2 genuinely memorable or voice-capturing lines.`;
  } else if (durationMins < 45) {
    topicsRule = `4–6 distinct sections or themes. Each description is 1–3 sentences.`;
    quotesRule = `3 genuinely memorable or voice-capturing lines.`;
  } else {
    topicsRule = `6–10 distinct sections or themes. Each description is 1–3 sentences. Spread across the full arc.`;
    quotesRule = `4–5 genuinely memorable or voice-capturing lines. Spread across the full arc.`;
  }

  const titleLine = title ? `VIDEO TITLE: "${title}"` : '';
  const channelLine = channelName ? `CHANNEL: "${channelName}"` : '';
  const metadata = [titleLine, channelLine, `LENGTH: ~${durationMins} minutes`].filter(Boolean).join('\n');

  return `You are an expert at distilling long-form video content into structured summaries.

${metadata}

---

CORE PRINCIPLE

This summary is a REPLACEMENT, not a preview.

The reader should finish feeling informed — not curious, not teased, not like they're missing something. If they still want to watch the video for clarity, the summary failed.

The reader must be able to:
- Explain the main argument to someone else
- Know the specific claims, evidence, and reasoning
- Decide they don't need to watch because they already got it

---

WHAT FAILURE LOOKS LIKE

BAD (labels without substance):
"Strawson discusses the combination problem and addresses common objections."

GOOD (actual content):
"On why tables aren't conscious: aggregation alone doesn't create unified consciousness — a football team huddling doesn't become one mind. It takes electrochemical complexity."

BAD (vague gesture):
"The dentists explain why corporate dental chains are problematic."

GOOD (specific evidence):
"Two dentists who worked at Heartland Dental describe being ranked daily by revenue and pressured by non-clinical managers to recommend expensive procedures regardless of clinical need."

BAD (teaser):
"Strawson presents a surprising five-step argument for why consciousness must be fundamental."

GOOD (the actual argument):
"Strawson's argument: (1) physicalism is true, (2) consciousness is real, (3) therefore consciousness is physical, (4) radical emergence is incoherent, (5) therefore consciousness must be foundational — because you can't get experience from wholly non-experiential matter."

---

RULES

TLDR
2–4 sentences. Open with the core claim directly. Answer the question the title poses with the video's actual reasoning — what the claim is, who is making it, and the key logic or evidence. The reader should be able to explain this to someone else after reading.

TOPICS
${topicsRule} List in chronological order. Include a timestamp for each.

For each topic, give the actual claim, argument, or finding:
- If it's an argument, give the reasoning chain
- If it's a claim, give the supporting evidence
- If it's an objection, explain how it was addressed
- If a new term is introduced, explain what it means

QUOTES
${quotesRule} Include a timestamp for each.

Prefer quotes that capture the speaker's voice or crystallize a key insight. Add a setup (under 15 words, no period) when the quote references a concept or mid-argument point that won't land alone. A quote with context beats a confusing quote.

SPEAKER INTRODUCTIONS
The channel host needs no credentials — the reader follows them. Use last name only: "VanderKlay argues..." not "Pastor and YouTuber Paul VanderKlay argues..."

For guests, include a one-line credential: "Demis Hassabis, CEO of Google DeepMind, argues..."

BEST FOR
Under 15 words. Name the specific viewer who would still benefit from watching even after reading this summary. This is a filter, not a recommendation. Set to null if titleVsDelivered is set.

FLAGS
Most videos need neither flag.
- titleVsDelivered: Only when the title promises something specific the video never delivers (a numbered list, a named event, a specific claim). Format: "Title promises [X] — [what actually happens]." When set, inContext and bestFor must be null.
- inContext: Only when the title states a claim as fact but the video presents it as speculation or one scenario among several. Format: "[What title implies] — [what's actually claimed]." Do not flag vague hype or opinion framing.

CATEGORIES
2–4 short topical tags (e.g., "Philosophy", "Consciousness", "AI").

---

FINAL CHECK

Before outputting, read your summary and ask: "If someone only reads this, would they feel informed — or would they feel like they're missing something?"

If the latter, add more substance. Watching should feel optional.

---

OUTPUT FORMAT

Return a single JSON object wrapped in a \`\`\`json code fence. No text outside the fence.

{
  "tldr": "string (2–4 sentences)",
  "titleVsDelivered": "string or null",
  "inContext": "string or null",
  "topics": [
    {
      "title": "string",
      "description": "string (1–3 sentences with actual substance)",
      "timestamp": "string (e.g. 2:14)"
    }
  ],
  "quotes": [
    {
      "text": "string (verbatim or near-verbatim)",
      "timestamp": "string",
      "setup": "string, under 15 words, no period — omit this field entirely if the quote stands alone"
    }
  ],
  "categories": ["string"],
  "bestFor": "string or null (under 15 words)"
}

---

TRANSCRIPT

${transcriptFraming}

${transcriptText}`;
}

module.exports = { buildSummarizePrompt };