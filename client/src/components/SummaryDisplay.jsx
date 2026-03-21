import React from 'react';

export default function SummaryDisplay({ data }) {
  if (!data) return null;
  const { tldr, topics = [], quotes = [], readTimeSaved, verdict, cached, videoId, thumbnailUrl } = data;

  return (
    <div>
      {/* Thumbnail */}
      {thumbnailUrl && (
        <div className="thumbnail-wrap">
          <img
            className="thumbnail"
            src={thumbnailUrl}
            alt="Video thumbnail"
            onError={(e) => { e.target.closest('.thumbnail-wrap').style.display = 'none'; }}
          />
        </div>
      )}

      {/* Verdict */}
      {verdict && (
        <div className={`verdict verdict-${verdict.action.toLowerCase().replace(' ', '-')}`}>
          <span className="verdict-action">{verdict.action === 'Watch segment' ? `Watch ${verdict.segment}` : verdict.action}</span>
          <span className="verdict-reason">{verdict.reason}</span>
        </div>
      )}

      {/* Meta row */}
      <div className="meta-row">
        <span className="pill pill-id">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
            <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none" />
          </svg>
          {videoId}
        </span>
        {cached && <span className="pill pill-cache">✓ cached</span>}
        {readTimeSaved > 0 && (
          <span className="pill pill-time" style={{ marginLeft: 'auto' }}>
            ~{readTimeSaved} min saved
          </span>
        )}
      </div>

      {/* TL;DR */}
      <div className="card">
        <div className="card-label">TL;DR</div>
        <p className="tldr-text">{tldr}</p>
      </div>

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
    </div>
  );
}
