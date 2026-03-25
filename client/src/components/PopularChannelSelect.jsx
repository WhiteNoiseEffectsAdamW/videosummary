import React, { useState, useEffect, useRef } from 'react';

const POPULAR_CHANNELS = [
  { name: 'Fireship', handle: '@Fireship', category: 'Tech & AI' },
  { name: 'Andrej Karpathy', handle: '@AndrejKarpathy', category: 'Tech & AI' },
  { name: 'Lex Fridman', handle: '@lexfridman', category: 'Tech & AI' },
  { name: 'MKBHD', handle: '@mkbhd', category: 'Tech & AI' },
  { name: 'Veritasium', handle: '@veritasium', category: 'Science & Learning' },
  { name: 'Kurzgesagt', handle: '@kurzgesagt', category: 'Science & Learning' },
  { name: 'CGP Grey', handle: '@CGPGrey', category: 'Science & Learning' },
  { name: '3Blue1Brown', handle: '@3blue1brown', category: 'Science & Learning' },
  { name: 'Cal Newport', handle: '@CalNewportMedia', category: 'Productivity' },
  { name: 'Ali Abdaal', handle: '@aliabdaal', category: 'Productivity' },
  { name: 'Huberman Lab', handle: '@hubermanlab', category: 'Health' },
  { name: 'Peter Attia', handle: '@PeterAttiaMD', category: 'Health' },
  { name: 'Graham Stephan', handle: '@GrahamStephan', category: 'Finance & Business' },
  { name: 'Y Combinator', handle: '@ycombinator', category: 'Finance & Business' },
  { name: 'Diary of a CEO', handle: '@TheDiaryOfACEO', category: 'Finance & Business' },
];

const POPULAR_CATEGORIES = ['Tech & AI', 'Science & Learning', 'Productivity', 'Health', 'Finance & Business'];
const DISMISSED_KEY = 'hw_dismissed_channels';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

export default function PopularChannelSelect({ followedNames = [], onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(getDismissed);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleDismiss(e, handle) {
    e.stopPropagation();
    const next = [...getDismissed(), handle];
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
    setDismissed(next);
  }

  const categories = POPULAR_CATEGORIES.map((cat) => ({
    label: cat,
    channels: POPULAR_CHANNELS.filter(
      (ch) => ch.category === cat && !followedNames.includes(ch.name) && !dismissed.includes(ch.handle)
    ),
  })).filter((c) => c.channels.length > 0);

  if (categories.length === 0) return null;

  return (
    <div className="pcs-wrap" ref={ref}>
      <button
        className={`pcs-trigger${open ? ' pcs-trigger-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        type="button"
      >
        <span>Add a popular channel</span>
        <span className="pcs-arrow">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="pcs-dropdown">
          {categories.map((cat) => (
            <div key={cat.label}>
              <div className="pcs-category">{cat.label}</div>
              {cat.channels.map((ch) => (
                <div key={ch.handle} className="pcs-item">
                  <button
                    className="pcs-name"
                    type="button"
                    onClick={() => { onAdd(ch); setOpen(false); }}
                  >
                    {ch.name}
                  </button>
                  <button
                    className="pcs-dismiss"
                    type="button"
                    title="Don't show this"
                    onClick={(e) => handleDismiss(e, ch.handle)}
                  >×</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
