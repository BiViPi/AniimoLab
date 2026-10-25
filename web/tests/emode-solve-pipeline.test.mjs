import test from 'node:test';
import assert from 'node:assert/strict';
import { solvePlanWithEmode } from '../emode-solve-pipeline.js';

const baseInput = () => ({
    facility_overrides: [{ facility: 'Nồi Hầm', electric_count: 1, prismana_count: 0, manual_count: 0 }],
    facilities: { 'Chimney Kiln': [{ count: 2, level: 3 }], 'Woodworking Bench': [{ count: 1, level: 2 }] },
    specialist_quotas: {},
    production_aniimo_cap: 20,
});

function dependencies(overrides = {}) {
    return {
        bestSetup: 'best',
        currentRv: 18,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 0.8,
        getTargetEmodeWatts: (capacity, rate) => capacity * rate,
        now: () => 100,
        isCurrent: () => true,
        onBaseProgress: () => {},
        onBaseComplete: () => {},
        warn: () => {},
        ...overrides,
    };
}

test('E-mode pipeline solves baseline before allocation and final fixed allocation', async () => {
    const input = baseInput();
    const calls = [];
    const result = await solvePlanWithEmode({
        ...dependencies(),
        input,
        solve: async (_type, json, progress) => {
            const payload = JSON.parse(json);
            calls.push(payload);
            progress?.(5);
            return JSON.stringify(calls.length === 1
                ? { success: true, priorities: [{ target: 'dish', per_second: 2 }] }
                : { success: true, priorities: [{ target: 'dish', per_second: 2 }] });
        },
        allocate: (_plan, _rv, watts, options) => {
            assert.equal(watts, 800);
            assert.equal(options.overrides, input.facility_overrides);
            return {
                'Nồi Hầm': 1,
                'Chimney Kiln': 1,
                'Woodworking Bench': 1,
                _tier_counts: [{ facility: 'Nồi Hầm', level: 1, count: 1 }],
                _diagnostics: ['ok'],
            };
        },
    });

    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].emode_facility_counts, { 'Nồi Hầm': 1 });
    assert.equal(calls[0].power_grid_rate, 0.8);
    assert.equal(calls[1].emode_facility_counts['Nồi Hầm'], 1);
    assert.equal(calls[1].emode_facility_counts['Chimney Kiln'], 1);
    assert.equal(calls[1].emode_facility_counts['Woodworking Bench'], 1);
    assert.deepEqual(calls[1].emode_tier_counts, [{ facility: 'Nồi Hầm', level: 1, count: 1 }]);
    assert.deepEqual(calls[1].required_emode_tiers, [{ facility: 'Chimney Kiln', level: 3, count: 1 }, { facility: 'Woodworking Bench', level: 2, count: 1 }]);
    assert.equal(result.plan.solver_source, 'smart_two_stage + exact_fixed_allocation');
    assert.equal(result.emodeCounts['Nồi Hầm'], 1);
    assert.equal(result.emodeCounts['Chimney Kiln'], 1);
    assert.equal(result.emodeCounts['Woodworking Bench'], 1);
});

test('E-mode priority floor violation rolls back to the baseline plan', async () => {
    const input = baseInput();
    let solveCalls = 0;
    const result = await solvePlanWithEmode({
        ...dependencies(), input,
        solve: async () => JSON.stringify(++solveCalls === 1
            ? { success: true, priorities: [{ target: 'dish', per_second: 10 }] }
            : { success: true, priorities: [{ target: 'dish', per_second: 9 }] }),
        allocate: () => ({ 'Nồi Hầm': 1 }),
    });

    assert.equal(solveCalls, 2);
    assert.equal(result.plan.priorities[0].per_second, 10);
    assert.equal(result.plan.solver_source, 'base_plan_fallback');
    assert.equal(result.plan.fallback_reason, 'priority_floor_violation');
    assert.deepEqual(result.emodeCounts, {});
    assert.deepEqual(input.emode_facility_counts, {});
});

test('invalid allocation returns the base plan without a second solve', async () => {
    const input = baseInput();
    let solveCalls = 0;
    const result = await solvePlanWithEmode({
        ...dependencies(), input,
        solve: async () => { solveCalls++; return JSON.stringify({ success: true, priorities: [] }); },
        allocate: () => ({ validation_error: true, error: 'aggregate_power_overflow' }),
    });

    assert.equal(solveCalls, 1);
    assert.equal(result.plan.solver_source, 'base_plan_fallback');
    assert.equal(result.plan.fallback_reason, 'aggregate_power_overflow');
    assert.deepEqual(result.emodeCounts, {});
});

test('stale plan run stops after baseline solve and skips allocation', async () => {
    let allocated = false;
    const result = await solvePlanWithEmode({
        ...dependencies({ isCurrent: () => false }),
        input: baseInput(),
        solve: async () => JSON.stringify({ success: true }),
        allocate: () => { allocated = true; return {}; },
    });

    assert.equal(result.cancelled, true);
    assert.equal(allocated, false);
});
