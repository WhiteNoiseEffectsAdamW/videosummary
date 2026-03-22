require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { buildSummarizePrompt } = require('../prompts/summarize');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Safety cap: ~80 k chars ≈ 20 k tokens, covers a 45-60 min video.
// Trims from the middle to preserve intro and conclusion.
const MAX_TRANSCRIPT_CHARS = 80_000;

function trimTranscript(text) {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text;
  const half = Math.floor(MAX_TRANSCRIPT_CHARS / 2);
  return (
    text.slice(0, half) +
    '\n\n[... middle of transcript trimmed for length ...]\n\n' +
    text.slice(-half)
  );
}

async function summarize(transcriptText, durationSeconds, title) {
  const trimmed = trimTranscript(transcriptText);
  const prompt = buildSummarizePrompt(trimmed, durationSeconds, title);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text;
  return parseStructuredSummary(raw);
}

function parseStructuredSummary(raw) {
  // Extract JSON from ```json ... ``` fence, or fall back to bare JSON.
  const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonText = fenceMatch ? fenceMatch[1] : raw;
  try {
    return JSON.parse(jsonText.trim());
  } catch {
    const detail = process.env.NODE_ENV !== 'production' ? ' Raw: ' + raw.slice(0, 300) : '';
    throw new Error('Summary generation failed — please try again.' + detail);
  }
}

module.exports = { summarize };
