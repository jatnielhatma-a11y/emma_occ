import test from 'node:test';
import assert from 'node:assert/strict';
function classify(code, start, end) {
  const normalized = code.trim().toUpperCase();
  if (normalized === 'VL') return 'Vacation';
  if (['R','-','--'].includes(normalized)) return 'OFF Day';
  if (start === '15:00' && end === '23:05') return 'Late Shift';
  if (start === '23:00' && end === '07:05') return 'Night Shift';
  return 'Unknown';
}
test('classifies roster codes and shift times', () => {
  assert.equal(classify('VL'), 'Vacation');
  assert.equal(classify('R'), 'OFF Day');
  assert.equal(classify('--'), 'OFF Day');
  assert.equal(classify('368E','15:00','23:05'), 'Late Shift');
  assert.equal(classify('382G','23:00','07:05'), 'Night Shift');
});
