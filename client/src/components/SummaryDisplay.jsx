import React, { useState } from 'react';

const VERDICT_LABEL = {
  'Watch': 'Watch',
  'Skip': 'Summary covers it',
  'Watch segment': null, // handled inline
};

export default function SummaryDisplay({ data }) {
  if (!data) return null;
  const { tldr, topics = [], quotes = [], categories = [], verdict, cached, videoId, thumbnailUrl, titleClaim, channelName } = data;
  const [copied, setCopied] = useState(false);

  function handleShare() {
    const url = `${window.location.origin}/s/${videoId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function verdictLabel() {
    if (!verdict) return null;
    if (verdict.action === 'Watch segment') return `Watch ${verdict.segment}`;
    return VERDICT_LABEL[verdict.action] ?? verdict.action;
  }

  return (
    <div>
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="thumbnail-wrap">
          <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">
            <img
              className="thumbnail"
              src={thumbnailUrl}
              alt="Video thumbnail"
              onError={(e) => { e.target.closest('.thumbnail-wrap').style.display = 'none'; }}
            />
          </a>
        </div>
      )}

      {/* Channel + Watch CTA + Share */}
      <div className="summary-header">
        {channelName && <span className="summary-channel">{channelName}</span>}
        <div className="summary-header-actions">
          <button className="btn-share" onClick={handleShare}>
            {copied ? 'Copied!' : 'Share'}
          </button>
          <a
            className="btn-watch-yt"
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none"/>
            </svg>
            Watch on YouTube
          </a>
        </div>
      </div>

      {/* Verdict */}
      {verdict && (
        <div className={`verdict verdict-${verdict.action.toLowerCase().replace(' ', '-')}`}>
          <span className="verdict-action">{verdictLabel()}</span>
          <span className="verdict-reason">{verdict.reason}</span>
        </div>
      )}

      {/* Categories */}
      {categories.length > 0 && (
        <div className="categories-row">
          {categories.map((cat, i) => (
            <span key={i} className="pill pill-cat">{cat}</span>
          ))}
        </div>
      )}

      {/* TL;DR */}
      <div className="card">
        <div className="card-label">TL;DR</div>
        {quotes.length > 0 && (
          <p className="tldr-quote">"{quotes[0].text}"</p>
        )}
        <p className="tldr-text">{tldr}</p>
      </div>

      {/* Title Claim */}
      {titleClaim?.claim && titleClaim?.reality && (
        <div className="card card-title-claim">
          <div className="card-label">Title vs Reality</div>
          <div className="title-claim-row">
            <span className="title-claim-label">Promised</span>
            <span className="title-claim-text">{titleClaim.claim}</span>
          </div>
          <div className="title-claim-row">
            <span className="title-claim-label">Delivered</span>
            <span className="title-claim-text">{titleClaim.reality}</span>
          </div>
        </div>
      )}

      {/* Topics */}
      {topics.length > 0 && (
        <div className="card">
          <div className="card-label">Key Topics</div>
          {topics.map((topic, i) => (
            <div key={i} className="topic-item">
              <div className="topic-title">{topic.title}</div>
              <div className="topic-desc">{topic.description}</div>
              {topic.timestamp && <span className="topic-ts">{topic.timestamp}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Quotes */}
      {quotes.length > 0 && (
        <div className="card">
          <div className="card-label">Notable Quotes</div>
          {quotes.map((q, i) => (
            <div key={i} className="quote-item">
              <div className="quote-text">"{q.text}"</div>
              <div className="quote-meta">
                {q.context}
                {q.timestamp && <span className="quote-ts"> — {q.timestamp}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Disclaimer */}
      <p className="summary-disclaimer">
        Summary is AI-generated and may be incomplete or inaccurate. Watch the full video for complete context.{' '}
        <a href={`https://www.youtube.com/watch?v=${videoId}`} target="_blank" rel="noopener noreferrer">Watch on YouTube →</a>
      </p>
    </div>
  );
}
