/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * The prompt asks Claude to return a JSON object wrapped in ```json fences
 * so it can be reliably extracted even if Claude adds a preamble sentence.
 *
 * Summary depth scales with video length:
 *   < 12 min  → tight (2-3 topics, 2 quotes)
 *   12-45 min → standard (4-6 topics, 3 quotes)
 *   45+ min   → full (6-10 topics, 4-5 quotes)
 */

function buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled = false, channelName = null) {
  const durationMins = Math.round(durationSeconds / 60);
  const titleLine = title ? `\nVIDEO TITLE: "${title}"\n` : '';
  const channelLine = channelName ? `\nCHANNEL: "${channelName}"\n` : '';

  const transcriptFraming = isSampled
    ? `Below is a sampled transcript (~${durationMins} minutes total). Eight evenly-spaced excerpts are shown, each labeled with its approximate position in the video (e.g. [~40% into transcript]). Gaps between excerpts are marked with .... Do not infer or assume what was said in the gaps — only summarize what is explicitly present in the samples.`
    : `Below is the full transcript of a YouTube video (~${durationMins} minutes long). Inline timestamps appear as [M:SS] or [H:MM:SS].`;

  // Depth tiers based on video length
  let topicsRule, quotesRule;

  if (durationMins < 12) {
    topicsRule = `- topics: identify 2–3 key topics, in chronological order. Only include topics that represent a major shift or core claim. Each description is 1–2 sentences — enough to convey the actual substance, not just a label.`;
    quotesRule = `- quotes: select 2 genuinely memorable, surprising, or voice-capturing lines.`;
  } else if (durationMins < 45) {
    topicsRule = `- topics: identify 4–6 distinct sections or themes, in chronological order. Each description is 1–3 sentences — include the actual claim, finding, or argument, not just what was discussed.`;
    quotesRule = `- quotes: select 3 genuinely memorable, surprising, or voice-capturing lines.`;
  } else {
    topicsRule = `- topics: identify 6–10 distinct sections or themes, in chronological order. These are usually wide-ranging conversations with multiple distinct threads. Each description is 1–3 sentences — include the actual reasoning, evidence, or conclusion.`;
    quotesRule = `- quotes: select 4–5 genuinely memorable, surprising, or voice-capturing lines. Spread across the full arc of the video.`;
  }

  return `You are an expert at distilling long-form video content into clear, structured summaries.

CORE PRINCIPLE:

This summary is not a preview — it is a replacement. The user should finish reading and feel they got what the video offered, not that they're missing something.

The user's time is the product you're protecting. But protecting their time means giving them the substance, not just a teaser. A summary that makes the user feel they still need to watch the video has failed.

Ask yourself:
- Could someone have an informed conversation about this topic using only this summary?
- Are the specific claims, evidence, and reasoning present — or just topic labels?
- If the title asks a question, does the summary answer it with the video's actual reasoning — not just "the guest argues X"?

${transcriptFraming}${titleLine}${channelLine}

This video is ~${durationMins} minutes long. Match your summary depth to the content density.

YOUR TASK:
Produce a structured summary as a single JSON object wrapped in a \`\`\`json code fence. Do not include any text outside the fence. Use this exact shape:

{
  "tldr": "<2–4 sentences. Answer the question the title poses with the video's actual argument and reasoning. Include the core claim, who is making it, and the key support or logic. The reader should finish feeling informed, not teased. No 'In this video...' preamble. No hype. Plain declarative statements.>",
  "titleVsDelivered": "<string or null. ONLY include when the title promises something specific that the video never delivers — a numbered list, a named person, a specific event. This is the stronger flag. Format: 'Title promises [specific claim] — [what actually happens instead].' Set to null if the video delivers what the title promises. When this is set, inContext must be null.>",
  "inContext": "<string or null. ONLY include when the title states a specific claim as fact but the video presents it as speculation, one scenario among several, or with significant caveats — and the content IS present, just framed differently than the title implies. This is the milder flag. Format: '[What the title implies] — [What is actually being claimed and how supported it is].' Set to null if titleVsDelivered is set, if the title fairly represents the content, or if the content is genuinely absent (use titleVsDelivered instead). Do NOT flag vague hype ('This changes everything'), opinion framing ('Why X is wrong'), or dramatic-but-accurate titles.>",
  "topics": [
    {
      "title": "<specific topic title>",
      "description": "<1–3 sentences. Include the actual claim, argument, evidence, or finding — not just that it was discussed. If it's an argument, give the reasoning. If it's a claim, give the support. If it's an objection, explain how it was addressed.>",
      "timestamp": "<nearest timestamp from the transcript, e.g. 2:14>"
    }
  ],
  "quotes": [
    {
      "text": "<verbatim or near-verbatim quote from the transcript>",
      "timestamp": "<timestamp where this appears>",
      "setup": "<optional — under 15 words, no period. One-line context if the quote references a concept, term, or mid-argument reference that won't land on its own. Use this liberally for technical or philosophical content. Omit only if the quote truly stands alone.>"
    }
  ],
  "categories": ["<tag>", "<tag>"],
  "bestFor": "<under 15 words. Who gets the most value from this. Specific audience, not generic. Set to null if titleVsDelivered is set.>"
}

RULES:

- tldr: 2–4 sentences. Must directly answer the title's implied question with the video's actual reasoning. Cover what the claim is, who's making it, and the key logic or evidence. A reader should be able to explain this to someone else after reading.

${topicsRule}

${quotesRule}
  Prefer quotes that capture the speaker's voice or a key insight. For technical or philosophical content, use setup lines liberally — the reader needs context. A quote with good context is better than a quote that confuses.

- titleVsDelivered: only include when the title promises something specific the video never delivers. This is the stronger flag. Most videos should have null here.

- inContext: only include when the title implies certainty but the content is presented as speculation or one scenario. This is the milder flag. If titleVsDelivered applies, set inContext to null. Most videos should have null here.

- bestFor: under 15 words. Who gets the most value. Set to null if titleVsDelivered is set.

- categories: 2–4 short topical tags (e.g., "Philosophy", "Consciousness", "AI", "Neuroscience").

- Speaker introductions: if CHANNEL is provided, the channel host needs no credentials — the reader already follows them. Use last name only and go straight to the content (e.g. "VanderKlay argues..." not "Pastor and YouTuber Paul VanderKlay argues..."). For guests or interviewees, include a brief one-line credential since the reader may not know them (e.g. "Demis Hassabis, CEO of Google DeepMind, argues...").

CONTENT-AWARE DEPTH:

For philosophical, technical, or argumentative content — where the value is in the reasoning, not just the conclusions — go deeper:

1. Give the actual argument, not just that an argument exists.
   - BAD: "Strawson walks through his formal inference for panpsychism."
   - GOOD: "Strawson's argument: (1) physicalism is true, (2) consciousness is real, (3) therefore consciousness is physical, (4) radical emergence is incoherent, (5) therefore consciousness must be foundational."

2. Explain why premises are defended.
   - BAD: "Strawson argues radical emergence is incoherent."
   - GOOD: "Radical emergence would mean consciousness arising from wholly non-conscious matter with nothing about the base that could explain it — inexplicable even in principle, unlike heat or wetness which reduce smoothly to particle motion."

3. Include key distinctions and concepts.
   - If a term is introduced (e.g., "silence of physics"), explain it: "Physics describes structure and relations but makes no claims about intrinsic nature — leaving room for consciousness at the base."

4. Show how objections are addressed.
   - BAD: "Strawson addresses the combination problem."
   - GOOD: "On why tables aren't conscious: aggregation alone doesn't create unified consciousness — a football team huddling doesn't become one mind. It takes electrochemical complexity."

5. For investigative or documentary content, include the specific evidence.
   - BAD: "Dentists describe problems with corporate dental chains."
   - GOOD: "Two dentists who worked at Heartland Dental describe being ranked daily by revenue and pressured by non-clinical managers to recommend expensive procedures regardless of need."

FINAL CHECK:

Before outputting, ask: If someone only reads this summary, would they feel informed — or would they feel like they're missing something? If the latter, add more substance.

TRANSCRIPT:
${transcriptText}`;
}

module.exports = { buildSummarizePrompt };
