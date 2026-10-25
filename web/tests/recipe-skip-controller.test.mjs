import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeSkipController } from '../recipe-skip-controller.js';

function harness() {
    const elements = new Map();
    const makeElement = () => ({
        listeners: {},
        addEventListener(type, handler) { this.listeners[type] = handler; },
        fire(type, event = {}) { this.listeners[type]?.({ target: this, preventDefault() {}, ...event }); },
    });
    for (const id of ['skip-add-btn', 'skip-input', 'skip-chips', 'facility-plan-container']) elements.set(id, makeElement());
    const input = elements.get('skip-input');
    input.value = '';
    input.validityMessage = '';
    input.reported = 0;
    input.setCustomValidity = message => { input.validityMessage = message; };
    input.reportValidity = () => { input.reported++; };
    return { elements, input };
}

const recipes = [
    { name: 'rice_drink', facility: 'Mill' },
    { name: 'rice_flour', facility: 'Mill' },
    { name: 'berry_juice', facility: 'Juicer' },
];
const label = recipe => `${recipe.name.replaceAll('_', ' ')} (${recipe.facility})`;

test('adds exact or unique partial recipe matches and clears validation state', () => {
    const { elements, input } = harness();
    const skipped = [];
    const controller = createRecipeSkipController({
        document: { getElementById: id => elements.get(id) },
        getRecipeIndex: () => recipes,
        recipeLabel: label,
        setSkipped: (name, value) => skipped.push([name, value]),
        runFindPlan() {},
    });
    controller.attach();
    input.value = 'BERRY JUICE';
    elements.get('skip-add-btn').fire('click');
    assert.deepEqual(skipped, [['berry_juice', true]]);
    assert.equal(input.value, '');
    assert.equal(input.validityMessage, '');

    input.value = 'berry';
    input.fire('keydown', { key: 'Enter' });
    assert.deepEqual(skipped, [['berry_juice', true], ['berry_juice', true]]);
});

test('rejects empty/ambiguous input and clears custom validity while editing', () => {
    const { elements, input } = harness();
    const skipped = [];
    createRecipeSkipController({
        document: { getElementById: id => elements.get(id) }, getRecipeIndex: () => recipes,
        recipeLabel: label, setSkipped: (...args) => skipped.push(args), runFindPlan() {},
    }).attach();
    input.value = 'rice';
    elements.get('skip-add-btn').fire('click');
    assert.equal(input.validityMessage, 'Pick a recipe from the list.');
    assert.equal(input.reported, 1);
    assert.deepEqual(skipped, []);
    input.value = '   ';
    input.fire('keydown', { key: 'Enter' });
    assert.equal(input.reported, 1);
    input.fire('input');
    assert.equal(input.validityMessage, '');
});

test('unskips chips and skips plan rows with a fresh solve', () => {
    const { elements } = harness();
    const skipped = [];
    let solves = 0;
    createRecipeSkipController({
        document: { getElementById: id => elements.get(id) }, getRecipeIndex: () => recipes,
        recipeLabel: label, setSkipped: (...args) => skipped.push(args), runFindPlan: () => { solves++; },
    }).attach();
    elements.get('skip-chips').fire('click', { target: { closest: () => ({ dataset: { unskip: 'rice_drink' } }) } });
    elements.get('facility-plan-container').fire('click', { target: { closest: () => ({ dataset: { skip: 'berry_juice' } }) } });
    assert.deepEqual(skipped, [['rice_drink', false], ['berry_juice', true]]);
    assert.equal(solves, 1);
});
