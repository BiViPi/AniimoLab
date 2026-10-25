import test from 'node:test';
import assert from 'node:assert/strict';
import { buildGoalAlsoViewModel } from '../goal-also-renderer.js';

const formatNumber = value => `n:${value}`;
const goalName = row => `name:${row.target}`;

test('shows other positive-rate targets made by the goal completion time', () => {
    const chosen = { target: 'aniipods', perSecond: 1 };
    const rows = [chosen, { target: 'coins', perSecond: 4 }, { target: 'season_points', perSecond: 0.5 }];
    const model = buildGoalAlsoViewModel({
        rows, chosen, seconds: 10, result: null,
        madeBy: row => row.target === 'coins' ? 123.9 : 8.2,
        goalName, formatNumber,
    });
    assert.deepEqual(model, { display: 'block', html: "<span>By then you'll also have:</span> <strong>n:123 name:coins, n:8 name:season_points</strong>" });
});

test('uses successful worker coin total and filters chosen or zero-rate targets', () => {
    const chosen = { target: 'coins', perSecond: 1 };
    const rows = [chosen, { target: 'aniimo_exp', perSecond: 2 }, { target: 'aniipods', perSecond: 0 }];
    const model = buildGoalAlsoViewModel({
        rows, chosen, seconds: 5, result: { success: true, amount_produced: 77 },
        madeBy: () => 99, goalName, formatNumber,
    });
    assert.equal(model.html, "<span>By then you'll also have:</span> <strong>n:99 name:aniimo_exp</strong>");
});

test('hides the detail when no positive elapsed time or no other rates exist', () => {
    const chosen = { target: 'coins', perSecond: 1 };
    const rows = [chosen, { target: 'other', perSecond: 0 }];
    for (const seconds of [0, null]) {
        assert.deepEqual(buildGoalAlsoViewModel({ rows, chosen, seconds, result: null, madeBy: () => 1, goalName, formatNumber }), { display: 'none', html: '' });
    }
});
