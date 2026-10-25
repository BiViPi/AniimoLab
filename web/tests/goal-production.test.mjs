import test from 'node:test';
import assert from 'node:assert/strict';
import { madeBy, timeToMake } from '../goal-production.js';

test('madeBy starts each production stream after its lead time', () => {
    assert.equal(madeBy({ streams: [[4, 5], [2, 10]] }, 20), 80);
});

test('madeBy uses income streams for unranked seasonal points', () => {
    const plan = { income_streams: [{ points: 3, units_per_second: 2, lead_time_seconds: 4 }] };
    assert.equal(madeBy({ target: 'season_points', perSecond: 999 }, 10, plan), 36);
});

test('madeBy falls back to a row rate when explicit streams are absent', () => {
    assert.equal(madeBy({ perSecond: 5 }, 12), 60);
});

test('timeToMake solves piecewise streams by binary search including lead time', () => {
    const row = { streams: [[10, 5], [5, 10]] };
    assert.ok(Math.abs(timeToMake(row, 50) - 10) < 1e-8);
    assert.ok(Math.abs(timeToMake(row, 100) - (200 / 15)) < 1e-8);
});

test('timeToMake returns null for zero-rate rows that cannot reach the requested amount', () => {
    assert.equal(timeToMake({ perSecond: 0 }, 1), null);
});
