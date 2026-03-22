const cron = require('node-cron');
const { XMLParser } = require('fast-xml-parser');
const { db } = require('../db');
const { getTranscript } = require('../services/transcript');
const { summarize } = require('../services/summarizer');
const summaryModel = require('../models/summary');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

// Fetch recent videos from a channel's RSS feed
async function fetchChannelVideos(channelId) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`RSS ${res.status} for channel ${channelId}`);
  const xml = await res.text();
  const feed = parser.parse(xml);
  const entries = feed?.feed?.entry ?? [];
  return Array.isArray(entries) ? entries : [entries];
}

// Summarize a video if not already cached
async function processVideo(videoId, channelId, channelName, title) {
  const cached = await summaryModel.findByVideoId(videoId);
  if (cached) return;

  console.log(`[poll] summarizing ${videoId} — "${title}"`);
  const { text, durationSeconds } = await getTranscript(videoId);
  const summary = await summarize(text, durationSeconds, title);
  await summaryModel.create({
    videoId,
    channelId,
    channelName: channelName || null,
    title: title || summary.tldr?.slice(0, 100) || videoId,
    summary,
    transcriptLength: text.length,
  });
  console.log(`[poll] done ${videoId}`);
}

// Main poll — checks all followed channels for videos in the last 25h
async function pollAllChannels() {
  console.log('[poll] starting');
  const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000);

  const rows = await db('subscriptions').where({ active: true }).distinct('channel_id', 'channel_name');
  const channelIds = rows.map((r) => r.channel_id);

  if (!channelIds.length) {
    console.log('[poll] no active subscriptions, skipping');
    return;
  }

  console.log(`[poll] checking ${channelIds.length} channel(s)`);

  for (const row of rows) {
    const { channel_id: channelId, channel_name: channelName } = row;
    try {
      const videos = await fetchChannelVideos(channelId);
      const recent = videos.filter((v) => new Date(v.published) > cutoff);
      console.log(`[poll] ${channelId}: ${recent.length} new video(s)`);

      for (const video of recent) {
        const videoId = video['yt:videoId'];
        const title = typeof video.title === 'string' ? video.title : videoId;
        try {
          await processVideo(videoId, channelId, channelName, title);
        } catch (err) {
          console.error(`[poll] failed to process ${videoId}:`, err.message);
        }
      }
    } catch (err) {
      console.error(`[poll] failed channel ${channelId}:`, err.message);
    }
  }

  console.log('[poll] done');
}

// Scan a single channel for recent videos — used on first follow
async function scanChannel(channelId, channelName, lookbackMs = 7 * 24 * 60 * 60 * 1000) {
  const cutoff = new Date(Date.now() - lookbackMs);
  try {
    const videos = await fetchChannelVideos(channelId);
    const recent = videos.filter((v) => new Date(v.published) > cutoff);
    console.log(`[scan] ${channelId}: ${recent.length} video(s) in window`);
    for (const video of recent) {
      const videoId = video['yt:videoId'];
      const title = typeof video.title === 'string' ? video.title : videoId;
      try {
        await processVideo(videoId, channelId, channelName, title);
      } catch (err) {
        console.error(`[scan] failed ${videoId}:`, err.message);
      }
    }
  } catch (err) {
    console.error(`[scan] failed channel ${channelId}:`, err.message);
  }
}

function startPolling() {
  // Run at the top of every hour
  cron.schedule('0 * * * *', pollAllChannels);
  console.log('[poll] scheduled — runs hourly');
}

module.exports = { startPolling, pollAllChannels, scanChannel };
