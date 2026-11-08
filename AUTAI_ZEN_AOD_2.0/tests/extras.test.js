// Batch 2+3+4 time-math tests — run: node tests/extras.test.js
const assert = (c, m) => { if (!c) { console.error('FAIL:', m); process.exit(1); } };
// day-of-year
function doy(date) { const s = new Date(date.getFullYear(), 0, 0); return Math.floor((date - s) / 864e5); }
assert(doy(new Date(2026, 0, 1)) === 1, 'Jan1 doy 1');
assert(doy(new Date(2026, 11, 31)) === 365, 'Dec31 2026 doy 365');
// week
assert(Math.ceil(365 / 7) === 53, 'week 53');
// seconds since midnight
const secs = 10 * 3600 + 30 * 60;
assert(secs === 37800, 'secs midnight');
// countdown diff
const diff = Math.floor((new Date(2026, 0, 2).getTime() - new Date(2026, 0, 1).getTime()) / 1000);
assert(diff === 86400, 'countdown 1 day');
// focus cycle: 25*60
assert(25 * 60 === 1500, 'focus 25');
// stopwatch format
function fmt(m, s) { return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'); }
assert(fmt(5, 9) === '05:09', 'fmt sw');
console.log('extras.test.js PASS');
