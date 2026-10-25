import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpecialRecipeController } from '../special-recipe-controller.js';

test('tracks special recipe checkbox selection, card styling, count and persistence', () => {
    const listeners = {};
    const grid = { addEventListener: (type, handler) => { listeners[type] = handler; } };
    const selected = new Set();
    const calls = { count: 0, save: 0, active: [] };
    createSpecialRecipeController({
        grid, selectedNames: selected,
        renderRecipeCount: () => { calls.count++; },
        save: () => { calls.save++; },
    }).attach();
    const card = { classList: { toggle: (...args) => calls.active.push(args) } };
    listeners.change({ target: { dataset: { special: 'recipe_a' }, checked: true, closest: () => card } });
    assert.equal(selected.has('recipe_a'), true);
    listeners.change({ target: { dataset: { special: 'recipe_a' }, checked: false, closest: () => card } });
    assert.equal(selected.has('recipe_a'), false);
    listeners.change({ target: { dataset: {}, checked: true, closest: () => card } });
    assert.equal(calls.count, 2);
    assert.equal(calls.save, 2);
    assert.deepEqual(calls.active, [['active', true], ['active', false]]);
});

test('does not attach when the special recipe grid is absent', () => {
    const controller = createSpecialRecipeController({ grid: null, selectedNames: new Set(), renderRecipeCount() {}, save() {} });
    assert.doesNotThrow(() => controller.attach());
});
