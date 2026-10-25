import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeToGoalController } from '../time-to-goal-controller.js';

function harness({ target = 'coins', plan = { success: true }, context = {}, rows = null, workerResponse = { success: true, total_time_seconds: 8, amount_produced: 90 }, workerError = null } = {}) {
    const calls = [];
    let lastGoalResult = { stale: true };
    const values = {
        'goal-target': { value: target },
        'target-amount': { value: '10' },
        'current-amount': { value: '4' },
        'target-amount-label': { textContent: '' },
        'current-amount-label': { textContent: '' },
        'amount-produced-label': { textContent: '' },
        'total-time': { textContent: '' },
        'amount-produced': { textContent: '' },
        'product-breakdown-section': { style: {} },
        'seeds-needed-section': { style: {} },
    };
    const chosen = target === 'coins'
        ? { target: 'coins', perSecond: 5, label: 'Coins' }
        : { target, perSecond: 2, label: 'Target', missing: 'Missing target' };
    const list = rows || [chosen, { target: 'extra', perSecond: 1 }];
    const deps = {
        document: { getElementById: id => values[id] },
        getLastPlan: () => plan,
        getPlanContext: () => context,
        getPriorityRows: () => list,
        goalName: row => `name:${row.target}`,
        parseNumber: value => Number(value),
        solveWorker: async (method, json) => {
            calls.push(['worker', method, JSON.parse(json)]);
            if (workerError) throw workerError;
            return JSON.stringify(workerResponse);
        },
        displayGoal: result => calls.push(['display', result]),
        renderGoalAlso: (...args) => calls.push(['also', ...args]),
        timeToMake: (...args) => { calls.push(['time-to-make', ...args]); return 3.25; },
        setLastGoalResult: value => { lastGoalResult = value; },
        formatNumber: value => `num:${value}`,
        logError: (...args) => calls.push(['error', ...args]),
    };
    return { controller: createTimeToGoalController(deps), calls, values, chosen, list, getLastGoalResult: () => lastGoalResult };
}

test('coin goal sends target and current amounts to worker then renders its duration', async () => {
    const { controller, calls, chosen, list } = harness();
    await controller.runTimeToGoal();
    assert.deepEqual(calls[0], ['worker', 'time_to_reach', { plan: { success: true }, target: 10, current: 4 }]);
    assert.equal(calls[1][0], 'display');
    assert.deepEqual(calls[2], ['also', list, chosen, 8, { success: true, total_time_seconds: 8, amount_produced: 90 }]);
});

test('non-coin goal computes seconds, asks worker for breakdown and displays requested amount', async () => {
    const { controller, calls, values, chosen, list } = harness({ target: 'aniipods' });
    await controller.runTimeToGoal();
    assert.deepEqual(calls[0], ['time-to-make', chosen, 6]);
    assert.deepEqual(calls[1], ['worker', 'time_to_reach', { plan: { success: true }, seconds: 3.25 }]);
    assert.equal(values['amount-produced'].textContent, 'num:6');
    assert.deepEqual(calls[3], ['also', list, chosen, 3.25, { success: true, total_time_seconds: 8, amount_produced: 90 }]);
});

test('missing non-coin production displays reason and skips worker', async () => {
    const { controller, calls, values, chosen, getLastGoalResult } = harness({ target: 'aniipods' });
    chosen.perSecond = 0;
    await controller.runTimeToGoal();
    assert.equal(getLastGoalResult(), null);
    assert.equal(values['total-time'].textContent, 'Missing target');
    assert.equal(values['amount-produced'].textContent, '-');
    assert.equal(values['product-breakdown-section'].style.display, 'none');
    assert.equal(values['seeds-needed-section'].style.display, 'none');
    assert.equal(calls.some(call => call[0] === 'worker'), false);
    assert.deepEqual(calls.at(-1), ['also', [chosen, { target: 'extra', perSecond: 1 }], chosen, null]);
});

test('no-ops without successful plan or during an unavailable level-up goal', async () => {
    const noPlan = harness({ plan: null });
    await noPlan.controller.runTimeToGoal();
    assert.deepEqual(noPlan.calls, []);
    const unsuccessful = harness({ plan: { success: false } });
    await unsuccessful.controller.runTimeToGoal();
    assert.deepEqual(unsuccessful.calls, []);
    const levelUp = harness({ context: { levelUp: true } });
    await levelUp.controller.runTimeToGoal();
    assert.deepEqual(levelUp.calls, []);
});

test('worker failure is logged without mutating goal result view', async () => {
    const { controller, calls, values } = harness({ workerError: new Error('offline') });
    await controller.runTimeToGoal();
    assert.deepEqual(calls.map(call => call[0]), ['worker', 'error']);
    assert.equal(values['total-time'].textContent, '');
});
