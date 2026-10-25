import test from 'node:test';
import assert from 'node:assert/strict';
import { createGoalDisplayController } from '../goal-display-controller.js';

function harness() {
    const elements = new Map();
    const calls = [];
    const document = { getElementById(id) {
        if (!elements.has(id)) elements.set(id, { textContent: '', style: {} });
        return elements.get(id);
    } };
    let lastGoalResult = { success: true, stale: true };
    return {
        calls,
        document,
        getLast: () => lastGoalResult,
        controller: createGoalDisplayController({
            document,
            setLastGoalResult: value => { lastGoalResult = value; },
            formatDuration: seconds => `duration:${seconds}`,
            formatNumber: amount => `amount:${amount}`,
            renderProductBreakdown: result => calls.push(['product', result]),
            renderSeedsNeeded: result => calls.push(['seeds', result]),
            warn: (...args) => calls.push(['warn', ...args]),
        }),
    };
}

test('failed goal clears previous result and hides goal detail sections', () => {
    const { controller, calls, document, getLast } = harness();
    const result = { success: false, error: 'unreachable' };
    controller.displayGoal(result);
    assert.equal(getLast(), null);
    assert.equal(document.getElementById('total-time').textContent, '-');
    assert.equal(document.getElementById('amount-produced').textContent, '-');
    assert.equal(document.getElementById('product-breakdown-section').style.display, 'none');
    assert.equal(document.getElementById('seeds-needed-section').style.display, 'none');
    assert.deepEqual(calls, [['warn', 'Goal calculation failed:', 'unreachable']]);
});

test('successful goal formats values and refreshes both detail renderers', () => {
    const { controller, calls, document, getLast } = harness();
    const result = { success: true, total_time_seconds: 61, amount_produced: 240 };
    controller.displayGoal(result);
    assert.equal(getLast(), result);
    assert.equal(document.getElementById('total-time').textContent, 'duration:61');
    assert.equal(document.getElementById('amount-produced').textContent, 'amount:240');
    assert.deepEqual(calls, [['product', result], ['seeds', result]]);
});

test('zero-time successful goal displays zero minutes', () => {
    const { controller, document } = harness();
    controller.displayGoal({ success: true, total_time_seconds: 0, amount_produced: 0 });
    assert.equal(document.getElementById('total-time').textContent, '0m');
    assert.equal(document.getElementById('amount-produced').textContent, 'amount:0');
});
