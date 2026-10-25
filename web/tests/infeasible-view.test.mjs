import test from 'node:test';
import assert from 'node:assert/strict';
import { createInfeasibleViewController } from '../infeasible-view.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        textContent: '',
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

test('infeasible-view: renderInfeasibleExplanation renders into container', () => {
    const container = createMockElement('infeasible-explanation-section');
    const doc = createMockDocument({
        'infeasible-explanation-section': container,
    });

    const controller = createInfeasibleViewController({
        document: doc,
        selectedHomeLevel: () => 10,
        simpleSetup: () => ({ facilities: { Farmland: [{ count: 20 }] } }),
        seasonActive: () => false,
        isLevelUpStrategy: () => true,
        levelUpTarget: () => 11,
        buildInfeasibleExplanationMarkup: ({ currentRv, targetRv }) => `<div>Infeasible RV${currentRv}->${targetRv}</div>`,
    });

    controller.renderInfeasibleExplanation();
    assert.equal(container.innerHTML, '<div>Infeasible RV10->11</div>');
    assert.equal(container.style.display, 'block');
});

test('infeasible-view: showError handles infeasible errors by showing explanation card', () => {
    let renderedExplanation = false;
    const errorEl = createMockElement('error-message');
    const resultsContent = createMockElement('results-content');
    const resultsSection = createMockElement('results-section');
    const infeasibleEl = createMockElement('infeasible-explanation-section');

    const doc = createMockDocument({
        'error-message': errorEl,
        'results-content': resultsContent,
        'results-section': resultsSection,
        'infeasible-explanation-section': infeasibleEl,
    });

    const controller = createInfeasibleViewController({
        document: doc,
        buildInfeasibleExplanationMarkup: () => {
            renderedExplanation = true;
            return '<div>Explanation</div>';
        },
    });

    controller.showError('Optimizer: No plan found for constraints');
    assert.equal(resultsSection.style.display, 'block');
    assert.equal(resultsContent.style.display, 'none');
    assert.equal(errorEl.style.display, 'none');
    assert.equal(renderedExplanation, true);
});

test('infeasible-view: showError handles standard errors by showing error message', () => {
    const errorEl = createMockElement('error-message');
    const resultsContent = createMockElement('results-content');
    const resultsSection = createMockElement('results-section');
    const infeasibleEl = createMockElement('infeasible-explanation-section');

    const doc = createMockDocument({
        'error-message': errorEl,
        'results-content': resultsContent,
        'results-section': resultsSection,
        'infeasible-explanation-section': infeasibleEl,
    });

    const controller = createInfeasibleViewController({
        document: doc,
    });

    controller.showError('Network crash: failed to load module');
    assert.equal(resultsSection.style.display, 'block');
    assert.equal(resultsContent.style.display, 'none');
    assert.equal(infeasibleEl.style.display, 'none');
    assert.equal(errorEl.style.display, 'block');
    assert.equal(errorEl.textContent, 'Network crash: failed to load module');
});
