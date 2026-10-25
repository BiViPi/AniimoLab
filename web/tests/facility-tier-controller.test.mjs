import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilityTierController } from '../facility-tier-controller.js';

function fakeElement(properties = {}) {
    const listeners = new Map();
    return {
        value: '',
        dataset: {},
        classList: { contains: () => false },
        addEventListener(type, handler) { listeners.set(type, handler); },
        dispatch(type, event = {}) { listeners.get(type)?.({ target: this, ...event }); },
        ...properties,
    };
}

test('tier controller updates count and level inputs and persists each edit', () => {
    const grid = fakeElement();
    const tiers = { Mine: [{ count: 1, level: 2 }] };
    let saves = 0;
    const controller = createFacilityTierController({
        document: { getElementById: id => id === 'facilities-grid' ? grid : null },
        getFacilityTiers: () => tiers,
        renderTierRows() {},
        saveInputsToStorage: () => { saves++; },
        runFindPlan() {},
        numberOrDefault: (value, fallback) => Number.isNaN(Number.parseInt(value, 10)) ? fallback : Number.parseInt(value, 10),
    });
    controller.attach();
    const container = { dataset: { facility: 'Mine' } };
    const row = { dataset: { tierIndex: '0' } };
    const input = fakeElement({
        value: '4', classList: { contains: name => name === 'tier-count' },
        closest: selector => selector === '.tier-row' ? row : selector === '.facility-tiers' ? container : null,
    });
    grid.dispatch('input', { target: input });
    input.value = '5';
    input.classList = { contains: name => name === 'tier-level' };
    grid.dispatch('input', { target: input });

    assert.deepEqual(tiers.Mine, [{ count: 4, level: 5 }]);
    assert.equal(saves, 2);
});

test('tier controller adds next level capped at ten and removes selected tier', () => {
    const grid = fakeElement();
    const tiers = { Mine: [{ count: 1, level: 10 }, { count: 1, level: 8 }] };
    const rendered = [];
    let saves = 0;
    const controller = createFacilityTierController({
        document: { getElementById: id => id === 'facilities-grid' ? grid : null },
        getFacilityTiers: () => tiers,
        renderTierRows: name => rendered.push(name),
        saveInputsToStorage: () => { saves++; },
        runFindPlan() {},
        numberOrDefault: Number,
    });
    controller.attach();
    grid.dispatch('click', { target: { closest: selector => selector === '.add-tier-btn' ? { dataset: { facility: 'Mine' } } : null } });
    assert.deepEqual(tiers.Mine[2], { count: 1, level: 10 });
    assert.equal(rendered.at(-1), 'Mine');

    const container = { dataset: { facility: 'Mine' } };
    const row = { dataset: { tierIndex: '1' }, closest: selector => selector === '.facility-tiers' ? container : null };
    const remove = { closest: selector => selector === '.tier-row' ? row : selector === '.facility-tiers' ? container : null };
    grid.dispatch('click', { target: { closest: selector => selector === '.add-tier-btn' ? null : selector === '.tier-remove-btn' ? remove : null } });
    assert.deepEqual(tiers.Mine, [{ count: 1, level: 10 }, { count: 1, level: 10 }]);
    assert.equal(rendered.length, 2);
    assert.equal(saves, 2);
});

test('tier controller runs a plan when Enter is pressed in a tier input', () => {
    const grid = fakeElement();
    let runs = 0;
    const controller = createFacilityTierController({
        document: { getElementById: id => id === 'facilities-grid' ? grid : null },
        getFacilityTiers: () => ({}), renderTierRows() {}, saveInputsToStorage() {},
        runFindPlan: () => { runs++; }, numberOrDefault: Number,
    });
    controller.attach();
    const target = { matches: selector => selector === 'input' };
    let prevented = false;
    grid.dispatch('keypress', { target, key: 'Enter', preventDefault: () => { prevented = true; } });
    assert.equal(runs, 1);
    assert.equal(prevented, false);
});
