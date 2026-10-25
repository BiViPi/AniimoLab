import test from 'node:test';
import assert from 'node:assert/strict';
import { createPriorityController } from '../priority-controller.js';

function setup(order) {
    const listeners = {};
    const focused = [];
    const list = {
        addEventListener(type, handler) { listeners[type] = handler; },
        querySelector(selector) { return { focus: () => focused.push(selector) }; },
        querySelectorAll() { return [{ classList: { remove() {} } }]; },
    };
    let renders = 0;
    let saves = 0;
    const controller = createPriorityController({
        list,
        getPriorityOrder: () => order,
        render: () => { renders++; },
        save: () => { saves++; },
    });
    controller.attach();
    return { listeners, focused, order, get renders() { return renders; }, get saves() { return saves; } };
}

test('toggles priorities and moves them while persisting rendered state', () => {
    const state = setup([{ target: 'a', on: false }, { target: 'b', on: false }]);
    state.listeners.change({ target: { dataset: { toggle: '1' }, checked: true } });
    assert.equal(state.order[1].on, true);
    const button = { dataset: { move: '1', to: '0', by: '-1' } };
    state.listeners.click({ target: { closest: () => button } });
    assert.deepEqual(state.order.map(item => item.target), ['b', 'a']);
    assert.deepEqual(state.focused, ['[data-move="0"][data-by="-1"]']);
    assert.equal(state.renders, 2);
    assert.equal(state.saves, 2);
});

test('drag/drop reorders once, clears transient state, and dragend rerenders', () => {
    const state = setup([{ target: 'a' }, { target: 'b' }, { target: 'c' }]);
    let stored;
    const source = { dataset: { index: '0' }, classList: { add: value => { stored = value; } } };
    state.listeners.dragstart({ target: { closest: () => source }, dataTransfer: { setData(type, value) { stored += `${type}:${value}`; }, set effectAllowed(value) { stored += value; } } });
    assert.match(stored, /dragging/);
    const over = { dataset: { index: '2' }, classList: { add() {} } };
    let prevented = 0;
    state.listeners.dragover({ target: { closest: () => over }, preventDefault() { prevented++; } });
    assert.equal(prevented, 1);
    state.listeners.drop({ target: { closest: () => over }, preventDefault() {} });
    assert.deepEqual(state.order.map(item => item.target), ['b', 'c', 'a']);
    assert.equal(state.saves, 1);
    state.listeners.dragend();
    assert.equal(state.renders, 2);
});

test('ignores malformed toggles, absent drag targets and invalid move positions', () => {
    const state = setup([{ target: 'a', on: false }]);
    state.listeners.change({ target: { dataset: { toggle: '3' }, checked: true } });
    state.listeners.click({ target: { closest: () => null } });
    state.listeners.dragstart({ target: { closest: () => null }, dataTransfer: { setData() {} } });
    state.listeners.dragover({ target: { closest: () => null }, preventDefault() {} });
    state.listeners.drop({ target: { closest: () => null }, preventDefault() {} });
    assert.deepEqual(state.order, [{ target: 'a', on: false }]);
    assert.equal(state.saves, 0);
});
