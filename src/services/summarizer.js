require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { buildSummarizePrompt } = require('../prompts/summarize');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarize(transcriptText, durationSeconds, title, isSampled = false) {
  const prompt = buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled);

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].text;
  const summary = parseStructuredSummary(raw);
  return { summary, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
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
