import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRecipeSkipViewModel } from '../recipe-skip-renderer.js';

const escapeText = value => String(value).replace(/[&<>\"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);

test('recipe skip view model reports enabled and skipped counts and sorts escaped chips without mutation', () => {
    const skippedRecipes = new Set(['z_recipe', 'a<recipe']);
    const recipeIndex = [
        { name: 'z_recipe', facility: 'Woodland' },
        { name: 'a<recipe', facility: 'Mine' },
    ];
    const before = [...skippedRecipes];
    const result = buildRecipeSkipViewModel({
        unlockedSpecial: new Set(['special_a', 'not_special']),
        specialNames: new Set(['special_a']),
        skippedRecipes,
        recipeIndex,
        prettyItem: name => name,
        escapeText,
    });

    assert.equal(result.countText, ' (1 on, 2 skipped)');
    assert.ok(result.chipsHtml.indexOf('a&lt;recipe') < result.chipsHtml.indexOf('z_recipe'));
    assert.match(result.chipsHtml, /data-unskip="a&lt;recipe"/);
    assert.match(result.chipsHtml, /skip-chip-facility">Mine/);
    assert.deepEqual([...skippedRecipes], before);
});

test('recipe skip view model clears the badge and chips when no special recipes are enabled or skipped', () => {
    const result = buildRecipeSkipViewModel({
        unlockedSpecial: new Set(['ordinary']),
        specialNames: new Set(['special']),
        skippedRecipes: new Set(),
        recipeIndex: [],
        prettyItem: String,
        escapeText,
    });
    assert.deepEqual(result, { countText: '', chipsHtml: '' });
});
