import test from 'node:test';
import assert from 'node:assert/strict';
import {
    allocateDynamicEmode,
    allocateConfiguredEmodeFacilities,
    actualEmodeCounts,
    calculatePowerWatts,
    adjustFacilityPartitionCounts,
    createWorksheetModeQuotaTracker,
    estimateFacilityMarginalValue,
    getTargetEmodeWatts,
    getWorksheetStepMode,
    getFacilityPartitionCounts,
    isFacilityEligibleForEmode,
    setWorksheetStepMode,
    takeWorksheetModeQuota,
} from '../emode-policy.js';

test('power grid cap honors generator supply rate', () => {
    assert.equal(getTargetEmodeWatts(600, 1.2), 500);
    assert.equal(getTargetEmodeWatts(800, 1.2), 666);
    assert.equal(getTargetEmodeWatts(600, 1.0), 600);
});

test('power totals use each facility tier wattage and unit count', () => {
    assert.equal(calculatePowerWatts({
        'Simmering Pot': { count: 2, level: 4 },
        Mine: { count: 1, level: 4 },
    }, 12), 240);
});

test('configured E-mode auto allocation respects priority, owned tier counts, and watt budget', () => {
    const selected = allocateConfiguredEmodeFacilities({
        facilities: [
            { name: 'A', supportsEmode: true },
            { name: 'B', supportsEmode: true },
            { name: 'C', supportsEmode: true },
            { name: 'Disabled', supportsEmode: false },
        ],
        priority: ['B', 'A', 'C', 'Disabled'],
        facilityTiers: { A: [{ count: 2 }], B: [{ count: 1 }], C: [{ count: 1 }], Disabled: [{ count: 1 }] },
        facilityPowerWatts: { A: 60, B: 40, C: 30, Disabled: 1 },
        maxWatts: 100,
    });
    assert.deepEqual(selected, ['B', 'C']);
});

test('actual E-mode count excludes manual and Prismana rows even when flags conflict', () => {
    const plan = { coin_items: [
        { facility: 'Simmering Pot', facility_count: 1, mode: 'electric', status: 'producing' },
        { facility: 'Simmering Pot', facility_count: 2, mode: 'prismana', is_emode: true, status: 'producing' },
        { facility: 'Jukebox Dryer (Manual)', facility_count: 1, is_emode: true, mode: 'manual', status: 'producing' },
        { facility: 'Crafting Table (Prismana)', facility_count: 1, is_specialist: true, mode: 'electric', status: 'producing' },
        { facility: 'Crafting Table (Electric)', facility_count: 1, status: 'producing' },
    ] };
    assert.deepEqual(actualEmodeCounts(plan, 12), {
        'Simmering Pot': 1,
        'Crafting Table': 2,
    });
});

test('worksheet mode transition canonicalizes flags and facility suffix', () => {
    const electricStep = setWorksheetStepMode({
        facility: 'Simmering Pot (Prismana)', item_name: 'stew__specialist', facility_count: 1,
        is_emode: false, is_specialist: true, is_manual: false,
    }, 'electric');
    assert.equal(electricStep.facility, 'Simmering Pot (Electric)');
    assert.equal(electricStep.mode, 'electric');
    assert.equal(electricStep.is_emode, true);
    assert.equal(electricStep.is_specialist, false);
    assert.equal(electricStep.is_manual, false);
    assert.deepEqual(actualEmodeCounts({ coin_items: [{ ...electricStep, status: 'producing' }] }, 12), {
        'Simmering Pot': 1,
    });
});

test('worksheet mode reads an explicit mode before stale compatibility flags', () => {
    assert.equal(getWorksheetStepMode({ mode: 'prismana', is_emode: true }), 'prismana');
    assert.equal(getWorksheetStepMode({ mode: 'electric', is_specialist: true }), 'electric');
    assert.equal(getWorksheetStepMode({ facility: 'Simmering Pot (Electric)', is_specialist: true }), 'prismana');
});

test('worksheet mode quota is shared and preserves the selected row mode', () => {
    const remaining = { electric: 1, prismana: 1, manual: 0 };
    const prismana = takeWorksheetModeQuota('prismana', remaining, true);
    assert.equal(prismana, 'prismana');
    assert.deepEqual(remaining, { electric: 1, prismana: 0, manual: 0 });

    const electric = takeWorksheetModeQuota('electric', remaining, true);
    assert.equal(electric, 'electric');
    assert.deepEqual(remaining, { electric: 0, prismana: 0, manual: 0 });
});

test('worksheet mode quota does not retain electric mode beyond its quota', () => {
    assert.equal(takeWorksheetModeQuota('electric', { electric: 0, prismana: 1, manual: 0 }, true), 'prismana');
    assert.equal(takeWorksheetModeQuota('electric', { electric: 1, prismana: 0, manual: 0 }, false), 'manual');
    assert.equal(takeWorksheetModeQuota('specialist', { electric: 1, prismana: 1, manual: 0 }, true), 'prismana');
});

test('facility partition adjustments conserve owned units across all three modes', () => {
    assert.deepEqual(adjustFacilityPartitionCounts({
        counts: { electric: 1, prismana: 1, manual: 2 }, totalOwned: 4,
        type: 'prismana', delta: 1, supportsElectric: true,
    }), { electric: 1, prismana: 2, manual: 1 });
    assert.deepEqual(adjustFacilityPartitionCounts({
        counts: { electric: 2, prismana: 1, manual: 1 }, totalOwned: 4,
        type: 'electric', delta: -1, supportsElectric: true,
    }), { electric: 1, prismana: 1, manual: 2 });
    assert.deepEqual(adjustFacilityPartitionCounts({
        counts: { electric: 0, prismana: 1, manual: 2 }, totalOwned: 3,
        type: 'manual', delta: -1, supportsElectric: false,
    }), { electric: 0, prismana: 2, manual: 1 });
    assert.deepEqual(adjustFacilityPartitionCounts({
        counts: { electric: 0, prismana: 0, manual: 1 }, totalOwned: 3,
        type: 'electric', delta: 1, supportsElectric: true,
    }), { electric: 1, prismana: 0, manual: 0 });
});

test('partition dialog counts use overrides first, then canonical plan modes, then quota fallback', () => {
    assert.deepEqual(getFacilityPartitionCounts({
        facility: 'Simmering Pot',
        plan: { coin_items: [{ facility: 'Simmering Pot', facility_count: 1, mode: 'electric', status: 'producing' }] },
        override: { electric_count: 0, specialist_count: 1, manual_count: 0 },
        emodeCounts: { 'Simmering Pot': 1 }, totalOwned: 2, specialistQuotas: {},
    }), { electric: 0, prismana: 1, manual: 0 });

    assert.deepEqual(getFacilityPartitionCounts({
        facility: 'Simmering Pot',
        plan: { coin_items: [
            { facility: 'Simmering Pot (Electric)', facility_count: 1, mode: 'prismana', is_emode: true, status: 'producing' },
            { facility: 'Simmering Pot', facility_count: 2, mode: 'manual', status: 'producing' },
        ] },
        override: null, emodeCounts: {}, totalOwned: 3, specialistQuotas: {},
    }), { electric: 0, prismana: 1, manual: 2 });

    assert.deepEqual(getFacilityPartitionCounts({
        facility: 'Mine', plan: { coin_items: [] }, override: null,
        emodeCounts: { Mine: 1 }, totalOwned: 4, specialistQuotas: { earth_4p_mines: 3 },
    }), { electric: 1, prismana: 3, manual: 0 });

    assert.deepEqual(getFacilityPartitionCounts({
        facility: 'Simmering Pot',
        plan: { coin_items: [{ facility: 'Simmering Pot', facility_count: 1 }] },
        override: null, emodeCounts: {}, totalOwned: 1, specialistQuotas: {},
    }), { electric: 0, prismana: 1, manual: 0 });
});

test('worksheet override quotas are consumed once across separate rows for one facility', () => {
    const takeMode = createWorksheetModeQuotaTracker([{
        facility: 'Simmering Pot',
        electric_count: 1,
        specialist_count: 1,
        manual_count: 0,
    }]);
    assert.equal(takeMode('Simmering Pot', 'prismana', true), 'prismana');
    assert.equal(takeMode('Simmering Pot', 'electric', true), 'electric');
    assert.equal(takeMode('Simmering Pot', 'electric', true), 'manual');
});

test('facility E-mode eligibility follows the RV policy groups', () => {
    assert.equal(isFacilityEligibleForEmode('Simmering Pot', 12), true);
    assert.equal(isFacilityEligibleForEmode('Mine', 12), false);
    assert.equal(isFacilityEligibleForEmode('Well', 13), false);
    assert.equal(isFacilityEligibleForEmode('Mine', 14), true);
    assert.equal(isFacilityEligibleForEmode('Woodworking Bench', 17), false);
    assert.equal(isFacilityEligibleForEmode('Chimney Kiln', 18), true);
});

test('marginal revenue estimate uses plan income streams per active facility unit', () => {
    const estimate = estimateFacilityMarginalValue('Simmering Pot', 4, {
        coin_items: [{ facility: 'Simmering Pot', facility_count: 2, status: 'producing' }],
        income_streams: [{ item_name: 'stew', facility: 'Simmering Pot', rate_per_second: 1 }],
    }, {
        homeLevel: 12,
        powerGridRate: 1.2,
        facilities: { 'Simmering Pot': [{ count: 2, level: 4 }] },
    });
    assert.equal(estimate.status, 'measured');
    assert.equal(estimate.unitWatts, 60);
    assert.equal(estimate.marginalRevenuePerHr, 360);
    assert.equal(estimate.scorePerWatt, 6);
});

test('dynamic allocator spends a tight RV12 budget on the higher value processor', () => {
    const facilities = {
        'Simmering Pot': [{ count: 1, level: 4 }],
        'Jukebox Dryer': [{ count: 1, level: 4 }],
        Mine: [{ count: 1, level: 5 }],
        Well: [{ count: 1, level: 2 }],
        'Woodworking Bench': [{ count: 2, level: 4 }],
        'Chimney Kiln': [{ count: 2, level: 4 }],
    };
    const basePlan = {
        coin_items: Object.keys(facilities).map(facility => ({ facility, facility_count: 1, status: 'producing' })),
        income_streams: [
            { item_name: 'stew', facility: 'Simmering Pot', rate_per_second: 1 },
            { item_name: 'juice', facility: 'Jukebox Dryer', rate_per_second: 0.5 },
        ],
        priorities: [],
    };
    const allocated = allocateDynamicEmode(basePlan, 12, 60, {
        facilities,
        overrides: [],
        specialist_quotas: {},
        powerGridRate: 1.2,
    });
    assert.equal(allocated['Simmering Pot'], 1);
    assert.equal(allocated['Jukebox Dryer'], undefined);
    assert.equal(allocated.Mine, undefined);
    assert.equal(allocated.Well, undefined);
    assert.equal(allocated['Woodworking Bench'], undefined);
    assert.equal(allocated['Chimney Kiln'], undefined);
});

test('dynamic allocator enforces a combined two-unit Woodworking Bench and Chimney Kiln cap', () => {
    const facilities = {
        'Woodworking Bench': [{ count: 2, level: 4 }],
        'Chimney Kiln': [{ count: 2, level: 4 }],
    };
    const basePlan = {
        coin_items: Object.keys(facilities).map(facility => ({ facility, facility_count: 1, status: 'producing' })),
        income_streams: [],
        priorities: [],
    };
    const allocated = allocateDynamicEmode(basePlan, 18, 10000, {
        facilities,
        overrides: [],
        specialist_quotas: {},
        powerGridRate: 1.2,
    });
    assert.equal((allocated['Woodworking Bench'] || 0) + (allocated['Chimney Kiln'] || 0), 2);
});

test('dynamic allocator preserves fixed mode overrides and rejects watt overflow', () => {
    const facilities = { 'Simmering Pot': [{ count: 2, level: 4 }] };
    const basePlan = { coin_items: [], income_streams: [], priorities: [] };
    const override = [{
        facility: 'Simmering Pot',
        level: 4,
        electric_count: 1,
        specialist_count: 0,
        manual_count: 1,
    }];
    const options = { facilities, overrides: override, specialist_quotas: {}, powerGridRate: 1.2 };

    const withinCap = allocateDynamicEmode(basePlan, 12, 60, options);
    assert.equal(withinCap['Simmering Pot'], 1);
    assert.equal(withinCap._tier_counts[0].count, 1);

    const overCap = allocateDynamicEmode(basePlan, 12, 59, options);
    assert.equal(overCap.validation_error, true);
});
