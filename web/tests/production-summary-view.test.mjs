import test from 'node:test';
import assert from 'node:assert/strict';
import { createProductionSummaryViewController } from '../production-summary-view.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        textContent: '',
        style: {},
        hidden: false,
        value: 'hour',
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

test('production-summary-view: renderSeedTable handles visible and hidden states', () => {
    const seedCard = createMockElement('seed-card');
    const unitElem = createMockElement('seed-card-unit');
    const tableElem = createMockElement('seed-table');
    const rateUnitSelect = createMockElement('rate-unit', { value: 'day' });

    const doc = createMockDocument({
        'seed-card': seedCard,
        'seed-card-unit': unitElem,
        'seed-table': tableElem,
        'rate-unit': rateUnitSelect,
    });

    let mockView = { visible: false };
    const controller = createProductionSummaryViewController({
        document: doc,
        buildSeedTableViewModel: () => mockView,
    });

    // Hidden
    controller.renderSeedTable({});
    assert.equal(seedCard.style.display, 'none');

    // Visible
    mockView = {
        visible: true,
        unitText: 'per Day',
        html: '<tr><td>Seeds</td></tr>',
    };
    controller.renderSeedTable({});
    assert.equal(seedCard.style.display, 'flex');
    assert.equal(unitElem.textContent, 'per Day');
    assert.equal(tableElem.innerHTML, '<tr><td>Seeds</td></tr>');
});

test('production-summary-view: renderProfitBreakdown handles visible and hidden states', () => {
    const profitCard = createMockElement('profit-card');
    const breakdownElem = createMockElement('profit-breakdown');

    const doc = createMockDocument({
        'profit-card': profitCard,
        'profit-breakdown': breakdownElem,
    });

    let mockView = { visible: false };
    const controller = createProductionSummaryViewController({
        document: doc,
        buildProfitBreakdownViewModel: () => mockView,
    });

    // Hidden
    controller.renderProfitBreakdown({});
    assert.equal(profitCard.style.display, 'none');

    // Visible
    mockView = {
        visible: true,
        html: '<div>Profits</div>',
    };
    controller.renderProfitBreakdown({});
    assert.equal(profitCard.style.display, 'block');
    assert.equal(breakdownElem.innerHTML, '<div>Profits</div>');
});

test('production-summary-view: renderProductBreakdown updates headers and body', () => {
    const section = createMockElement('product-breakdown-section');
    const rateHeader = createMockElement('product-breakdown-rate-header');
    const pointsHeader = createMockElement('product-breakdown-points-header');
    const tbody = createMockElement('product-breakdown-tbody');
    const rateUnitSelect = createMockElement('rate-unit', { value: 'hour' });

    const doc = createMockDocument({
        'product-breakdown-section': section,
        'product-breakdown-rate-header': rateHeader,
        'product-breakdown-points-header': pointsHeader,
        'product-breakdown-tbody': tbody,
        'rate-unit': rateUnitSelect,
    });

    let mockRendered = { visible: false };
    const controller = createProductionSummaryViewController({
        document: doc,
        renderProductBreakdownMarkup: () => mockRendered,
    });

    // Hidden
    controller.renderProductBreakdown({});
    assert.equal(section.style.display, 'none');

    // Visible
    mockRendered = {
        visible: true,
        rateHeaderHtml: 'Profit / hr',
        pointsHidden: true,
        rowsHtml: '<tr><td>Product</td></tr>',
    };
    controller.renderProductBreakdown({});
    assert.equal(section.style.display, 'block');
    assert.equal(rateHeader.innerHTML, 'Profit / hr');
    assert.equal(pointsHeader.hidden, true);
    assert.equal(tbody.innerHTML, '<tr><td>Product</td></tr>');
});

test('production-summary-view: renderSeedsNeeded updates body and visibility', () => {
    const section = createMockElement('seeds-needed-section');
    const tbody = createMockElement('seeds-needed-tbody');

    const doc = createMockDocument({
        'seeds-needed-section': section,
        'seeds-needed-tbody': tbody,
    });

    let mockRendered = { visible: false };
    const controller = createProductionSummaryViewController({
        document: doc,
        renderSeedRequirements: () => mockRendered,
    });

    // Hidden
    controller.renderSeedsNeeded({});
    assert.equal(section.style.display, 'none');

    // Visible
    mockRendered = {
        visible: true,
        rowsHtml: '<tr><td>10 Seeds</td></tr>',
    };
    controller.renderSeedsNeeded({});
    assert.equal(section.style.display, 'block');
    assert.equal(tbody.innerHTML, '<tr><td>10 Seeds</td></tr>');
});
