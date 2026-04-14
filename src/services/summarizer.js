require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { buildSummarizePrompt } = require('../prompts/summarize');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function summarize(transcriptText, durationSeconds, title, isSampled = false, channelName = null) {
  const prompt = buildSummarizePrompt(transcriptText, durationSeconds, title, isSampled, channelName);

  const MAX_RETRIES = 2;
  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].text;
    try {
      const summary = parseStructuredSummary(raw);
      if (attempt > 1) console.log(`[summarize] succeeded on attempt ${attempt}`);
      return { summary, inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens };
    } catch (err) {
      console.warn(`[summarize] parse failed on attempt ${attempt}:`, raw.slice(0, 200));
      lastError = err;
    }
  }
  throw lastError;
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
