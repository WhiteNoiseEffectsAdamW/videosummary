import React, { useState, useEffect, useRef } from 'react';

const POPULAR_CHANNELS = [
  // Tech & AI
  { name: 'Fireship', handle: '@Fireship', category: 'Tech & AI' },
  { name: 'MKBHD', handle: '@mkbhd', category: 'Tech & AI' },
  { name: 'Andrej Karpathy', handle: '@AndrejKarpathy', category: 'Tech & AI' },
  { name: 'Cleo Abram', handle: '@CleoAbram', category: 'Tech & AI' },
  { name: 'ColdFusion', handle: '@ColdFusion', category: 'Tech & AI' },
  { name: 'Two Minute Papers', handle: '@TwoMinutePapers', category: 'Tech & AI' },
  { name: 'Wendover Productions', handle: '@Wendover', category: 'Tech & AI' },
  // Science
  { name: 'Kurzgesagt', handle: '@kurzgesagt', category: 'Science' },
  { name: 'Veritasium', handle: '@veritasium', category: 'Science' },
  { name: 'CGP Grey', handle: '@CGPGrey', category: 'Science' },
  { name: '3Blue1Brown', handle: '@3blue1brown', category: 'Science' },
  { name: 'PBS Space Time', handle: '@pbsspacetime', category: 'Science' },
  // Health & Longevity
  { name: 'Huberman Lab', handle: '@hubermanlab', category: 'Health & Longevity' },
  { name: 'FoundMyFitness', handle: '@foundmyfitness', category: 'Health & Longevity' },
  { name: 'What I\'ve Learned', handle: '@WhatIveLearned', category: 'Health & Longevity' },
  { name: 'Doctor Mike', handle: '@DoctorMike', category: 'Health & Longevity' },
  { name: 'Medlife Crisis', handle: '@MedlifeCrisis', category: 'Health & Longevity' },
  // Finance & Business
  { name: 'Plain Bagel', handle: '@ThePlainBagel', category: 'Finance & Business' },
  { name: 'Patrick Boyle', handle: '@PBoyle', category: 'Finance & Business' },
  { name: 'Company Man', handle: '@companyman', category: 'Finance & Business' },
  { name: 'How Money Works', handle: '@HowMoneyWorks', category: 'Finance & Business' },
  { name: 'Y Combinator', handle: '@ycombinator', category: 'Finance & Business' },
  { name: 'Economics Explained', handle: '@EconomicsExplained', category: 'Finance & Business' },
  // History & World
  { name: 'Johnny Harris', handle: '@johnnyharris', category: 'History & World' },
  { name: 'RealLifeLore', handle: '@RealLifeLore', category: 'History & World' },
  { name: 'Kings and Generals', handle: '@KingsandGenerals', category: 'History & World' },
  { name: 'TLDR News', handle: '@TLDRNewsGlobal', category: 'History & World' },
  { name: 'PolyMatter', handle: '@PolyMatter', category: 'History & World' },
  { name: 'Tom Scott', handle: '@TomScottGo', category: 'History & World' },
  // Ideas & Interviews
  { name: 'Lex Fridman', handle: '@lexfridman', category: 'Ideas & Interviews' },
  { name: 'Cal Newport', handle: '@CalNewportMedia', category: 'Ideas & Interviews' },
  { name: 'Ali Abdaal', handle: '@aliabdaal', category: 'Ideas & Interviews' },
  { name: 'Academy of Ideas', handle: '@academyofideas', category: 'Ideas & Interviews' },
  { name: 'Like Stories of Old', handle: '@LikeStoriesofOld', category: 'Ideas & Interviews' },
];

const POPULAR_CATEGORIES = ['Tech & AI', 'Science', 'Health & Longevity', 'Finance & Business', 'History & World', 'Ideas & Interviews'];
const DISMISSED_KEY = 'hw_dismissed_channels';

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); }
  catch { return []; }
}

export default function PopularChannelSelect({ followedNames = [], onAdd, disabled }) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(getDismissed);
  const [pendingDismiss, setPendingDismiss] = useState(null); // { handle, name, timerId }
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleDismiss(e, handle, name) {
    e.stopPropagation();
    // Cancel any existing pending dismiss
    if (pendingDismiss) clearTimeout(pendingDismiss.timerId);
    const timerId = setTimeout(() => {
      const next = [...getDismissed(), handle];
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
      setDismissed(next);
      setPendingDismiss(null);
    }, 4000);
    setPendingDismiss({ handle, name, timerId });
  }

  function handleUndo() {
    if (!pendingDismiss) return;
    clearTimeout(pendingDismiss.timerId);
    setPendingDismiss(null);
  }

  const allDismissed = pendingDismiss ? [...dismissed, pendingDismiss.handle] : dismissed;
  const categories = POPULAR_CATEGORIES.map((cat) => ({
    label: cat,
    channels: POPULAR_CHANNELS.filter(
      (ch) => ch.category === cat && !followedNames.includes(ch.name) && !allDismissed.includes(ch.handle)
    ),
  })).filter((c) => c.channels.length > 0);

  if (categories.length === 0) return null;

  return (
    <>
    {pendingDismiss && (
      <div className="pcs-undo-toast">
        <span>Removed {pendingDismiss.name}</span>
        <button className="pcs-undo-btn" onClick={handleUndo}>Undo</button>
      </div>
    )}
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
                    onClick={(e) => handleDismiss(e, ch.handle, ch.name)}
                  >×</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
