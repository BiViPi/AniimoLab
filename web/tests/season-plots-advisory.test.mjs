import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeasonPlotsAdvisoryController } from '../season-plots-advisory.js';

function createMockElement(id, value = '') {
    return {
        id,
        value,
        innerHTML: '',
        style: { display: '' },
    };
}

function createMockDocument(elements) {
    return {
        getElementById: (id) => elements[id] || null,
    };
}

test('season-plots-advisory: hides banner when season is inactive or plan is unsuccessful', () => {
    const banner = createMockElement('plots-optimization-banner');
    const doc = createMockDocument({ 'plots-optimization-banner': banner });

    const controller = createSeasonPlotsAdvisoryController({
        document: doc,
        window: {},
        seasonActive: () => false,
        getRadishPlots: () => 5,
        getPepperPlots: () => 5,
        setRadishPlots: () => {},
        setPepperPlots: () => {},
        selectOptimalSeasonDishes: () => [],
        calculateOptimalSeasonPlots: () => ({ radish: 0, pepper: 0, dishNames: [] }),
        selectedHomeLevel: () => 18,
        saveInputsToStorage: () => {},
        runFindPlan: () => {},
        getLanguage: () => 'vi',
    });

    controller.evaluate({ success: true });
    assert.equal(banner.style.display, 'none');

    controller.evaluate(null);
    assert.equal(banner.style.display, 'none');
});

test('season-plots-advisory: warns when plots are set without festival recipes', () => {
    const banner = createMockElement('plots-optimization-banner');
    const doc = createMockDocument({ 'plots-optimization-banner': banner });

    const controller = createSeasonPlotsAdvisoryController({
        document: doc,
        window: {},
        seasonActive: () => true,
        getRadishPlots: () => 3,
        getPepperPlots: () => 2,
        setRadishPlots: () => {},
        setPepperPlots: () => {},
        selectOptimalSeasonDishes: () => [],
        calculateOptimalSeasonPlots: () => ({ radish: 0, pepper: 0, dishNames: [] }),
        selectedHomeLevel: () => 18,
        saveInputsToStorage: () => {},
        runFindPlan: () => {},
        getLanguage: () => 'vi',
    });

    controller.evaluate({ success: true, rate_per_second: 10 });
    assert.equal(banner.style.display, 'flex');
    assert.match(banner.innerHTML, /Chưa chọn món chế biến Lễ hội/);
    assert.match(banner.innerHTML, /Chuyển về 0 ô đất/);
});

test('season-plots-advisory: recommends sweet spot when plots deviate significantly', () => {
    const banner = createMockElement('plots-optimization-banner');
    const doc = createMockDocument({ 'plots-optimization-banner': banner });

    const controller = createSeasonPlotsAdvisoryController({
        document: doc,
        window: {},
        seasonActive: () => true,
        getRadishPlots: () => 8,
        getPepperPlots: () => 8,
        setRadishPlots: () => {},
        setPepperPlots: () => {},
        selectOptimalSeasonDishes: () => [{ name: 'dish_1' }],
        calculateOptimalSeasonPlots: () => ({ radish: 4, pepper: 4, dishNames: ['Mâm cỗ'] }),
        selectedHomeLevel: () => 18,
        saveInputsToStorage: () => {},
        runFindPlan: () => {},
        getLanguage: () => 'vi',
    });

    controller.evaluate({ success: true, rate_per_second: 50 });
    assert.equal(banner.style.display, 'flex');
    assert.match(banner.innerHTML, /Đề xuất Cân bằng Ô đất Tối ưu/);
    assert.match(banner.innerHTML, /Áp dụng ngay: 4 Củ cải &amp; 4 Ớt|Áp dụng ngay: 4 Củ cải & 4 Ớt/);
});

test('season-plots-advisory: apply updates inputs, state, saves and replans', () => {
    const radishInput = createMockElement('season-radish-plots', '5');
    const pepperInput = createMockElement('season-pepper-plots', '5');
    const doc = createMockDocument({
        'season-radish-plots': radishInput,
        'season-pepper-plots': pepperInput,
    });
    const win = {};

    let saved = false;
    let replanned = false;
    let curR = 5;
    let curP = 5;

    const controller = createSeasonPlotsAdvisoryController({
        document: doc,
        window: win,
        seasonActive: () => true,
        getRadishPlots: () => curR,
        getPepperPlots: () => curP,
        setRadishPlots: (v) => { curR = v; },
        setPepperPlots: (v) => { curP = v; },
        selectOptimalSeasonDishes: () => [],
        calculateOptimalSeasonPlots: () => ({ radish: 0, pepper: 0, dishNames: [] }),
        selectedHomeLevel: () => 18,
        saveInputsToStorage: () => { saved = true; },
        runFindPlan: () => { replanned = true; },
        getLanguage: () => 'vi',
    });

    controller.attachGlobal();
    assert.equal(typeof win.applyOptimalPlots, 'function');

    win.applyOptimalPlots(2, 3);
    assert.equal(radishInput.value, 2);
    assert.equal(pepperInput.value, 3);
    assert.equal(curR, 2);
    assert.equal(curP, 3);
    assert.equal(saved, true);
    assert.equal(replanned, true);
});
