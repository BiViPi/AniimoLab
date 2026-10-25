import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanDisplayController } from '../plan-display-controller.js';

function createHarness({ isVi = false, planContext = { skipped: [] }, rateUnitChosen = false } = {}) {
    const calls = [];
    const elements = new Map();
    const getElementById = id => {
        if (!elements.has(id)) elements.set(id, {
            style: {},
            classList: { remove: (...args) => calls.push(['class-remove', id, ...args]) },
            textContent: '',
        });
        return elements.get(id);
    };
    const deps = {
        document: { getElementById },
        isVietnamese: () => isVi,
        getRateUnitChosen: () => rateUnitChosen,
        getPlanContext: () => planContext,
        setUnverifiedRowKeys: value => calls.push(['unverified', [...value]]),
        renderInfeasibleExplanation: plan => calls.push(['infeasible', plan]),
        updateRateDisplay: value => calls.push(['rate', value]),
        renderGoalTargets: plan => calls.push(['goals', plan]),
        renderInsights: plan => calls.push(['insights', plan]),
        evaluatePlotsOptimization: plan => calls.push(['plots', plan]),
        buildSolverResultViewModel: ({ plan, isVi: locale }) => { calls.push(['solver-model', plan, locale]); return {}; },
        prettyItem: value => `pretty:${value}`,
        renderSeedTable: plan => calls.push(['seeds', plan]),
        renderLevelUp: plan => calls.push(['level-up', plan]),
        renderProfitBreakdown: plan => calls.push(['profit', plan]),
        renderFacilityPlan: plan => calls.push(['facility', plan]),
        renderHomelandLayout: plan => calls.push(['layout', plan]),
        renderAniimoSummary: plan => calls.push(['aniimo', plan]),
    };
    return { controller: createPlanDisplayController(deps), calls, elements, getElementById };
}

test('infeasible plan hides result panels and skips successful-plan renderers', () => {
    const { controller, calls, getElementById } = createHarness();
    const plan = { success: false, error: 'no capacity' };
    controller.displayPlan(plan);
    assert.equal(getElementById('results-section').style.display, 'block');
    assert.equal(getElementById('goal-section').style.display, 'none');
    assert.equal(getElementById('results-content').style.display, 'none');
    assert.deepEqual(calls, [['infeasible', plan]]);
});

test('successful plan passes locale and context through the full render sequence', () => {
    const { controller, calls, getElementById } = createHarness({
        isVi: true,
        planContext: { skipped: ['ore', 'fiber'] },
        rateUnitChosen: true,
    });
    const plan = { success: true, level_up: true, unverified: [{ facility: 'Mine', item_name: 'ore' }] };
    controller.displayPlan(plan);
    assert.equal(getElementById('goal-section').style.display, 'none');
    assert.equal(getElementById('plan-skipped').style.display, 'block');
    assert.equal(getElementById('plan-skipped').textContent, 'Đang bỏ qua: pretty:ore, pretty:fiber.');
    assert.ok(calls.some(call => call[0] === 'solver-model' && call[2] === true));
    assert.equal(calls.find(call => call[0] === 'rate')[1], false);
    assert.deepEqual(calls.filter(call => ['seeds', 'level-up', 'profit', 'facility', 'layout', 'aniimo'].includes(call[0])).map(call => call[0]), ['seeds', 'level-up', 'profit', 'facility', 'layout', 'aniimo']);
    assert.deepEqual(calls.find(call => call[0] === 'unverified')[1], ['Mine|ore']);
});

test('coin plan shows goal section and clears skipped-plan message when empty', () => {
    const { controller, getElementById } = createHarness({ planContext: { skipped: [] } });
    controller.displayPlan({ success: true, level_up: false });
    assert.equal(getElementById('goal-section').style.display, 'block');
    assert.equal(getElementById('plan-skipped').style.display, 'none');
    assert.equal(getElementById('plan-skipped').textContent, '');
});
