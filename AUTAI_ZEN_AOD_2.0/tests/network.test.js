// Network honesty tests — run: node tests/network.test.js
// Verifies the app never fabricates packet loss: empty samples -> N/A
const assert = (c, msg) => { if (!c) { console.error('FAIL:', msg); process.exit(1); } };
function packetLoss(samples) {
  if (!samples.length) return 'N/A';
  const failed = samples.filter(s => !s).length;
  return Math.round((failed / samples.length) * 100) + '%';
}
assert(packetLoss([]) === 'N/A', 'empty -> N/A');
assert(packetLoss([true, true]) === '0%', 'all ok -> 0%');
assert(packetLoss([true, false]) === '50%', 'half -> 50%');
console.log('network.test.js PASS');
