import test from 'node:test';
import assert from 'node:assert/strict';
import { createSeasonController } from '../season-controller.js';

function createHarness() {
    const state = { radish: 2, pepper: 2, dishes: new Set(['festival_soup']), available: true, active: true };
    const elements = new Map();
    const listeners = new Map();
    const makeElement = (name, initial = {}) => {
        const element = {
            style: {}, classList: { toggles: [], toggle(...args) { this.toggles.push(args); } },
            hidden: false, value: '', innerHTML: '', checked: false, ...initial,
            addEventListener(type, callback) { listeners.set(`${name}:${type}`, callback); },
        };
        elements.set(name, element);
        return element;
    };
    const seasonOn = makeElement('season-on', { checked: true });
    const radishInput = makeElement('season-radish-plots');
    const pepperInput = makeElement('season-pepper-plots');
    const summary = makeElement('season-plots-summary');
    const notes = makeElement('season-notes');
    const seasonSection = makeElement('season-section');
    const seasonConfig = makeElement('season-config');
    const divider = makeElement('divider');
    const buttons = [
        { dataset: { stepPlot: 'radish', stepDir: '1' }, addEventListener: (_type, callback) => listeners.set('step:radish', callback) },
        { dataset: { stepPlot: 'pepper', stepDir: '-1' }, addEventListener: (_type, callback) => listeners.set('step:pepper', callback) },
    ];
    const document = {
        getElementById: id => elements.get(id) || null,
        querySelector: selector => selector === '.custom-card-divider' ? divider : null,
        querySelectorAll: selector => selector === '[data-step-plot]' ? buttons : [],
    };
    const calls = { saves: 0, strategy: 0, countdown: 0, summary: 0 };
    const controller = createSeasonController({
        document,
        recipes: [{ name: 'festival_soup', points: 3, facility: 'Pot' }, { name: 'festival_tea', points: 2, facility: 'Kettle' }],
        getPlots: () => ({ radish: state.radish, pepper: state.pepper }),
        setPlot: (crop, value) => { state[crop] = value; },
        getSelectedDishes: () => state.dishes,
        setDishSelected: (name, selected) => selected ? state.dishes.add(name) : state.dishes.delete(name),
        isSeasonAvailable: () => state.available,
        isSeasonActive: () => state.available && state.active,
        getHomeLevel: () => 12,
        simpleSetup: () => ({ facilities: { Farmland: [{ count: 24 }] } }),
        getLanguage: () => 'en',
        updateTitleCountdown: () => { calls.countdown++; },
        renderItemIcon: name => `<i>${name}</i>`,
        getItemDisplayName: name => name.toUpperCase(),
        getFacilityDisplayName: name => name,
        renderStrategy: () => { calls.strategy++; },
        saveInputsToStorage: () => { calls.saves++; },
    });
    return { controller, state, elements, listeners, calls, seasonOn, notes, summary, radishInput, pepperInput, seasonSection, seasonConfig, divider };
}

test('season controller renders availability, config, plot summary, and selected dish cards', () => {
    const h = createHarness();
    h.controller.render();
    assert.equal(h.seasonSection.hidden, false);
    assert.equal(h.seasonConfig.hidden, false);
    assert.equal(h.radishInput.value, 2);
    assert.equal(h.pepperInput.value, 2);
    assert.match(h.summary.innerHTML, /Dedicated <strong>4 plots<\/strong>/);
    assert.match(h.notes.innerHTML, /festival_soup/);
    assert.match(h.notes.innerHTML, /checked/);
    assert.match(h.notes.innerHTML, /festival_tea/);
    assert.equal(h.calls.countdown, 1);

    h.state.available = false;
    h.controller.render();
    assert.equal(h.seasonSection.hidden, true);
    assert.equal(h.divider.style.display, 'none');
    assert.equal(h.seasonConfig.hidden, true);
});

test('season handlers clamp plots, persist edits, update selected dishes, and rerender strategy on toggle', () => {
    const h = createHarness();
    h.controller.attachHandlers();
    h.listeners.get('step:radish')();
    h.listeners.get('step:pepper')();
    assert.deepEqual([h.state.radish, h.state.pepper], [3, 1]);

    h.radishInput.value = '99';
    h.pepperInput.value = '-5';
    h.listeners.get('season-radish-plots:input')({ target: h.radishInput });
    h.listeners.get('season-pepper-plots:input')({ target: h.pepperInput });
    assert.deepEqual([h.state.radish, h.state.pepper], [10, 0]);
    assert.deepEqual([h.radishInput.value, h.pepperInput.value], [10, 0]);

    h.listeners.get('season-notes:change')({ target: {
        dataset: { seasonDish: 'festival_tea' }, checked: true,
        closest: () => ({ classList: { toggle: (...args) => { h.cardToggle = args; } } }),
    } });
    assert.equal(h.state.dishes.has('festival_tea'), true);
    assert.deepEqual(h.cardToggle, ['active', true]);

    h.listeners.get('season-on:change')();
    assert.equal(h.calls.strategy, 1);
    assert.equal(h.calls.saves, 6);
});
