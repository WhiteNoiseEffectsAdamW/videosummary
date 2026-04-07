/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * The prompt asks Claude to return a JSON object wrapped in ```json fences
 * so it can be reliably extracted even if Claude adds a preamble sentence.
 */

function buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled = false) {
  const durationMins = Math.round(durationSeconds / 60);
  const titleLine = title ? `\nVIDEO TITLE: "${title}"\n` : '';

  const transcriptFraming = isSampled
    ? `Below is a sampled transcript (~${durationMins} minutes total). Eight evenly-spaced excerpts are shown, each labeled with its approximate position in the video (e.g. [~40% into transcript]). Gaps between excerpts are marked with .... Do not infer or assume what was said in the gaps — only summarize what is explicitly present in the samples.`
    : `Below is the full transcript of a YouTube video (~${durationMins} minutes long). Inline timestamps appear as [M:SS] or [H:MM:SS].`;

  const topicsRule = isSampled
    ? `- topics: identify 5–8 distinct sections or themes in chronological order. Include at least one topic anchored in each of: the first third, middle third, and final third of the video runtime. Use the [~N%] position markers to place topics accurately. Each topic title must be specific enough to distinguish it from every other topic — generic titles like "Further discussion" are not acceptable. Each description is ONE sentence max.`
    : `- topics: identify 3–8 distinct sections or themes, in chronological order. Only include topics worth skipping to. Each description is ONE sentence max — just enough context to know whether to jump there.`;

  const quotesRule = isSampled
    ? `- quotes: select 2–3 genuinely memorable, surprising, or voice-capturing lines. At least one must come from the middle 60% of the video (position markers ~20%–~80%). Prefer spread across the full arc, but never force a quote that isn't genuinely self-contained. Quotes should give the reader a taste of whether this creator is worth their time without needing explanation. Avoid anything offensive, misleading, or controversial when read in isolation.`
    : `- quotes: select 2–3 genuinely memorable, surprising, or voice-capturing lines. Quotes must be self-contained — they should give the reader a taste of whether this creator is worth their time without needing explanation. No context paragraph needed. Avoid anything that could sound offensive, misleading, or controversial when read in isolation.`;

  return `You are an expert at distilling long-form video content into clear, structured summaries. The user's time is the product you're protecting. Every piece of text must earn its space.

${transcriptFraming}${titleLine}

YOUR TASK:
Produce a structured summary as a single JSON object wrapped in a \`\`\`json code fence. Do not include any text outside the fence. Use this exact shape:

{
  "tldr": "<20–40 words, 1–2 sentences. Answer the question the title poses: what is the actual claim, who is making it, and how supported is it? The reader should finish feeling informed, not teased. No 'In this video...' preamble. No hype. Plain declarative statements only.>",
  "headsUp": "<string or null. ONLY include when the title makes a specific, verifiable promise the video does not deliver. Format: 'Title promises [specific claim] — [what actually happens instead].' Triggers: numbered lists not present, specific events not covered. Set to null if the video delivers what the title promises.>",
  "inContext": "<string or null. ONLY include when the title states or strongly implies a specific claim as fact, but the video actually presents it as speculation, one scenario among several, or with significant caveats. Format: '[What the title implies] — [What is actually being claimed and how supported it is].' Set to null if the title fairly represents the content. Do NOT flag vague hype ('This changes everything'), opinion framing ('Why X is wrong'), or dramatic-but-accurate titles.>",
  "topics": [
    {
      "title": "<specific topic title>",
      "description": "<ONE sentence of context — what's covered and why it matters>",
      "timestamp": "<nearest timestamp from the transcript, e.g. 2:14>"
    }
  ],
  "quotes": [
    {
      "text": "<verbatim or near-verbatim quote from the transcript>",
      "timestamp": "<timestamp where this appears>"
    }
  ],
  "categories": ["<tag>", "<tag>"],
  "verdict": "<one sentence: who this video is most useful for and whether it's worth the full watch. Be specific about the audience. Never say 'skip' or tell the reader what to do — just give context.>"
}

RULES:
${topicsRule}
${quotesRule}
- headsUp: only include when there is a specific, verifiable mismatch between title and content. Most videos should have null here. Do NOT flag vague clickbait or opinion framing — only concrete broken promises (numbers not present, specific events not covered).
- inContext: only include when the title states a specific claim as fact that the video explicitly frames as speculation, hypothesis, or one possibility among several. Most videos should have null here.
- categories: 2–4 short topical tags describing the video's subject matter (e.g. "Productivity", "Deep Work", "Technology", "Science", "Business", "Health"). Use title case.
- tldr: 20–40 words, 1–2 sentences. Must directly answer the title's implied question or promise. Cover what the claim is, who's making it, and how supported it is. If the title asks "Is X worth it?", open with the answer. If it teases a discovery, state what was actually found. A reader should finish the tldr feeling informed, not teased.
- Keep all text factual — no editorialising beyond what the speaker says. No promotional language.
- Every sentence must earn its space. No filler, no structural descriptions ("The video begins with..."), no padding.

TRANSCRIPT:
${transcriptText}`;
}

module.exports = { buildSummarizePrompt };
