// Usage: node scripts/smoke-test.js [base-url]
// Example: node scripts/smoke-test.js https://your-app.up.railway.app

const baseUrl = process.argv[2] || 'http://localhost:3001';
const testUrl = 'https://youtu.be/dHBEQ-Ryo24';

async function run() {
  console.log(`Testing: ${baseUrl}`);
  const url = `${baseUrl}/api/summary?url=${encodeURIComponent(testUrl)}`;

  const res = await fetch(url);
  const json = await res.json();

  if (!res.ok) {
    console.error('FAIL — HTTP', res.status, json.error);
    process.exit(1);
  }

  const checks = [
    ['tldr',    typeof json.tldr === 'string'],
    ['topics',  Array.isArray(json.topics) && json.topics.length > 0],
    ['quotes',  Array.isArray(json.quotes)],
    ['videoId', typeof json.videoId === 'string'],
  ];

  let passed = true;
  for (const [field, ok] of checks) {
    console.log(`  ${ok ? '✓' : '✗'} ${field}`);
    if (!ok) passed = false;
  }

  if (passed) {
    console.log(`\nPASS — cached: ${json.cached}`);
  } else {
    console.error('\nFAIL — some fields missing');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('FAIL —', err.message);
  process.exit(1);
});
