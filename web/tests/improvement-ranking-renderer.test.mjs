import test from 'node:test';
import assert from 'node:assert/strict';
import { buildImprovementRankingMarkup } from '../improvement-ranking-renderer.js';

test('renders empty ranking status without details block', () => {
    assert.equal(buildImprovementRankingMarkup({ model: { total: 0, status: 'Nothing left.' }, open: false }), '<p class="hint">Nothing left.</p>');
});

test('renders grouped checking and completed outcomes while preserving open state', () => {
    const markup = buildImprovementRankingMarkup({
        open: true,
        model: {
            total: 3,
            status: 'Checking 2 of 3…',
            checkedGroups: [
                { kind: 'Aniimo', entries: [
                    { name: 'Earth Aniimo Lv.2–3', done: true, gain: { text: '+3' }, levelPrefix: 'Lv.3: ' },
                    { name: 'Water Aniimo', done: true, gain: null, levelPrefix: '' },
                ] },
                { kind: 'Recipes', entries: [{ name: 'Unlock Pie', done: false, gain: null, levelPrefix: '' }] },
            ],
            rows: [{ candidate: { label: 'Earth Aniimo Lv.3' }, gain: { text: '+3' } }],
        },
    });
    assert.match(markup, /<details class="explain improve-checked" open>/);
    assert.match(markup, /Checking 2 of 3/);
    assert.match(markup, /Lv\.3: \+3/);
    assert.match(markup, /no gain/);
    assert.match(markup, /checking…/);
    assert.match(markup, /<ol class="improve-list"><li><span class="improve-name">Earth Aniimo Lv\.3<\/span><span class="improve-gain">\+3<\/span><\/li><\/ol>/);
});

test('renders a closed explanation and omits best-results list when no gain rows exist', () => {
    const markup = buildImprovementRankingMarkup({
        model: { total: 1, status: 'No improvements found.', checkedGroups: [{ kind: 'Module', entries: [{ name: 'Module', done: true, gain: null, levelPrefix: '' }] }], rows: [] },
        open: false,
    });
    assert.match(markup, /<details class="explain improve-checked"><summary>/);
    assert.doesNotMatch(markup, /<ol class="improve-list">/);
});
