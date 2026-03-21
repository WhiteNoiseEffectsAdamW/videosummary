/**
 * Summarization prompt — edit this file to iterate on output quality.
 *
 * The prompt asks Claude to return a JSON object wrapped in ```json fences
 * so it can be reliably extracted even if Claude adds a preamble sentence.
 */

function buildSummarizePrompt(transcriptText, durationSeconds) {
  const durationMins = Math.round(durationSeconds / 60);

  return `You are an expert at distilling long-form video content into clear, structured summaries.

Below is the full transcript of a YouTube video (~${durationMins} minutes long). Inline timestamps appear as [M:SS] or [H:MM:SS].

YOUR TASK:
Produce a structured summary as a single JSON object wrapped in a \`\`\`json code fence. Do not include any text outside the fence. Use this exact shape:

{
  "tldr": "<2–3 sentence plain-English summary of the whole video>",
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
  "readTimeSaved": <integer — estimated minutes a reader saves by reading this summary instead of watching>,
  "verdict": {
    "action": "<one of: 'Watch', 'Skip', 'Watch segment'>",
    "segment": "<if action is 'Watch segment', the timestamp range e.g. '8:30–14:00', otherwise null>",
    "reason": "<one sentence explaining the verdict>"
  }
}

RULES:
- topics: identify 3–8 distinct sections or themes, in chronological order.
- quotes: select 2–5 of the most insightful, surprising, or quotable lines.
- readTimeSaved: base this on the video duration (${durationMins} min) minus the ~2 min it takes to read this summary.
- verdict: be decisive. 'Watch' means the full video is worth the time. 'Skip' means the summary captures everything of value. 'Watch segment' means one portion justifies the time but the rest is filler — specify the exact timestamps.
- Keep all text factual — no editorialising beyond what the speaker says.

TRANSCRIPT:
${transcriptText}`;
}

module.exports = { buildSummarizePrompt };
