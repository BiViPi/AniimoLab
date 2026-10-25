import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilityPlanViewController } from '../facility-plan-view.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        style: {},
        ...initialProps,
    };
}

function createMockDocument(elements = {}) {
    return {
        getElementById(id) {
            return elements[id] || null;
        },
    };
}

test('facility-plan-view: listOf formats items list grammatically', () => {
    const controller = createFacilityPlanViewController();
    assert.equal(controller.listOf([]), '');
    assert.equal(controller.listOf(['Apples']), 'Apples');
    assert.equal(controller.listOf(['Apples', 'Oranges']), 'Apples and Oranges');
    assert.equal(controller.listOf(['Apples', 'Oranges', 'Bananas']), 'Apples, Oranges and Bananas');
});

test('facility-plan-view: modeTag formats tag with color and localization', () => {
    let isVi = false;
    const controller = createFacilityPlanViewController({
        environmentModeColors: { Warm: '#f59e0b' },
        isVietnamese: () => isVi,
        window: {
            VI_ENV_MODES: { Warm: 'Ấm áp' },
        },
    });

    const enTag = controller.modeTag('Warm');
    assert.match(enTag, /--tint:#f59e0b/);
    assert.match(enTag, />Warm</);

    isVi = true;
    const viTag = controller.modeTag('Warm');
    assert.match(viTag, />Ấm áp</);
});

test('facility-plan-view: planRows applies modeUpdates and delegates to buildFacilityPlanRows', () => {
    const mockStep = { facility: 'Mine', count: 1 };
    const controller = createFacilityPlanViewController({
        selectedHomeLevel: () => 14,
        buildFacilityPlanRows: ({ rows }) => {
            return {
                html: '<tr><td>Row</td></tr>',
                modeUpdates: [{ step: rows[0], mode: 'electric' }],
            };
        },
    });

    const html = controller.planRows([mockStep]);
    assert.equal(html, '<tr><td>Row</td></tr>');
    assert.equal(mockStep.mode, 'electric');
});

test('facility-plan-view: renderFacilityPlan renders into facility-plan-container', () => {
    const container = createMockElement('facility-plan-container');
    const doc = createMockDocument({ 'facility-plan-container': container });

    const controller = createFacilityPlanViewController({
        document: doc,
        buildFacilityPlanMarkup: plan => `<div>Plan-${plan.rate}</div>`,
    });

    controller.renderFacilityPlan({ rate: 100 });
    assert.equal(container.innerHTML, '<div>Plan-100</div>');
});
