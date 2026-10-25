import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanInputBuilder } from '../plan-input.js';

function makeDependencies(overrides = {}) {
    return {
        getHomeLevel: () => 14,
        simpleSetup: () => ({
            facilities: {
                Woodland: [{ level: 5, count: 3 }],
                Farmland: [{ level: 4, count: 12 }],
                'Crafting Table': [{ level: 4, count: 1 }],
                'Blazing Stove': [{ level: 2, count: 3 }],
            },
            modules: { ecological_module: 4 },
        }),
        getExcludedRecipes: () => ['custom_exclusion'],
        isSeasonActive: () => true,
        selectedSeasonDishes: new Set(['umbral_pickle', 'harvest_platter']),
        getSeasonRadishPlots: () => 2,
        getSeasonPepperPlots: () => 1,
        quickRecipeUnlocks: { wheat: { quick: 'quick_wheat' }, rice: { quick: 'quick_rice' } },
        isQuickRecipeUnlocked: item => item === 'wheat',
        selectOptimalSeasonDishes: () => [{ name: 'harvest_platter' }],
        getSeasonFacilityUsage: () => ({ 'Blazing Stove': 1 }),
        getActivePriorities: () => ['priority_dish'],
        getLevelUpInput: () => ({ target: 15, cost: [['wood', 10]] }),
        getPowerGridRate: () => 0.8,
        getProductionAniimoCap: () => 18,
        getPowerPoleCount: () => 4,
        getSpecialistQuotas: () => ({ earth_4p_mines: 2 }),
        getFacilityOverrides: () => [{ facility: 'Blazing Stove', electric_count: 1 }],
        ...overrides,
    };
}

test('plan input builder applies crop, quick recipe, event plot, and facility reservation policies', () => {
    const builder = createPlanInputBuilder(makeDependencies());
    const input = builder();

    assert.equal(input.home_level, 14);
    assert.equal(input.currency, 'coins');
    assert.deepEqual(input.priorities, ['priority_dish']);
    assert.equal(input.level_up.target, 15);
    assert.deepEqual(input.exclude, [
        'custom_exclusion', 'willow_wood', 'bamboo', 'lemon', 'cherry_blossom', 'maple_syrup', 'quick_bamboo',
        'palm_bark', 'chestnut', 'walnut', 'quick_lemon', 'pearl', 'wheat',
    ]);
    assert.equal(input.exclude.includes('apple'), false);
    assert.equal(input.facilities.Farmland[0].count, 8);
    assert.equal(input.facilities['Blazing Stove'][0].count, 2);
    assert.equal(input.facilities.Woodland[0].count, 3);
    assert.deepEqual(input.power_grid_rate, 0.8);
    assert.equal(input.production_aniimo_cap, 18);
    assert.equal(input.power_poles, 4);
    assert.deepEqual(input.specialist_quotas, { earth_4p_mines: 2 });
    assert.deepEqual(input.facility_overrides, [{ facility: 'Blazing Stove', electric_count: 1 }]);
    assert.deepEqual(input.emode_facilities, []);
    assert.deepEqual(input.emode_facility_counts, {});
});

test('plan input builder applies non-season woodland exclusion and reserves no plots outside season', () => {
    const builder = createPlanInputBuilder(makeDependencies({
        isSeasonActive: () => false,
        getSeasonRadishPlots: () => 0,
        getSeasonPepperPlots: () => 0,
    }));
    const input = builder();

    assert.equal(input.exclude.includes('apple'), true);
    assert.equal(input.facilities.Farmland[0].count, 12);
    assert.equal(input.facilities['Blazing Stove'][0].count, 3);
    assert.equal(input.season, false);
});

test('plan input builder returns fresh facility state for each invocation', () => {
    let setupCalls = 0;
    const builder = createPlanInputBuilder(makeDependencies({
        simpleSetup: () => {
            setupCalls++;
            return { facilities: { Woodland: [{ level: 1, count: 1 }], Farmland: [{ level: 1, count: 2 }] }, modules: {} };
        },
        isSeasonActive: () => false,
        getHomeLevel: () => 5,
    }));

    const first = builder();
    first.facilities.Farmland[0].count = 99;
    const second = builder();

    assert.equal(setupCalls, 2);
    assert.equal(second.facilities.Farmland[0].count, 2);
});
