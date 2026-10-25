import test from 'node:test';
import assert from 'node:assert/strict';
import { createStrategyFormController } from '../strategy-form-controller.js';

function harness() {
    const elements = new Map();
    for (const id of ['strategy-level-up', 'strategy-priorities', 'level-up-target', 'level-up-stock-grid']) {
        elements.set(id, { listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } });
    }
    const calls = { render: 0, save: 0, solve: 0, chosen: 0, stock: [] };
    const controller = createStrategyFormController({
        document: { getElementById: id => elements.get(id) },
        renderStrategy: () => { calls.render++; },
        setLevelUpTargetChosen: () => { calls.chosen++; },
        setStock: (name, amount) => calls.stock.push([name, amount]),
        floatOrDefault: (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback,
        save: () => { calls.save++; },
        runFindPlan: () => { calls.solve++; },
    });
    controller.attach();
    return { elements, calls };
}

test('strategy selectors rerender and target selection records explicit choice', () => {
    const { elements, calls } = harness();
    elements.get('strategy-level-up').listeners.change();
    elements.get('strategy-priorities').listeners.change();
    elements.get('level-up-target').listeners.change();
    assert.equal(calls.render, 3);
    assert.equal(calls.chosen, 1);
});

test('stock inputs clamp values, persist, and Enter requests a plan only for inputs', () => {
    const { elements, calls } = harness();
    const grid = elements.get('level-up-stock-grid');
    grid.listeners.input({ target: { dataset: { stock: 'wood' }, value: '-3' } });
    grid.listeners.input({ target: { dataset: { stock: 'coins' }, value: 'invalid' } });
    grid.listeners.input({ target: { dataset: {}, value: '20' } });
    assert.deepEqual(calls.stock, [['wood', 0], ['coins', 0]]);
    assert.equal(calls.save, 2);
    grid.listeners.keypress({ key: 'Enter', target: { matches: selector => selector === 'input' } });
    grid.listeners.keypress({ key: 'Enter', target: { matches: () => false } });
    grid.listeners.keypress({ key: 'Escape', target: { matches: () => true } });
    assert.equal(calls.solve, 1);
});

test('supports missing optional strategy controls', () => {
    const controller = createStrategyFormController({
        document: { getElementById: () => null }, renderStrategy() {}, setLevelUpTargetChosen() {},
        setStock() {}, floatOrDefault: Number, save() {}, runFindPlan() {},
    });
    assert.doesNotThrow(() => controller.attach());
});
