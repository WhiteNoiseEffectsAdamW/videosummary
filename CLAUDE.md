# Video Summarizer — Architecture Guide

## Overview
A full-stack app that fetches YouTube transcripts and generates structured summaries using Claude. Built in two phases.

---

## Folder Structure

```
videosummary/
├── src/                     Backend (Node/Express)
│   ├── server.js            Entry point, boots Express + runs DB migrations
│   ├── db/index.js          knex instance + schema migrations (runs on start)
│   ├── models/summary.js    Summary cache: findByVideoId, create
│   ├── services/
│   │   ├── transcript.js    Fetches YouTube transcript via youtube-transcript pkg
│   │   └── summarizer.js    Calls Anthropic API, parses JSON response
│   ├── prompts/summarize.js THE prompt — edit here to change summary shape/quality
│   ├── routes/summary.js    GET /api/summary?url=
│   ├── middleware/
│   │   └── errorHandler.js  Express error middleware
│   ├── jobs/                Phase 2: cron job definitions (e.g. poll-channels.js)
│   └── workers/             Phase 2: background worker processes
└── client/                  Frontend (Vite + React)
    ├── vite.config.js       Proxies /api → localhost:3001 in dev
    └── src/
        ├── App.jsx
        └── components/SummaryDisplay.jsx
```

---

## Key Decisions

### Database: knex + SQLite → Postgres path
`knex` is the query builder. The driver is `sqlite3` now. To switch to Postgres:
1. `npm install pg`
2. Change `src/db/index.js` client from `'sqlite3'` to `'pg'`
3. Change `connection.filename` to `connection: process.env.DB_URL`
4. Zero query changes needed — knex abstracts the SQL dialect.

### Summary caching
Summaries are stored in the `summaries` table keyed on `video_id`. A repeat request for the same video returns the cached result immediately (no API call). The response includes `"cached": true` so the client can display it.

### Prompt isolation
The entire summarization prompt lives in `src/prompts/summarize.js`. To change the output shape, only edit that file. The response schema is:
```json
{
  "tldr": "string",
  "topics": [{ "title", "description", "timestamp" }],
  "quotes":  [{ "text", "timestamp", "context" }],
  "readTimeSaved": number
}
```

### Transcript retry
`src/services/transcript.js` retries up to 3 times with exponential backoff before surfacing an error. Distinguishes "no transcript available" (user-facing) from network failures (retried).

### Phase 2 tables already in schema
`users` and `subscriptions` tables are created on first boot even though Phase 1 doesn't use them. This avoids a future migration while we're still local.

---

## Phase 2: Auto-summarization Wiring

When you're ready to build Phase 2:

### 1. Jobs (`src/jobs/`)
Create a `poll-channels.js` job that:
- Queries `subscriptions` table for active subscriptions
- Calls YouTube Data API (or RSS feed at `https://www.youtube.com/feeds/videos.xml?channel_id=CHANNEL_ID`) to check for new videos
- Enqueues video IDs to a worker queue

Suggested scheduler: `node-cron` for simple intervals, or `bull`/`bullmq` for persistent queues.

### 2. Workers (`src/workers/`)
Create a `summarize-worker.js` that:
- Dequeues a video ID
- Calls `getTranscript` + `summarize` (already built)
- Saves to DB via `summaryModel.create`
- Triggers email/notification via a new `src/services/notifier.js`

### 3. User model (`src/models/user.js`)
Already has the `users` and `subscriptions` DB tables. Add CRUD methods following the same pattern as `src/models/summary.js`.

### 4. Auth
Add JWT auth middleware in `src/middleware/auth.js`. Route the subscription management endpoints through it.

---

## Running Locally

```bash
# 1. Copy env file and add your Anthropic API key
cp .env.example .env

# 2. Install backend deps
npm install

# 3. Install frontend deps
cd client && npm install && cd ..

# 4. Start backend (auto-creates videosummary.db on first run)
npm run dev

# 5. In a separate terminal, start frontend dev server
cd client && npm run dev
```

Backend: http://localhost:3001
Frontend: http://localhost:5173
API: `GET http://localhost:3001/api/summary?url=https://www.youtube.com/watch?v=VIDEO_ID`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | From console.anthropic.com |
| `PORT` | No | Backend port, defaults to 3001 |
| `NODE_ENV` | No | Set to `production` to serve React build |
