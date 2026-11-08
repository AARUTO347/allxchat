// Clock logic smoke tests — run: node tests/clock.test.js
function pad(n) { return String(n).padStart(2, '0'); }
function h12(hour) { let h = hour % 12; if (h === 0) h = 12; return pad(h); }
function formatDate(d, m, y, fmt) {
  if (fmt === 'MM/DD/YYYY') return m + '/' + d + '/' + y;
  if (fmt === 'YYYY-MM-DD') return y + '-' + m + '-' + d;
  return d + '/' + m + '/' + y;
}
const assert = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exit(1); } };
assert(h12(0) === '12', 'midnight 12');
assert(h12(13) === '01', '13->01');
assert(h12(12) === '12', 'noon 12');
assert(formatDate('28', '02', '2026', 'DD/MM/YYYY') === '28/02/2026', 'ddmm');
assert(formatDate('28', '02', '2026', 'MM/DD/YYYY') === '02/28/2026', 'mmdd');
assert(formatDate('28', '02', '2026', 'YYYY-MM-DD') === '2026-02-28', 'iso');
console.log('clock.test.js PASS');
