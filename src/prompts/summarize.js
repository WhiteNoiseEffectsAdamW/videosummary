/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * The prompt asks Claude to return a JSON object wrapped in ```json fences
 * so it can be reliably extracted even if Claude adds a preamble sentence.
 *
 * Summary depth scales with video length:
 *   < 20 min  → tight (2-3 topics, 1 quote)
 *   20-60 min → standard (4-6 topics, 2 quotes)
 *   60+ min   → full (6-10 topics, 3 quotes)
 */

function buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled = false, channelName = null) {
  const durationMins = Math.round(durationSeconds / 60);
  const titleLine = title ? `\nVIDEO TITLE: "${title}"\n` : '';
  const channelLine = channelName ? `\nCHANNEL: "${channelName}"\n` : '';

  const transcriptFraming = isSampled
    ? `Below is a sampled transcript (~${durationMins} minutes total). Eight evenly-spaced excerpts are shown, each labeled with its approximate position in the video (e.g. [~40% into transcript]). Gaps between excerpts are marked with .... Do not infer or assume what was said in the gaps — only summarize what is explicitly present in the samples.`
    : `Below is the full transcript of a YouTube video (~${durationMins} minutes long). Inline timestamps appear as [M:SS] or [H:MM:SS].`;

  // ── Depth tiers based on video length ──────────────────────
  let topicsRule, quotesRule;

  if (durationMins < 20) {
    topicsRule = isSampled
      ? `- topics: identify 2–3 distinct themes. Use [~N%] position markers. Only include topics that represent a major shift or core claim — most short videos have one main point, don't pad it. Each description is ONE sentence.`
      : `- topics: identify 2–3 key topics, in chronological order. Only include topics that represent a major shift or core claim — most short videos have one main point, don't pad it. Each description is ONE sentence.`;
    quotesRule = `- quotes: select 1 genuinely memorable, surprising, or voice-capturing line. Must be self-contained — give the reader a taste of whether this creator is worth their time. Avoid anything offensive, misleading, or controversial when read in isolation.`;
  } else if (durationMins < 60) {
    topicsRule = isSampled
      ? `- topics: identify 4–6 distinct sections or themes in chronological order. Include at least one topic anchored in each third of the video. Use [~N%] position markers. Each topic title must be specific. Each description is ONE sentence.`
      : `- topics: identify 4–6 distinct sections or themes, in chronological order. Only include topics worth skipping to. Each description is ONE sentence.`;
    quotesRule = isSampled
      ? `- quotes: select 2 genuinely memorable, surprising, or voice-capturing lines. At least one must come from the middle 60% of the video (position markers ~20%–~80%). Must be self-contained. Avoid anything offensive, misleading, or controversial when read in isolation.`
      : `- quotes: select 2 genuinely memorable, surprising, or voice-capturing lines. Must be self-contained — give the reader a taste of whether this creator is worth their time. Avoid anything offensive, misleading, or controversial when read in isolation.`;
  } else {
    topicsRule = isSampled
      ? `- topics: identify 6–10 distinct sections or themes in chronological order. Include at least one topic anchored in each third of the video. Use [~N%] position markers. These are usually wide-ranging conversations — cover the distinct threads. Each description is ONE sentence.`
      : `- topics: identify 6–10 distinct sections or themes, in chronological order. These are usually wide-ranging conversations with multiple distinct threads. Each description is ONE sentence.`;
    quotesRule = isSampled
      ? `- quotes: select 3 genuinely memorable, surprising, or voice-capturing lines. At least one must come from the middle 60% of the video (position markers ~20%–~80%). Prefer spread across the full arc. Must be self-contained. Avoid anything offensive, misleading, or controversial when read in isolation.`
      : `- quotes: select 3 genuinely memorable, surprising, or voice-capturing lines. Prefer spread across the full arc of the video. Must be self-contained — give the reader a taste of whether this creator is worth their time. Avoid anything offensive, misleading, or controversial when read in isolation.`;
  }

  return `You are an expert at distilling long-form video content into clear, structured summaries. The user's time is the product you're protecting. Every piece of text must earn its space.

${transcriptFraming}${titleLine}${channelLine}

This video is ~${durationMins} minutes long. Match your summary depth to the content density — a 12-minute explainer should not get the same treatment as a 90-minute interview.

YOUR TASK:
Produce a structured summary as a single JSON object wrapped in a \`\`\`json code fence. Do not include any text outside the fence. Use this exact shape:

{
  "tldr": "<1–2 sentences. Answer the question the title poses: what is the actual claim, who is making it, and how supported is it? The reader should finish feeling informed, not teased. No 'In this video...' preamble. No hype. Plain declarative statements only.>",
  "titleVsDelivered": "<string or null. ONLY include when the title promises something specific that the video never delivers — a numbered list, a named person, a specific event. This is the stronger flag. Format: 'Title promises [specific claim] — [what actually happens instead].' Set to null if the video delivers what the title promises. When this is set, inContext must be null.>",
  "inContext": "<string or null. ONLY include when the title states a specific claim as fact but the video presents it as speculation, one scenario among several, or with significant caveats — and the content IS present, just framed differently than the title implies. This is the milder flag. Format: '[What the title implies] — [What is actually being claimed and how supported it is].' Set to null if titleVsDelivered is set, if the title fairly represents the content, or if the content is genuinely absent (use titleVsDelivered instead). Do NOT flag vague hype ('This changes everything'), opinion framing ('Why X is wrong'), or dramatic-but-accurate titles.>",
  "topics": [
    {
      "title": "<specific topic title>",
      "description": "<ONE sentence of context>",
      "timestamp": "<nearest timestamp from the transcript, e.g. 2:14>"
    }
  ],
  "quotes": [
    {
      "text": "<verbatim or near-verbatim quote from the transcript>",
      "timestamp": "<timestamp where this appears>",
      "setup": "<optional — under 15 words, no period. One-line context if the quote references a concept, term, or mid-argument reference that won't land on its own. Omit this field entirely if the quote stands alone.>"
    }
  ],
  "categories": ["<tag>", "<tag>"],
  "bestFor": "<under 15 words. Who gets the most value from this. Not a recommendation — just context. Examples: 'Deep Work readers wanting a 2026 update' or 'AI safety skeptics familiar with alignment debates'. Set to null if titleVsDelivered is set.>"
}

RULES:
- tldr: 1–2 sentences. Must directly answer the title's implied question or promise. Cover what the claim is, who's making it, and how supported it is. A reader should finish the tldr feeling informed, not teased.
${topicsRule}
${quotesRule}
  Prefer quotes that land without explanation. Avoid quotes that reference technical terms the reader hasn't encountered, are mid-argument responses to something unstated, or use "this"/"that" referring to something not in the quote. If a strong quote genuinely needs context, add a "setup" line (under 15 words, no period). But a quote that stands alone is always stronger than one needing scaffolding.
- titleVsDelivered: only include when the title promises something specific the video never delivers (a list, a named person, a specific event). This is the stronger flag. Most videos should have null here. Do NOT flag vague clickbait or opinion framing — only concrete broken promises.
- inContext: only include when the title implies certainty but the content IS present, just framed as speculation or one scenario. This is the milder flag. If titleVsDelivered applies, set inContext to null — only one flag per video, and titleVsDelivered always wins. Most videos should have null here.
- bestFor: under 15 words. Who gets the most value from this video. Specific audience, not a generic recommendation. Set to null if titleVsDelivered is set — a broken promise needs no audience pitch.
- categories: 2–4 short topical tags describing the video's subject matter (e.g. "Productivity", "Deep Work", "Technology", "Science", "Business", "Health"). Use title case.
- Speaker introductions: if CHANNEL is provided, the channel host needs no credentials — the reader already follows them. Use last name only and go straight to the content (e.g. "VanderKlay argues..." not "Pastor and YouTuber Paul VanderKlay argues..."). For guests or interviewees, include a brief one-line credential since the reader may not know them (e.g. "Demis Hassabis, CEO of Google DeepMind, argues...").
- Keep all text factual — no editorialising beyond what the speaker says. No promotional language.
- Every sentence must earn its space. No filler, no structural descriptions ("The video begins with..."), no padding.

TRANSCRIPT:
${transcriptText}`;
}

module.exports = { buildSummarizePrompt };
