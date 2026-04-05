# Headwater — Project Handoff Notes
*Written for a new Claude instance picking up this project.*

---

## What This Is

**Headwater** is a YouTube summarization app. Users paste a video URL, get a structured AI summary (TL;DR, topics, quotes, title vs. reality). They can follow channels and receive a daily morning digest email with summaries of new videos from those channels.

Live at: **headwaterapp.com** (deployed on Railway)

GitHub: `WhiteNoiseEffectsAdamW/videosummary`

---

## Stack

| Layer | Tech |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite locally → Postgres on Railway (auto-detected via `DATABASE_URL`) |
| Query builder | knex |
| Frontend | Vite + React (served from `client/`) |
| AI | Anthropic Claude (via `@anthropic-ai/sdk`) — currently **Sonnet** for all summarization |
| Transcript | Supadata API in production, yt-dlp locally |
| Email | Resend |
| Auth | express-session + passport-local |
| Deployment | Railway (single service, Express serves the React build in production) |

---

## Folder Structure

```
videosummary/
├── src/                        Backend
│   ├── server.js               Entry point — boots Express, runs DB migrations, starts cron jobs
│   ├── db/index.js             knex instance + ALL schema migrations (runs on every boot, additive)
│   ├── models/
│   │   ├── summary.js          Summary cache CRUD + user_saves
│   │   ├── subscription.js     Channel subscription CRUD
│   │   └── user.js             User CRUD
│   ├── services/
│   │   ├── transcript.js       Fetches transcript — Supadata (prod) or yt-dlp (local)
│   │   ├── summarizer.js       Calls Anthropic API, parses JSON response
│   │   └── email.js            All email rendering + sending (Resend)
│   ├── prompts/summarize.js    THE prompt — edit here to change summary shape/quality
│   ├── routes/
│   │   ├── summary.js          GET /api/summary?url= and GET /api/summary/:videoId
│   │   ├── auth.js             Register, login, logout, verify email, password reset
│   │   ├── subscriptions.js    CRUD for channel subscriptions
│   │   ├── channels.js         Resolve channel URL → channelId, scan for new videos
│   │   ├── videos.js           My Videos list, delete, send-test-digest
│   │   └── og.js               OG image generation + thumbnail proxy
│   ├── jobs/
│   │   ├── poll-channels.js    Cron: scans followed channels for new videos, summarizes them
│   │   ├── send-digests.js     Cron: sends morning digest emails at 7am ET
│   │   └── send-nudges.js      Cron: sends onboarding nudge email to new users without channels
│   └── middleware/
│       ├── requireAuth.js      Auth guard middleware
│       ├── passport.js         Passport local strategy setup
│       └── errorHandler.js     Express error handler
└── client/                     Frontend (Vite + React)
    ├── vite.config.js          Proxies /api → localhost:3001 in dev
    └── src/
        ├── App.jsx             Home page (URL input → summary), routing
        ├── AuthContext.jsx     User session context
        ├── app.css             All styles (single file, no CSS modules)
        ├── components/
        │   ├── SummaryDisplay.jsx      Renders a summary (used on home, public, welcome pages)
        │   ├── PopularChannelSelect.jsx Dropdown of suggested channels to follow
        │   ├── Nav.jsx                 Top nav + mobile bottom tab bar
        │   └── ErrorBoundary.jsx
        └── pages/
            ├── VideosPage.jsx          My Videos list
            ├── ChannelsPage.jsx        Following / manage channels
            ├── WelcomePage.jsx         Onboarding flow (post-registration)
            ├── PublicSummaryPage.jsx   /s/:videoId public summary view
            ├── LandingPage.jsx         Marketing landing page (logged-out)
            ├── AccountPage.jsx         Account settings
            ├── LoginPage / RegisterPage / ForgotPasswordPage / ResetPasswordPage / VerifyEmailPage
            └── PrivacyPage / TermsPage
```

---

## Environment Variables

| Variable | Required | Where | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Railway + local | Claude API key |
| `RESEND_API_KEY` | Yes (prod) | Railway | Email sending |
| `DATABASE_URL` | Yes (prod) | Railway | Postgres connection string. If absent, uses SQLite locally |
| `SESSION_SECRET` | Yes (prod) | Railway | Express session secret |
| `SUPADATA_API_KEY` | Yes (prod) | Railway | Transcript API. If absent, falls back to yt-dlp |
| `APP_URL` | Yes (prod) | Railway | e.g. `https://headwaterapp.com` — used in email links |
| `SENTRY_DSN` | No | Railway | Error tracking |
| `DAILY_USER_CAP` | No | Railway | Max summaries per user per day (default 20) |
| `POLL_DAILY_CAP` | No | Railway | Max AI calls from cron per day (default 150) |
| `PORT` | No | — | Default 3001 |

Local dev: copy `.env.example` to `.env`, fill in `ANTHROPIC_API_KEY`. SQLite + yt-dlp used automatically.

---

## Running Locally

```bash
# 1. Install backend deps
npm install

# 2. Install frontend deps
cd client && npm install && cd ..

# 3. Start backend (auto-creates videosummary.db, runs migrations)
npm run dev

# 4. In a separate terminal, start frontend
cd client && npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (proxies /api to backend)

---

## Database Schema (key tables)

### `summaries`
Caches every summarized video. Keyed on `video_id`.
- `video_id`, `title`, `channel_id`, `channel_name`, `summary_json` (full JSON), `duration_seconds`, `transcript_length`, `input_tokens`, `output_tokens`

### `users`
- `email`, `password_hash`, `email_digest` (boolean, opt-in), `email_verified`, `nudge_sent_at`
- Reset token fields: `reset_token`, `reset_token_expires`
- Verification fields: `verification_token`, `verification_token_expires`

### `subscriptions`
Channels a user follows.
- `user_id`, `channel_id`, `channel_name`, `avatar_url`, `active`, `digest`, `include_shorts`, `sort_order`

### `user_saves`
Links users to videos in their My Videos list.
- `user_id`, `video_id`, `dismissed`

**Migrations run automatically on boot** in `src/db/index.js` — additive only, safe to run repeatedly.

---

## How Summarization Works

1. User POSTs a YouTube URL
2. `extractVideoId()` parses the video ID
3. Check cache — if hit, return immediately (+ background title refresh via oEmbed)
4. Fetch transcript: **Supadata API** (prod) or **yt-dlp** (local)
5. Transcript processing:
   - Under 50k chars → use full transcript
   - Over 50k chars → 8-window time-based sampling (evenly spaced through video)
6. Call Claude Sonnet with prompt from `src/prompts/summarize.js`
7. Parse JSON response, store in DB, return to client

**The prompt** (`src/prompts/summarize.js`) is the most important file for output quality. It asks Claude for: `tldr`, `titleClaim` (implied vs. delivered), `topics`, `quotes`, `categories`. Edit only this file to change summary shape.

**Model choice:** Sonnet for everything. Haiku was evaluated — it "thinks like a librarian" (comprehensive but buries the thesis), Sonnet "thinks like a writer" (finds the argument). For a newsletter product, Sonnet is the right call. A two-pass pipeline (Haiku extracts → Sonnet writes) is a future cost optimization idea but not implemented.

---

## How the Daily Digest Works

1. `poll-channels.js` runs on cron — checks YouTube RSS feeds for new videos from followed channels, summarizes any new ones, links them to subscriber `user_saves`
2. `send-digests.js` runs at 7am ET — finds users with `email_digest=true`, fetches their unseen videos from followed channels (last 25 hours), renders HTML email, sends via Resend
3. Channel order in digest follows `subscriptions.sort_order` (user-controlled via ▲/▼ arrows on Following page)
4. Shorts excluded unless user has `include_shorts=true` for that channel (videos under 120 seconds)

---

## Key UX Decisions / Behaviors

### My Videos page
- Videos are flat list rows (not cards) with thumbnail on right
- Long-press (700ms) to enter multi-select mode, then checkboxes appear
- `didLongPress` ref prevents the post-long-press click from firing
- Bulk delete shows confirm dialog
- Bulk action bar is sticky, positioned below the top nav (`top: 56px` desktop, `48px` mobile)
- Viewed state tracked in `localStorage` (`hw_viewed_videos`), viewed rows are muted
- Sort order persisted in `localStorage` (`hw_sort_order`)

### Following / Channels page
- Channel cards as bubbles with avatar (36px circle, initials fallback)
- Tap the ⠿ drag handle to reveal ▲/▼ reorder arrows (no drag — was unreliable on mobile)
- "Refresh" button scans for new videos, shows count ("3 new videos added" or "No new videos")
- Include Shorts toggle per channel

### Summary page
- After quotes, a "Get [channel] in your morning digest" CTA section appears
- First-time visitors auto-scroll to it after 2.5s (tracked via `localStorage` key `hw_first_summary_seen`)
- Shows "✓ You follow [channel]" when already following

### Popular channel suggestions
- 34 channels across 6 categories: Tech & AI, Science, Health & Longevity, Finance & Business, History & World, Ideas & Interviews
- Dismissable per-channel, stored in `localStorage` (`hw_dismissed_channels`)
- Used on both WelcomePage (onboarding) and ChannelsPage (add more)

### Mobile nav
- Bottom tab bar on mobile (≤600px), top nav hidden
- Page content uses `padding-bottom: calc(80px + env(safe-area-inset-bottom))` with `100px` fallback for Android

### Thumbnail handling
- YouTube thumbnails served via proxy at `/api/og/thumb/:videoId` (fetched from YouTube, cached 24h)
- Fallback: `maxresdefault` → `hqdefault` on load error
- Proxy improves email deliverability (images from headwaterapp.com domain, not YouTube CDN)

---

## Email

All email logic in `src/services/email.js`. Uses **Resend** for sending.

Email types:
- **Daily digest** — one per morning, videos from followed channels. Each entry: channel name, thumbnail, title link, full tldr, first quote (no truncation), "Full breakdown →" link
- **Welcome email** — sent on registration
- **Verify email** — sent on registration (required before digest is enabled)
- **Password reset** — standard reset flow
- **Nudge email** — sent ~24h after registration if user has no channels yet

Title normalization: `normalizeTitle()` converts ALL CAPS titles to title case to prevent spam-looking subject lines.

---

## Cron Schedule

| Job | Schedule | What it does |
|---|---|---|
| `poll-channels.js` | Every 2 hours | Scan RSS feeds, summarize new videos |
| `send-digests.js` | 7am ET daily | Send morning digest emails |
| `send-nudges.js` | Hourly | Send onboarding nudge to new users without channels |

---

## Deployment (Railway)

- Single service running `node src/server.js`
- In production, Express serves the React build from `client/dist/`
- Build command: `npm run build` (installs frontend deps, builds React, installs yt-dlp + fonts)
- Postgres database provisioned as a Railway plugin, connection via `DATABASE_URL`
- `NODE_ENV=production` triggers: secure cookies, serves static React build, Postgres sessions

---

## Known Issues / Backlog

- **Title changes**: Background title refresh on cache hit is implemented (oEmbed check). Works silently.
- **Public URL scraping**: `/s/:videoId` exposes real YouTube video IDs. Future fix: opaque UUID slugs.
- **Dismissed channels not server-synced**: localStorage only, not persisted to DB. Fine for now.
- **Two-pass Haiku/Sonnet pipeline**: Haiku extracts facts → Sonnet writes prose. ~60-70% cost reduction. On backlog.
- **Email selected videos**: Future feature — "email me this filtered list" from My Videos, not just full digest.
- **CAN-SPAM postal address**: Removed for soft launch, must add back before real scale.
- **Bottom padding on mobile**: Multiple fixes applied. Uses `calc(80px + env(safe-area-inset-bottom))` with `100px` fallback. If still broken, check which CSS class the page root uses.

---

## What Was Recently Built (last ~2 weeks of work)

- Follow/digest CTA on summary page with first-visit auto-scroll
- Bulk delete with sticky action bar + confirm dialog
- Channel bubble cards with avatars + ▲/▼ tap reorder
- Newsletter redesign (editorial layout, thumbnails, full tldr, full quotes)
- Thumbnail proxy endpoint for email deliverability
- 8-window transcript sampling (replaced head/tail trim, lowered cap to 50k chars)
- All-caps title normalization
- Background title refresh on cache hit
- Long-press selection on My Videos (700ms threshold, `didLongPress` guard)
- Mobile bottom padding fixes (safe-area-inset + fallbacks)
- Popular channels list expanded to 34 across 6 categories
