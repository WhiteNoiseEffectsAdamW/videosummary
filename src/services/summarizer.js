require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { buildSummarizePrompt } = require('../prompts/summarize');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Safety cap: ~400 k chars ≈ 100 k tokens, well within Claude's 200 k context.
// Trims from the middle to preserve intro and conclusion.
const MAX_TRANSCRIPT_CHARS = 400_000;

function trimTranscript(text) {
  if (text.length <= MAX_TRANSCRIPT_CHARS) return text;
  const half = Math.floor(MAX_TRANSCRIPT_CHARS / 2);
  return (
    text.slice(0, half) +
    '\n\n[... middle of transcript trimmed for length ...]\n\n' +
    text.slice(-half)
  );
}

async function summarize(transcriptText, durationSeconds) {
  const trimmed = trimTranscript(transcriptText);
  const prompt = buildSummarizePrompt(trimmed, durationSeconds);

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
    throw new Error('Claude returned malformed JSON. Raw response: ' + raw.slice(0, 300));
  }
}

module.exports = { summarize };
