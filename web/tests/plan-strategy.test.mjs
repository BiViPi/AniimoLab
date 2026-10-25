import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStrategyPlanInput } from '../plan-strategy.js';

test('level-up strategy clears selling priorities and keeps level-up requirements', () => {
    const commonInput = { home_level: 16, priorities: ['old'], facilities: { Oven: [{ count: 1 }] } };
    const levelUp = { target: 17, cost: [['ore', 5]] };
    let prioritiesRead = false;
    const result = buildStrategyPlanInput({
        commonInput,
        isEndgame: false,
        getPriorities: () => { prioritiesRead = true; return ['dish']; },
        getLevelUp: () => levelUp,
    });

    assert.deepEqual(result, {
        ...commonInput,
        strategy_policy: 'level_up',
        priorities: [],
        level_up: levelUp,
        prioritize_byproducts: false,
    });
    assert.deepEqual(commonInput.priorities, ['old']);
    assert.equal(prioritiesRead, false);
});

test('endgame strategy preserves active priorities and clears level-up requirements', () => {
    const commonInput = { home_level: 20, priorities: [] };
    const priorities = ['dish_a', 'dish_b'];
    let levelUpRead = false;
    const result = buildStrategyPlanInput({
        commonInput,
        isEndgame: true,
        getPriorities: () => priorities,
        getLevelUp: () => { levelUpRead = true; return { target: 21 }; },
    });

    assert.equal(result.strategy_policy, 'endgame');
    assert.deepEqual(result.priorities, priorities);
    assert.equal(result.level_up, null);
    assert.equal(result.prioritize_byproducts, false);
    assert.notEqual(result, commonInput);
    assert.equal(levelUpRead, false);
});
