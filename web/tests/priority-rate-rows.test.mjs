import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPriorityRateRows } from '../priority-rate-rows.js';

const priorityLabel = target => `label:${target}`;

test('maps plan priorities in order and injects missing-capability explanations', () => {
    const plan = { priorities: [
        { target: 'aniimo_exp', per_second: 2, items: [['wood', 1]] },
        { target: 'aniipods', per_second: 0, streams: [], items: [] },
    ], rate_per_second: 3 };
    const rows = buildPriorityRateRows({ plan, planContext: {}, isVi: true, priorityLabel, seasonPointsLabel: 'Season Points' });
    assert.deepEqual(rows.map(row => [row.rank, row.target]), [[1, 'aniimo_exp'], [2, 'aniipods'], [null, 'coins']]);
    assert.equal(rows[0].missing, 'Chưa sở hữu Dance Pad Polisher');
    assert.equal(rows[1].missing, 'Chưa sở hữu Aniipod Maker');
    assert.equal(rows[2].perSecond, 3);
});

test('uses setup context to clear missing reasons and localizes fallback coin label', () => {
    const rows = buildPriorityRateRows({
        plan: { priorities: [{ target: 'aniimo_exp', per_second: 1 }], rate_per_second: 2 },
        planContext: { hasPolisher: true, aniipod: 'Aniipod Mega' },
        isVi: true,
        priorityLabel,
        seasonPointsLabel: 'Điểm Mùa',
    });
    assert.equal(rows[0].missing, null);
    assert.equal(rows[1].label, 'Xu Gia Viên (từ năng lực còn lại)');
});

test('preserves explicit coins and adds seasonal points once', () => {
    const rows = buildPriorityRateRows({
        plan: { priorities: [
            { target: 'coins', per_second: 4, items: [['coin', 4]], streams: [['coin', 4, 0]] },
            { target: 'season_points', per_second: 1 },
        ], rate_per_second: 9, season_points: 3 },
        planContext: { aniipod: 'Aniipod Mega' }, isVi: false, priorityLabel, seasonPointsLabel: 'Season Points',
    });
    assert.deepEqual(rows.map(row => row.target), ['coins', 'season_points']);
    assert.equal(rows[0].items[0][0], 'coin');
});

test('adds unranked seasonal points and falls back to English coin label', () => {
    const rows = buildPriorityRateRows({
        plan: { priorities: [], rate_per_second: 5, season_points: 2 },
        planContext: {}, isVi: false, priorityLabel, seasonPointsLabel: 'Season Points',
    });
    assert.deepEqual(rows.map(row => row.target), ['coins', 'season_points']);
    assert.equal(rows[0].label, 'Home Coins');
    assert.equal(rows[1].label, 'Season Points');
});
