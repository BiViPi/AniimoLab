import test from 'node:test';
import assert from 'node:assert/strict';
import { integrateSeasonPlan } from '../season-plan-integration.js';

function makeDependencies(overrides = {}) {
    return {
        isSeasonActive: () => true,
        getRadishPlots: () => 2,
        getPepperPlots: () => 0,
        isVietnamese: () => false,
        selectOptimalSeasonDishes: () => [],
        facilityOverrides: [],
        lastEmodeCounts: {},
        simpleSetup: () => ({ facilities: {}, modules: {} }),
        selectedHomeLevel: () => 12,
        isQuickRecipeUnlocked: () => false,
        ...overrides,
    };
}

test('season integration leaves unsuccessful, inactive, or plot-free plans unchanged', () => {
    const plan = { success: true, coin_items: [], rate_per_second: 20 };
    const unsuccessfulPlan = { ...plan, success: false };
    assert.equal(integrateSeasonPlan(unsuccessfulPlan, makeDependencies()), unsuccessfulPlan);
    assert.equal(integrateSeasonPlan(plan, makeDependencies({ isSeasonActive: () => false })), plan);
    assert.equal(integrateSeasonPlan(plan, makeDependencies({ getRadishPlots: () => 0 })), plan);
});

test('season integration adds raw crop streams and updates level-up coin timing', () => {
    const plan = {
        success: true,
        coin_items: [],
        income_streams: [],
        rate_per_second: 10,
        environment_assignments: [],
        level_up: { requirements: [{ name: 'coins', need: 100, have: 50 }, { name: 'wood', need: 5, have: 0 }] },
    };
    const result = integrateSeasonPlan(plan, makeDependencies());

    assert.equal(result.rate_per_second, 10 + (2 * 8 / 1200) * 74);
    assert.equal(result.season_points, 2 * 8 / 1200);
    assert.deepEqual(result.coin_items.map(step => step.item_name), ['moondew_radish']);
    assert.equal(result.income_streams[0].item_name, 'moondew_radish');
    assert.equal(result.level_up.requirements[0].per_second, result.rate_per_second);
    assert.equal(result.level_up.requirements[0].seconds, 50 / result.rate_per_second);
    assert.equal(result.level_up.requirements[1].per_second, undefined);
});

test('season integration creates selected dish chain, preserves Scorching assignment, and uses electric quick utilities', () => {
    const dish = {
        name: 'harvest_platter',
        facility: 'Blazing Stove',
        radish: 8,
        pepper: 8,
        sellValue: 2500,
        points: 4,
        cycleTime: 203,
        prepChain: [{ facility: 'Simmering Pot', item_name: 'rock_candy', cycleTime: 108, reasonEn: 'Prep rock candy', reasonVi: 'Sơ chế kẹo đá' }],
    };
    const originalAssignment = { building: 'Heat Furnace', mode: 'Scorching', covered: [{ facility: 'Farmland', count: 2 }], layouts: [[]] };
    const result = integrateSeasonPlan({
        success: true,
        coin_items: [],
        income_streams: [],
        rate_per_second: 20,
        environment_assignments: [originalAssignment],
    }, makeDependencies({
        getRadishPlots: () => 5,
        getPepperPlots: () => 5,
        isVietnamese: () => true,
        selectOptimalSeasonDishes: () => [dish],
        facilityOverrides: [
            { facility: 'Well', electric_count: 1 },
            { facility: 'Simmering Pot', electric_count: 1 },
            { facility: 'Blazing Stove', electric_count: 1 },
        ],
        isQuickRecipeUnlocked: item => item === 'fresh_water' || item === 'sea_salt',
    }));

    assert.ok(result.coin_items.some(step => step.item_name === 'sugarcane' && step.environment === 'Scorching'));
    assert.ok(result.coin_items.some(step => step.item_name === 'quick_fresh_water' && step.is_emode));
    assert.ok(result.coin_items.some(step => step.item_name === 'rock_candy' && step.is_emode && step.reason === 'Sơ chế kẹo đá'));
    assert.ok(result.coin_items.some(step => step.item_name === 'harvest_platter' && step.is_emode));
    assert.ok(result.coin_items.some(step => step.item_name === 'quick_sea_salt'));
    assert.equal(result.environment_assignments[0].covered[0].count, 3);
    assert.deepEqual(result.environment_assignments[0].layouts[0], [{ facility: 'Farmland', x: 2, y: 0, size: 1 }]);
    assert.equal(originalAssignment.covered[0].count, 2);
    assert.equal(result.income_streams.find(stream => stream.item_name === 'harvest_platter').points, 4);
});
