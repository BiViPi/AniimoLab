import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanPruningPolicy, runPlanPruning } from '../plan-pruning.js';

test('plan pruning protects user selections, dependencies, and milled rice', () => {
    const policy = createPlanPruningPolicy({
        unlockedSpecial: ['special_dish'],
        selectedSeasonDishes: new Set(['harvest_platter']),
        activePriorities: ['star'],
        seasonActive: true,
        isRV20Endgame: false,
    });

    assert.equal(policy.shouldPruneItem('quick_star', 0.01), false);
    assert.equal(policy.shouldPruneItem('sea_salt', 0.01), false);
    assert.equal(policy.shouldPruneItem('rock_candy', 0.01), false);
    assert.equal(policy.shouldPruneItem('milled_rice', 0), false);
    assert.equal(policy.shouldPruneItem('quick_aromathyst', 0.02), true);
    assert.equal(policy.shouldPruneItem('quick_aromathyst', 0.02001), false);
    assert.equal(policy.shouldPruneItem('processed_good', 0), false);
});

test('RV20 endgame disables revenue-share pruning', () => {
    const policy = createPlanPruningPolicy({
        unlockedSpecial: [],
        selectedSeasonDishes: new Set(),
        activePriorities: [],
        seasonActive: false,
        isRV20Endgame: true,
    });

    assert.equal(policy, null);
});

test('plan pruning accepts a pass only when coins, priorities, and user selections are preserved', async () => {
    const input = { exclude: [] };
    const basePlan = {
        success: true,
        rate_per_second: 100,
        income_streams: [
            { item_name: 'aromathyst', rate_per_second: 1 },
            { item_name: 'special_dish', rate_per_second: 20 },
        ],
        priorities: [{ target: 'dish', per_second: 10 }],
    };
    let solvedPayload;
    const result = await runPlanPruning({
        plan: basePlan,
        input,
        bestSetup: 'best',
        solve: async (_type, payload) => {
            solvedPayload = JSON.parse(payload);
            return JSON.stringify({
                success: true,
                rate_per_second: 100,
                income_streams: [{ item_name: 'special_dish', rate_per_second: 20 }],
                priorities: [{ target: 'dish', per_second: 10 }],
            });
        },
        isCurrent: () => true,
        unlockedSpecial: ['special_dish'],
        selectedSeasonDishes: new Set(),
        activePriorities: [],
        seasonActive: false,
        isRV20Endgame: false,
        planContext: { levelUp: false },
    });

    assert.equal(solvedPayload.aniimo, 'best');
    assert.deepEqual(solvedPayload.exclude, ['aromathyst', 'quick_aromathyst']);
    assert.equal(result.plan.income_streams.some(stream => stream.item_name === 'aromathyst'), false);
    assert.deepEqual(input.exclude, ['aromathyst', 'quick_aromathyst']);
});

test('plan pruning rejects a solve that drops priority output and keeps prior plan/input', async () => {
    const input = { exclude: [] };
    const basePlan = {
        success: true,
        rate_per_second: 100,
        income_streams: [{ item_name: 'star', rate_per_second: 1 }],
        priorities: [{ target: 'dish', per_second: 10 }],
    };
    const result = await runPlanPruning({
        plan: basePlan,
        input,
        bestSetup: 'best',
        solve: async () => JSON.stringify({
            success: true,
            rate_per_second: 100,
            income_streams: [],
            priorities: [{ target: 'dish', per_second: 9 }],
        }),
        isCurrent: () => true,
        unlockedSpecial: [],
        selectedSeasonDishes: new Set(),
        activePriorities: [],
        seasonActive: false,
        isRV20Endgame: false,
        planContext: { levelUp: false },
    });

    assert.equal(result.plan, basePlan);
    assert.deepEqual(input.exclude, []);
});

test('plan pruning stops without applying a result from an obsolete run', async () => {
    const input = { exclude: [] };
    const basePlan = { success: true, rate_per_second: 100, income_streams: [{ item_name: 'star', rate_per_second: 1 }] };
    const result = await runPlanPruning({
        plan: basePlan,
        input,
        bestSetup: 'best',
        solve: async () => JSON.stringify({ success: true, rate_per_second: 100, income_streams: [] }),
        isCurrent: () => false,
        unlockedSpecial: [],
        selectedSeasonDishes: new Set(),
        activePriorities: [],
        seasonActive: false,
        isRV20Endgame: false,
        planContext: { levelUp: false },
    });

    assert.equal(result.cancelled, true);
    assert.equal(result.plan, basePlan);
    assert.deepEqual(input.exclude, []);
});
