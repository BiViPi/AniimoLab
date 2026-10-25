import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomeLevelController } from '../home-level-controller.js';

function setup(lastPlan = null, includeSelect = true) {
    const calls = [];
    const select = { addEventListener(type, handler) { this.change = handler; } };
    const document = { getElementById: id => id === 'home-level' && includeSelect ? select : null };
    const controller = createHomeLevelController({
        document,
        getHomeLevel: () => { calls.push('get-level'); return 16; },
        renderSimpleSummary: () => calls.push('simple'),
        renderStrategy: () => calls.push('strategy'),
        updateProductionAniimoCap: () => calls.push('cap'),
        updateSimpleEmodeState: () => calls.push('emode'),
        updateSpecialistQuotasLimits: level => calls.push(`quotas:${level}`),
        renderSpecialRecipes: () => calls.push('special'),
        updatePowerGauge: () => calls.push('power'),
        getLastPlan: () => lastPlan,
        displayPlan: plan => calls.push(`display:${plan.id}`),
    });
    controller.attach();
    return { calls, select };
}

test('updates dependent views in order and redraws only a successful existing plan', () => {
    const plan = { id: 'current', success: true };
    const state = setup(plan);
    state.select.change();
    assert.deepEqual(state.calls, ['get-level', 'simple', 'strategy', 'cap', 'emode', 'quotas:16', 'special', 'power', 'display:current']);
});

test('does not redraw failed or missing plan and tolerates missing level selector', () => {
    const failed = setup({ success: false });
    failed.select.change();
    assert.equal(failed.calls.includes('display:undefined'), false);
    assert.equal(failed.calls.length, 8);
    const absent = setup(null, false);
    assert.doesNotThrow(() => absent.calls);
    assert.deepEqual(absent.calls, []);
});
