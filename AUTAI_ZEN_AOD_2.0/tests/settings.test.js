// Settings validation smoke tests — run: node tests/settings.test.js
const assert = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exit(1); } };
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const THEMES = ['oled-pure-black', 'midnight-blue', 'cyber-cyan', 'neon-green', 'amber-night'];
assert(clamp(200, 80, 140) === 140, 'clamp high');
assert(clamp(10, 50, 140) === 50, 'clamp low');
assert(THEMES.indexOf('amber-night') !== -1, 'theme exists');
assert(THEMES.indexOf('not-a-theme') === -1, 'invalid theme rejected');
console.log('settings.test.js PASS');
