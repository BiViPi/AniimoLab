import test from 'node:test';
import assert from 'node:assert/strict';
import {
    selectOptimalSeasonDishes,
    getSeasonFacilityUsage,
    calculateOptimalSeasonPlots,
} from '../season-planner.js';

const makeDish = (name, { radish = 0, pepper = 0, sellValue = 3000, points = 4, cycleTime = 200, facility, facilityUsage } = {}) => ({
    name, radish, pepper, sellValue, points, cycleTime,
    facility: facility || name,
    facilityUsage: facilityUsage || { [facility || name]: 1 },
});

test('season planner chooses complementary single-crop dishes when facilities do not conflict', () => {
    const pepperDish = makeDish('pepper_dish', { pepper: 8, points: 5, facility: 'Pepper Cooker' });
    const radishDish = makeDish('radish_dish', { radish: 8, points: 4, facility: 'Radish Cooker' });
    const selected = selectOptimalSeasonDishes({
        seasonActive: true,
        radishPlots: 1,
        pepperPlots: 1,
        selectedRecipes: [{ name: 'pepper_dish' }, { name: 'radish_dish' }],
        dishData: { pepper_dish: pepperDish, radish_dish: radishDish },
        getCurrentSetup: () => ({ 'Pepper Cooker': [{ count: 1 }], 'Radish Cooker': [{ count: 1 }] }),
        planRateEstimate: 40,
    });

    assert.deepEqual(selected.map(dish => dish.name), ['pepper_dish', 'radish_dish']);
    assert.ok(selected.every(dish => dish.maxRate > dish.extraGain));
});

test('season planner rejects facility conflicts and unavailable recipes', () => {
    const first = makeDish('first', { radish: 8, sellValue: 4000, facility: 'Shared Cooker' });
    const second = makeDish('second', { pepper: 8, sellValue: 3000, facility: 'Shared Cooker' });
    const unavailable = makeDish('unavailable', { pepper: 8, sellValue: 9000, facility: 'Locked Cooker' });
    const selected = selectOptimalSeasonDishes({
        seasonActive: true,
        radishPlots: 2,
        pepperPlots: 2,
        selectedRecipes: [{ name: 'first' }, { name: 'second' }, { name: 'unavailable' }],
        dishData: { first, second, unavailable },
        getCurrentSetup: () => ({ 'Shared Cooker': [{ count: 1 }] }),
        planRateEstimate: 40,
    });

    assert.deepEqual(selected.map(dish => dish.name), ['first']);
});

test('season planner pairs a combo dish with a crop-specific dish that uses excess plots', () => {
    const combo = makeDish('combo', { radish: 8, pepper: 8, sellValue: 9000, facility: 'Combo Cooker' });
    const radishDish = makeDish('radish_dish', { radish: 8, sellValue: 4000, facility: 'Radish Cooker' });
    const selected = selectOptimalSeasonDishes({
        seasonActive: true,
        radishPlots: 2,
        pepperPlots: 1,
        selectedRecipes: [{ name: 'combo' }, { name: 'radish_dish' }],
        dishData: { combo, radish_dish: radishDish },
        getCurrentSetup: () => ({ 'Combo Cooker': [{ count: 1 }], 'Radish Cooker': [{ count: 1 }] }),
    });
    assert.deepEqual(selected.map(dish => dish.name), ['combo', 'radish_dish']);
});

test('season planner excludes recipes below the two percent revenue-share threshold', () => {
    const lowGain = makeDish('low_gain', { radish: 8, sellValue: 4000, facility: 'Low Gain Cooker' });
    const selected = selectOptimalSeasonDishes({
        seasonActive: true,
        radishPlots: 1,
        pepperPlots: 0,
        selectedRecipes: [{ name: 'low_gain' }],
        dishData: { low_gain: lowGain },
        getCurrentSetup: () => ({ 'Low Gain Cooker': [{ count: 1 }] }),
        planRateEstimate: 1_000_000,
    });
    assert.deepEqual(selected, []);
});

test('season planner does not read facility setup when event, plots, or selected dishes are absent', () => {
    let setupReads = 0;
    const options = {
        seasonActive: true,
        radishPlots: 0,
        pepperPlots: 0,
        selectedRecipes: [{ name: 'dish' }],
        dishData: { dish: makeDish('dish', { pepper: 8 }) },
        getCurrentSetup: () => { setupReads++; return {}; },
    };
    assert.deepEqual(selectOptimalSeasonDishes({ ...options, seasonActive: false }), []);
    assert.deepEqual(selectOptimalSeasonDishes(options), []);
    assert.deepEqual(selectOptimalSeasonDishes({ ...options, pepperPlots: 1, selectedRecipes: [] }), []);
    assert.equal(setupReads, 0);
});

test('season facility usage aggregates prep-chain facility counts', () => {
    const usage = getSeasonFacilityUsage([
        { facility: 'Stove', facilityUsage: { Stove: 1, Pot: 1 } },
        { facility: 'Pot', facilityUsage: { Pot: 1 } },
    ]);
    assert.deepEqual(usage, { Stove: 1, Pot: 2 });
});

test('season plot calculation applies the sweet spot and clamps each crop to ten plots', () => {
    const sweetSpot = calculateOptimalSeasonPlots([
        { name: 'combo', radish: 8, pepper: 8, cycleTime: 203 },
    ], name => `Pretty ${name}`);
    assert.deepEqual(sweetSpot, { radish: 5, pepper: 5, dishNames: ['Pretty combo'] });

    const capped = calculateOptimalSeasonPlots([
        { name: 'high-demand', radish: 100, pepper: 0, cycleTime: 1 },
    ], name => name);
    assert.equal(capped.radish, 10);
    assert.equal(capped.pepper, 0);
});
