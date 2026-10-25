import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrategyUIController } from '../strategy-ui-controller.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        hidden: false,
        textContent: '',
        innerHTML: '',
        value: '',
        style: {},
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
        querySelector(selector) {
            return elements[selector] || null;
        },
    };
}

test('strategy-ui-controller: calculates levelUpTarget, cost, and unavailability', () => {
    let simpleMode = true;
    let homeLevel = 6;
    const levelUpCosts = {
        7: { coins: 1000, items: [['wood_block', 10]] },
        8: { coins: 2000, items: [] },
    };

    const targetSelect = createMockElement('level-up-target', { value: '8' });
    const doc = createMockDocument({ 'level-up-target': targetSelect });

    const controller = createStrategyUIController({
        document: doc,
        isSimpleMode: () => simpleMode,
        selectedHomeLevel: () => homeLevel,
        levelUpCosts,
        maxHomeLevel: 8,
    });

    // In simple mode, target is homeLevel + 1 = 7
    assert.equal(controller.levelUpTarget(), 7);
    assert.deepEqual(controller.levelUpCost(), levelUpCosts[7]);
    assert.equal(controller.levelUpUnavailable(), null);

    // In advanced mode, target comes from select element (8)
    simpleMode = false;
    assert.equal(controller.levelUpTarget(), 8);
    assert.deepEqual(controller.levelUpCost(), levelUpCosts[8]);
    assert.equal(controller.levelUpUnavailable(), null);

    // Exceed max home level
    targetSelect.value = '9';
    assert.equal(controller.levelUpTarget(), 9);
    assert.match(controller.levelUpUnavailable(), /top level/);
});

test('strategy-ui-controller: formats duration and perHour rates', () => {
    const controller = createStrategyUIController({
        formatNumber: n => n.toLocaleString('en-US'),
    });

    assert.equal(controller.formatDuration(50), '1m');
    assert.equal(controller.formatDuration(3600), '1h 0m');
    assert.equal(controller.formatDuration(3600 * 25), '1d 1h');

    assert.equal(controller.perHour(0.001), '3.6');
    assert.equal(controller.perHour(1), '3,600');
});

test('strategy-ui-controller: populateLevelUpTargets populates select element', () => {
    const targetSelect = createMockElement('level-up-target');
    const doc = createMockDocument({ 'level-up-target': targetSelect });
    const levelUpCosts = { 7: {}, 8: {}, 9: {} };

    const controller = createStrategyUIController({
        document: doc,
        levelUpCosts,
    });

    controller.populateLevelUpTargets();
    assert.match(targetSelect.innerHTML, /<option value="7">7<\/option>/);
    assert.match(targetSelect.innerHTML, /<option value="8">8<\/option>/);
    assert.match(targetSelect.innerHTML, /<option value="9">9<\/option>/);
});

test('strategy-ui-controller: renderStrategy switches between RV20 and level-up mode', () => {
    let seasonRendered = false;
    let prioritiesRendered = false;
    let isRV20 = false;

    const prioritiesSec = createMockElement('priorities-section', { hidden: true });
    const levelUpCard = createMockElement('.config-strategy-card');
    const levelUpConfig = createMockElement('level-up-config');
    const targetRow = createMockElement('level-up-target-row');
    const costEl = createMockElement('level-up-cost');
    const stockDetails = createMockElement('level-up-stock');
    const stockGrid = createMockElement('level-up-stock-grid');

    const doc = createMockDocument({
        'priorities-section': prioritiesSec,
        '.config-strategy-card': levelUpCard,
        'level-up-config': levelUpConfig,
        'level-up-target-row': targetRow,
        'level-up-cost': costEl,
        'level-up-stock': stockDetails,
        'level-up-stock-grid': stockGrid,
    });

    const controller = createStrategyUIController({
        document: doc,
        isRV20Endgame: () => isRV20,
        renderSeason: () => { seasonRendered = true; },
        renderPriorities: () => { prioritiesRendered = true; },
        isSimpleMode: () => false,
        selectedHomeLevel: () => 6,
        levelUpCosts: { 7: { coins: 100, items: [] } },
        buildLevelUpStrategyViewModel: () => ({
            costHtml: '<span>100 coins</span>',
            stockVisible: true,
            stockGridHtml: '<div>stock</div>',
        }),
    });

    // Sub-RV20: level-up mode
    controller.renderStrategy();
    assert.equal(seasonRendered, true);
    assert.equal(prioritiesSec.hidden, true);
    assert.equal(levelUpConfig.style.display, 'block');
    assert.equal(costEl.innerHTML, '<span>100 coins</span>');
    assert.equal(stockGrid.innerHTML, '<div>stock</div>');

    // RV20: endgame priorities mode
    isRV20 = true;
    controller.renderStrategy();
    assert.equal(prioritiesSec.hidden, false);
    assert.equal(prioritiesRendered, true);
    assert.equal(levelUpCard.style.display, 'none');
    assert.equal(levelUpConfig.style.display, 'none');
});

test('strategy-ui-controller: renderLevelUp manages card visibility and rate unit element', () => {
    const card = createMockElement('level-up-card');
    const select = createMockElement('rate-unit', { value: 'hour' });
    const rateBlock = createMockElement('rate-block');
    const rateLine = createMockElement('rate-line');
    const rateHead = createMockElement('level-up-rate-head');
    const labelElem = createMockElement('level-up-label');
    const timeElem = createMockElement('level-up-time');
    const linesElem = createMockElement('level-up-lines');

    const doc = createMockDocument({
        'level-up-card': card,
        'rate-unit': select,
        'rate-block': rateBlock,
        'rate-line': rateLine,
        'level-up-rate-head': rateHead,
        'level-up-label': labelElem,
        'level-up-time': timeElem,
        'level-up-lines': linesElem,
    });

    let mockViewModel = { visible: false };

    const controller = createStrategyUIController({
        document: doc,
        buildLevelUpViewModel: () => mockViewModel,
    });

    // Invisible plan
    controller.renderLevelUp({});
    assert.equal(card.style.display, 'none');

    // Visible plan with rateUnit in table
    mockViewModel = {
        visible: true,
        labelText: 'Next Level',
        timeText: '2h 15m',
        linesHtml: '<tr><td>Line</td></tr>',
        rateUnitInTable: true,
        rateBlockHidden: true,
    };
    controller.renderLevelUp({});
    assert.equal(card.style.display, 'block');
    assert.equal(labelElem.textContent, 'Next Level');
    assert.equal(timeElem.textContent, '2h 15m');
    assert.equal(linesElem.innerHTML, '<tr><td>Line</td></tr>');
    assert.equal(rateBlock.style.display, 'none');
    assert.ok(rateHead.children.includes(select));
});
