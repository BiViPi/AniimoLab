import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeSearchController, normalizeRecipeSearchText } from '../recipe-search-controller.js';

function row(searchText) { return { dataset: { searchText }, hidden: false }; }
function table(...rows) { return { hidden: false, rows, querySelectorAll: selector => selector === '.facility-recipe-row' ? rows : [] }; }
function category(...tables) { return { hidden: false, tables, querySelector: selector => selector === '.facility-recipe-table:not([hidden])' ? tables.find(item => !item.hidden) || null : null }; }
function harness({ query = '', lang = 'en' } = {}) {
    const first = table(row('Crème brûlée'), row('Jam')); const second = table(row('Rice flour'));
    const categories = [category(first), category(second)];
    const input = { value: query, listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } };
    const empty = { hidden: false, textContent: '' };
    const container = { querySelectorAll: selector => selector === '.facility-recipe-table' ? [first, second] : selector === '.facility-category' ? categories : [] };
    const elements = { 'facilities-recipe-search': input, 'facilities-modal-container': container, 'facilities-search-empty': empty };
    const controller = createRecipeSearchController({ document: { getElementById: id => elements[id] || null }, getLanguage: () => lang });
    return { controller, first, second, categories, input, empty };
}

test('normalizes accents and case for locale-independent recipe matching', () => {
    assert.equal(normalizeRecipeSearchText('Crème BRÛLÉE'), 'creme brulee');
});

test('filters rows, tables and categories using accent-insensitive query', () => {
    const { controller, first, second, categories, empty } = harness({ query: 'creme' });
    controller.filter();
    assert.deepEqual(first.rows.map(item => item.hidden), [false, true]);
    assert.equal(first.hidden, false);
    assert.equal(second.hidden, true);
    assert.deepEqual(categories.map(item => item.hidden), [false, true]);
    assert.equal(empty.hidden, true);
    assert.equal(empty.textContent, 'No matching recipes found.');
});

test('clears filter and shows localized empty-result guidance', () => {
    const { controller, first, second, categories, input, empty } = harness({ query: 'no-such-recipe', lang: 'vi' });
    controller.filter();
    assert.equal(first.hidden, true);
    assert.equal(second.hidden, true);
    assert.deepEqual(categories.map(item => item.hidden), [true, true]);
    assert.equal(empty.hidden, false);
    assert.equal(empty.textContent, 'Không tìm thấy công thức phù hợp.');
    input.value = '';
    controller.filter();
    assert.deepEqual([first.hidden, second.hidden, empty.hidden, empty.textContent], [false, false, true, '']);
});

test('attaches one input listener and tolerates missing optional search UI', () => {
    const { controller, input } = harness();
    controller.attach();
    assert.equal(typeof input.listeners.input, 'function');
    const missing = createRecipeSearchController({ document: { getElementById: () => null }, getLanguage: () => 'en' });
    assert.doesNotThrow(() => missing.attach());
    assert.doesNotThrow(() => missing.filter());
});
