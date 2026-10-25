import test from 'node:test';
import assert from 'node:assert/strict';
import { executePlanSolve } from '../plan-solve-runner.js';

function makeDeps(overrides = {}) {
    const calls = [];
    const input = { facilities: { 'Simmering Pot': [{ count: 1 }] }, emode_facilities: ['Simmering Pot'] };
    return {
        calls,
        input,
        deps: {
            input,
            bestSetup: 'specialist',
            currentRv: 12,
            useEmode: true,
            solve: async (...args) => { calls.push(['solve', ...args]); return JSON.stringify({ success: true, coin_items: [] }); },
            solveWithEmode: async options => { calls.push(['emode', options]); return { plan: { success: true, coin_items: [] }, emodeCounts: { 'Simmering Pot': 1 } }; },
            allocate: () => ({}),
            getGeneratorCapacity: () => 600,
            getPowerGridRate: () => 1,
            getTargetEmodeWatts: () => 600,
            isCurrent: () => true,
            onBaseProgress: () => {},
            onBaseComplete: () => calls.push(['base-complete']),
            now: () => 123,
            warn: () => {},
            runPruning: async options => { calls.push(['prune', options]); return { plan: options.plan }; },
            pruningOptions: { unlockedSpecial: ['recipe'], activePriorities: ['goal'] },
            integrateSeasonPlan: plan => { calls.push(['season']); return { ...plan, seasonal: true }; },
            normalizePlanFacilityCounts: plan => { calls.push(['normalize']); return plan; },
            actualEmodeCounts: plan => { calls.push(['actual-counts', plan]); return { 'Simmering Pot': 2 }; },
            ...overrides
        }
    };
}

test('E-mode run passes solver dependencies, prunes then integrates and normalizes before final count', async () => {
    const { deps, calls } = makeDeps();
    const result = await executePlanSolve(deps);
    assert.equal(result.cancelled, undefined);
    assert.deepEqual(result.emodeCounts, { 'Simmering Pot': 2 });
    assert.equal(result.plan.seasonal, true);
    assert.deepEqual(calls.map(call => call[0]), ['emode', 'prune', 'season', 'normalize', 'actual-counts']);
});

test('non-E-mode run clears E-mode input and solves once with the selected Aniimo setup', async () => {
    const { deps, calls, input } = makeDeps({ useEmode: false });
    const result = await executePlanSolve(deps);
    const solveCall = calls.find(call => call[0] === 'solve');
    assert.equal(solveCall[1], 'find_plan');
    assert.deepEqual(JSON.parse(solveCall[2]), { ...input, emode_facilities: [], emode_facility_counts: {}, power_grid_rate: 1, aniimo: 'specialist' });
    assert.deepEqual(calls.map(call => call[0]), ['solve', 'base-complete', 'prune', 'season', 'normalize']);
    assert.deepEqual(result.emodeCounts, {});
});

test('solver cancellation stops before pruning or applying the plan', async () => {
    const { deps, calls } = makeDeps();
    deps.solveWithEmode = async () => { calls.push(['emode']); return { cancelled: true }; };
    assert.deepEqual(await executePlanSolve(deps), { cancelled: true });
    assert.deepEqual(calls.map(call => call[0]), ['emode']);
});

test('stale run after a plain solve is discarded before pruning', async () => {
    let current = true;
    const { deps, calls } = makeDeps({ useEmode: false, isCurrent: () => current, onBaseComplete: () => { current = false; } });
    assert.deepEqual(await executePlanSolve(deps), { cancelled: true });
    assert.deepEqual(calls.map(call => call[0]), ['solve']);
});

test('pruning cancellation skips seasonal integration and normalization', async () => {
    const { deps, calls } = makeDeps();
    deps.runPruning = async () => { calls.push(['prune']); return { cancelled: true }; };
    assert.deepEqual(await executePlanSolve(deps), { cancelled: true });
    assert.deepEqual(calls.map(call => call[0]), ['emode', 'prune']);
});
