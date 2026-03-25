/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * The prompt asks Claude to return a JSON object wrapped in ```json fences
 * so it can be reliably extracted even if Claude adds a preamble sentence.
 */

function buildSummarizePrompt(transcriptText, durationSeconds, title) {
  const durationMins = Math.round(durationSeconds / 60);
  const titleLine = title ? `\nVIDEO TITLE: "${title}"\n` : '';

  return `You are an expert at distilling long-form video content into clear, structured summaries.

Below is the full transcript of a YouTube video (~${durationMins} minutes long). Inline timestamps appear as [M:SS] or [H:MM:SS].${titleLine}

YOUR TASK:
Produce a structured summary as a single JSON object wrapped in a \`\`\`json code fence. Do not include any text outside the fence. Use this exact shape:

{
  "tldr": "<2 sentences. First sentence directly answers or addresses what the title implies — state the actual finding, conclusion, or answer upfront. Second sentence adds the most important supporting detail or context. No 'In this video...' preamble. No hype. Plain declarative statements only.>",
  "titleClaim": {
    "claim": "<what the title implies or promises>",
    "reality": "<what the video actually delivers — be specific and honest>"
  },
  "topics": [
    {
      "title": "<section or topic title>",
      "description": "<1–2 sentence description of what's covered>",
      "timestamp": "<nearest timestamp from the transcript, e.g. 2:14>"
    }
  ],
  "quotes": [
    {
      "text": "<verbatim or near-verbatim quote from the transcript>",
      "timestamp": "<timestamp where this appears>",
      "context": "<one sentence explaining why this quote is notable>"
    }
  ],
  "categories": ["<tag>", "<tag>"],
}

RULES:
- topics: identify 3–8 distinct sections or themes, in chronological order.
- quotes: select 2–5 of the most insightful, surprising, or quotable lines.
- titleClaim: only include if the title can be evaluated against the content (i.e. it makes a specific promise, tease, or claim). If the title is straightforward and accurately describes the video, set both fields to null. Be honest — note if it's clickbait, misleading, or accurate.
- categories: 2–4 short topical tags describing the video's subject matter (e.g. "Productivity", "Deep Work", "Technology", "Science", "Business", "Health"). Use title case.
- tldr: must directly address the title's implied question or promise. If the title asks "Is X worth it?", open with the answer. If it teases a discovery, state what was actually found. Never open with "This video covers..." or "The creator discusses...". Write as if answering the title in two plain sentences.
- Keep all text factual — no editorialising beyond what the speaker says. No promotional language.

TRANSCRIPT:
${transcriptText}`;
}

module.exports = { buildSummarizePrompt };
