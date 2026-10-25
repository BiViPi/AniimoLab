import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePlanFacilityCounts } from '../plan-normalization.js';
import { createWorksheetModeQuotaTracker } from '../emode-policy.js';

const dependencies = overrides => ({
    selectedHomeLevel: () => 12,
    facilityOverrides: [],
    facilities: [
        { name: 'Nồi Hầm', category: 'Materials Processing', supportsEmode: true },
        { name: 'Woodworking Bench', category: 'Wood & Ore Processing', supportsEmode: true },
    ],
    categoryByName: new Map(),
    lastEmodeCounts: {},
    createWorksheetModeQuotaTracker,
    getOwnedFacilityCounts: () => ({}),
    ...overrides,
});

test('normalization consumes one facility mode quota across recipe rows', () => {
    const plan = {
        coin_items: [
            { facility: 'Nồi Hầm', item_name: 'stew_a', status: 'producing', facility_count: 1, cycle_time: 10, units_per_second: 2 },
            { facility: 'Nồi Hầm', item_name: 'stew_b', status: 'producing', facility_count: 1, cycle_time: 10, units_per_second: 2 },
        ],
        income_streams: [],
    };
    const result = normalizePlanFacilityCounts(plan, dependencies({
        facilityOverrides: [{ facility: 'Nồi Hầm', electric_count: 1, specialist_count: 1, manual_count: 0 }],
    }));

    assert.deepEqual(result.coin_items.map(step => step.mode), ['prismana', 'electric']);
    assert.equal(result.coin_items.filter(step => step.is_emode).length, 1);
    assert.equal(result.coin_items.filter(step => step.is_specialist).length, 1);
});

test('normalization clamps owned processing units and apportions revenue by production capacity', () => {
    const plan = {
        coin_items: [{ facility: 'Woodworking Bench', item_name: 'plank', status: 'producing', facility_count: 4, cycle_time: 10, yield_amount: 1 }],
        income_streams: [{ item_name: 'plank', rate_per_second: 12, units_per_second: 4 }],
    };
    const result = normalizePlanFacilityCounts(plan, dependencies({
        getOwnedFacilityCounts: () => ({ 'Woodworking Bench': 2 }),
    }));

    assert.equal(result.coin_items.length, 2);
    assert.deepEqual(result.coin_items.map(step => step.facility_count), [1, 1]);
    assert.deepEqual(result.coin_items.map(step => step.rate_per_second), [6, 6]);
    assert.deepEqual(result.coin_items.map(step => step.sold_units_per_second), [2, 2]);
});

test('normalization leaves non-plan values and null plans unchanged', () => {
    const untouched = { success: false, coin_items: null };
    assert.equal(normalizePlanFacilityCounts(null, dependencies()), null);
    assert.equal(normalizePlanFacilityCounts(untouched, dependencies()), untouched);
});
