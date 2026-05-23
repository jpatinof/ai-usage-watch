import test from 'node:test';
import assert from 'node:assert/strict';
import { extractUsages, getBars, parseResetTime } from '../dist/usage-parser.js';

test('parseResetTime formats days, hours, and minutes', () => {
  assert.equal(parseResetTime('Resets in 2 days 3 hours'), '2d 3h');
  assert.equal(parseResetTime('Resets in 4 hours 15 minutes'), '4h 15m');
  assert.equal(parseResetTime('Resets in 9 minutes'), '9m');
  assert.equal(parseResetTime('No reset here'), null);
});

test('getBars renders ten-step progress bar', () => {
  assert.equal(getBars(0), '░░░░░░░░░░');
  assert.equal(getBars(50), '█████░░░░░');
  assert.equal(getBars(100), '██████████');
  assert.equal(getBars(125), '██████████');
  assert.equal(getBars(-25), '░░░░░░░░░░');
});

test('extractUsages reads percentage usage blocks', () => {
  const text = `
    Rolling Usage 25% Resets in 2 hours 5 minutes.
    Weekly Usage 50% Resets in 1 day 3 hours.
    Monthly Usage 75% Resets in 12 minutes.
  `;

  const usages = extractUsages(text, '');

  assert.equal(usages.length, 3);
  assert.deepEqual(usages.map(usage => usage.name), ['5h', 'Weekly', 'Monthly']);
  assert.equal(usages[0].used, 3);
  assert.equal(usages[1].used, 15);
  assert.equal(usages[2].used, 45);
});

test('extractUsages falls back to dollar usage patterns', () => {
  const usages = extractUsages('', '$15 / $12 $15 / $30 $30 / $60');

  assert.equal(usages.length, 3);
  assert.equal(usages[0].pct, 125);
  assert.equal(usages[0].bars, '██████████');
  assert.equal(usages[1].pct, 50);
  assert.equal(usages[2].pct, 50);
});

test('extractUsages fills missing percentage blocks from dollar patterns', () => {
  const text = 'Rolling Usage 125% Resets in 2 hours. Weekly Usage $15 / $30';
  const usages = extractUsages(text, '');

  assert.equal(usages.length, 2);
  assert.equal(usages[0].name, '5h');
  assert.equal(usages[0].pct, 125);
  assert.equal(usages[0].bars, '██████████');
  assert.equal(usages[1].name, 'Weekly');
  assert.equal(usages[1].pct, 50);
});
