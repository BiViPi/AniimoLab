import test from 'node:test';
import assert from 'node:assert/strict';
import { createFastResolveController } from '../fast-resolve-controller.js';

function harness(overrides = {}) {
    const calls = [];
    const oldPlan = { coin_items: [], fixedLines: [{ facility: 'Simmering Pot', item_name: 'Jam', mode: 'manual', facility_count: 1 }] };
    const emodeCounts = { 'Jukebox Dryer': 2, Mine: 0 };
    const badge = { style: {}, innerHTML: '' };
    const state = { plan: oldPlan, emodeCounts, bySetup: {}, error: null };
    let nowCalls = 0;
    const deps = {
        buildInput: () => ({ exclude: ['new'], facilities: { Mine: [{ count: 1 }] } }),
        getLastPlanInput: () => ({ exclude: ['old', 'new'] }),
        getLastPlan: () => state.plan,
        getEmodeCounts: () => state.emodeCounts,
        getFacilityOverrides: () => [{ facility: 'Mine', manual_count: 1 }],
        getSelectedSetup: () => 'minimum',
        getBestSetup: () => 'best',
        getWorksheetLines: plan => plan.fixedLines,
        buildWorksheetOverrides: lines => [{ from: lines[0].facility }],
        getFacilityLevel: () => 5,
        getAniimoInput: setup => ({ aniimo: setup, roster: 'crew' }),
        solveWorker: async (method, payload) => { calls.push(['solve', method, JSON.parse(payload)]); return JSON.stringify({ success: true, coin_items: [], fixedLines: oldPlan.fixedLines }); },
        now: () => [100, 145][nowCalls++],
        integrateSeasonPlan: plan => { calls.push(['integrate']); return { ...plan, seasonal: true }; },
        normalizePlanFacilityCounts: plan => { calls.push(['normalize', plan]); plan.normalized = true; },
        setPlanForSetup: (setup, plan) => { state.bySetup[setup] = plan; },
        setLastPlan: plan => { state.plan = plan; },
        setEmodeCounts: counts => { state.emodeCounts = counts; },
        actualEmodeCounts: plan => { calls.push(['actual-counts', plan]); return { 'Jukebox Dryer': 1 }; },
        showSelectedPlan: () => calls.push(['show']),
        updatePowerGauge: counts => calls.push(['gauge', counts]),
        document: { getElementById: id => id === 'fast-resolve-benchmark-badge' ? badge : null },
        setLastError: error => { state.error = error; },
        warn: (...args) => calls.push(['warn', ...args]),
        logError: (...args) => calls.push(['error', ...args]),
        ...overrides,
    };
    return { controller: createFastResolveController(deps), calls, state, badge, oldPlan };
}

test('successful fast resolve preserves exclusions and applies normalized plan plus power state', async () => {
    const { controller, calls, state, badge } = harness();
    assert.equal(await controller.runFastReSolve(), true);
    const solve = calls.find(call => call[0] === 'solve');
    assert.deepEqual(solve[2].exclude, ['new', 'old']);
    assert.deepEqual(solve[2].emode_facility_counts, { 'Jukebox Dryer': 2, Mine: 0 });
    assert.deepEqual(solve[2].emode_tier_counts, [{ facility: 'Jukebox Dryer', level: 5, count: 2 }]);
    assert.equal(solve[2].aniimo, 'best');
    assert.equal(state.bySetup.best, state.plan);
    assert.equal(state.plan.normalized, true);
    assert.deepEqual(state.emodeCounts, { 'Jukebox Dryer': 1 });
    assert.equal(badge.innerHTML, '⚡ 45ms');
    assert.deepEqual(calls.map(call => call[0]), ['solve', 'integrate', 'normalize', 'actual-counts', 'show', 'gauge']);
});

test('fixed-layout success sends fixed plan constraints and accepts identical facility assignments', async () => {
    const { controller, calls, state } = harness();
    assert.equal(await controller.runFastReSolve(true), true);
    const solve = calls.find(call => call[0] === 'solve');
    assert.deepEqual(solve[2].fixed_plan_lines, state.plan.fixedLines);
    assert.deepEqual(solve[2].facility_overrides, [{ from: 'Simmering Pot' }]);
    assert.equal(state.bySetup.best, state.plan);
});

test('fixed-layout assignment mismatch rejects candidate without replacing current plan or counts', async () => {
    const { controller, state, oldPlan } = harness({
        solveWorker: async () => JSON.stringify({ success: true, coin_items: [], fixedLines: [{ facility: 'Well', item_name: 'Water', mode: 'electric', facility_count: 1 }] }),
    });
    const oldCounts = state.emodeCounts;
    assert.equal(await controller.runFastReSolve(true), false);
    assert.equal(state.plan, oldPlan);
    assert.equal(state.emodeCounts, oldCounts);
    assert.equal(Object.keys(state.bySetup).length, 0);
    assert.match(state.error, /changed a facility\/product assignment/);
});

test('unsuccessful solve reports the solver error and does not apply a plan', async () => {
    const { controller, state, oldPlan, calls } = harness({ solveWorker: async () => JSON.stringify({ success: false, error: 'quota' }) });
    assert.equal(await controller.runFastReSolve(), false);
    assert.equal(state.plan, oldPlan);
    assert.equal(state.error, 'quota');
    assert.ok(calls.some(call => call[0] === 'warn'));
});

test('worker exceptions are captured and reported', async () => {
    const { controller, state, oldPlan, calls } = harness({ solveWorker: async () => { throw new Error('worker failed'); } });
    assert.equal(await controller.runFastReSolve(), false);
    assert.equal(state.plan, oldPlan);
    assert.equal(state.error, 'worker failed');
    assert.ok(calls.some(call => call[0] === 'error'));
});
