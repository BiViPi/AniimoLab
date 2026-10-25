import test from 'node:test';
import assert from 'node:assert/strict';
import { createRateDisplayController } from '../rate-display-controller.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        textContent: '',
        style: {},
        value: 'second',
        children: [],
        appendChild(child) { this.children.push(child); },
        closest(sel) { return null; },
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

test('rate-display-controller: priorityRows delegates to buildPriorityRateRows', () => {
    let passedContext = null;
    const mockPlan = { rate_per_second: 10 };
    const mockContext = { levelUp: false };

    const controller = createRateDisplayController({
        getPlanContext: () => mockContext,
        priorityLabel: target => `Label-${target}`,
        seasonPointsLabel: 'Pts',
        buildPriorityRateRows: ({ plan, planContext }) => {
            passedContext = planContext;
            return [{ target: 'coins', perSecond: plan.rate_per_second }];
        },
    });

    const rows = controller.priorityRows(mockPlan);
    assert.equal(passedContext, mockContext);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].target, 'coins');
});

test('rate-display-controller: updateRateDisplay renders coins rate when no priority rows', () => {
    const rateUnitSelect = createMockElement('rate-unit', { value: 'second' });
    const rateLine = createMockElement('rate-line');
    const planRate = createMockElement('plan-rate');
    const rateLabel = createMockElement('rate-label');
    const priorityRatesTable = createMockElement('priority-rates');

    const doc = createMockDocument({
        'rate-unit': rateUnitSelect,
        'rate-line': rateLine,
        'plan-rate': planRate,
        'rate-label': rateLabel,
        'priority-rates': priorityRatesTable,
    });

    const mockPlan = {
        success: true,
        currency: 'coins',
        rate_per_second: 5.5,
        season_points: 0,
    };

    const controller = createRateDisplayController({
        document: doc,
        getLastPlan: () => mockPlan,
        getPlanContext: () => ({ levelUp: true }), // levelUp means no priority rows
        rateUnitSeconds: { second: { multiplier: 1, suffix: '/s' } },
        currencyLabels: { coins: 'Home Coins' },
        formatRate: n => String(n),
    });

    controller.updateRateDisplay();
    assert.equal(planRate.textContent, '5.5 Home Coins/s');
    assert.equal(rateLabel.textContent, 'Your Rate');
    assert.equal(rateLine.style.display, '');
    assert.equal(priorityRatesTable.innerHTML, '');
});

test('rate-display-controller: updateRateDisplay auto steps up unit when pickUnit=true and rate is small', () => {
    const rateUnitSelect = createMockElement('rate-unit', { value: 'second' });
    const rateLine = createMockElement('rate-line');
    const planRate = createMockElement('plan-rate');
    const rateLabel = createMockElement('rate-label');
    const priorityRatesTable = createMockElement('priority-rates');

    const doc = createMockDocument({
        'rate-unit': rateUnitSelect,
        'rate-line': rateLine,
        'plan-rate': planRate,
        'rate-label': rateLabel,
        'priority-rates': priorityRatesTable,
    });

    const mockPlan = {
        success: true,
        currency: 'coins',
        rate_per_second: 0.001,
        season_points: 0,
    };

    const rateUnitSeconds = {
        second: { multiplier: 1, suffix: '/s' },
        minute: { multiplier: 60, suffix: '/min' },
        hour: { multiplier: 3600, suffix: '/hr' },
        day: { multiplier: 86400, suffix: '/day' },
    };

    const controller = createRateDisplayController({
        document: doc,
        getLastPlan: () => mockPlan,
        getPlanContext: () => ({ levelUp: true }),
        rateUnitSeconds,
        currencyLabels: { coins: 'Coins' },
        formatRate: n => String(n),
    });

    controller.updateRateDisplay(true);
    // 0.001 * 1 = 0.001 < 0.05 -> minute
    // 0.001 * 60 = 0.06 >= 0.05 -> stops at minute
    assert.equal(rateUnitSelect.value, 'minute');
});

test('rate-display-controller: updateRateUnitDisplays orchestrates sub-views', () => {
    let improvementsRendered = false;
    let seedTableRendered = false;
    let levelUpRendered = false;
    let productBreakdownRendered = false;

    const mockPlan = { success: true };
    const mockGoal = { success: true };

    const controller = createRateDisplayController({
        getLastPlan: () => mockPlan,
        getLastGoalResult: () => mockGoal,
        renderImprovements: () => { improvementsRendered = true; },
        renderSeedTable: () => { seedTableRendered = true; },
        renderLevelUp: () => { levelUpRendered = true; },
        renderProductBreakdown: () => { productBreakdownRendered = true; },
    });

    controller.updateRateUnitDisplays();
    assert.equal(improvementsRendered, true);
    assert.equal(seedTableRendered, true);
    assert.equal(levelUpRendered, true);
    assert.equal(productBreakdownRendered, true);
});
