import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeTableRenderer } from '../recipe-table-renderer.js';

function createRenderer(language = 'en') {
    return createRecipeTableRenderer({
        facilities: [
            { name: 'Pot', category: 'Processing', personality: 'Practical' },
            { name: 'Kettle', category: 'Processing' },
        ],
        facilityCategories: ['Processing', 'Empty'],
        specialNames: new Set(['rare_pie']),
        seasonName: 'Harvest Moon Festival',
        getLanguage: () => language,
        getI18n: () => null,
        prettyItem: name => name.replaceAll('_', ' '),
        escapeText: value => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
        getFacilityDisplayName: name => name,
        formatNumber: value => String(value),
        abilityTag: ability => `<b>${ability}</b>`,
        bestAniimoLevel: () => 4,
    });
}

test('recipe renderer groups by category/facility and sorts recipes by level then name', () => {
    const renderer = createRenderer();
    const recipes = [
        { name: 'z_recipe', facility: 'Pot', facility_level: 2, raw_materials: ['rice'], required_amount: [2], yield_amount: 3, production_time: 60, sell_value: 10 },
        { name: 'a_recipe', facility: 'Pot', facility_level: 1, raw_materials: ['wheat'], required_amount: [1], yield_amount: 1, production_time: 15, sell_value: 5 },
        { name: 'ignored', facility: 'Unknown', facility_level: 1, yield_amount: 1 },
    ];
    const originalOrder = recipes.map(recipe => recipe.name);
    const html = renderer.render(recipes);
    assert.match(html, /Processing/);
    assert.match(html, /2× rice/);
    assert.ok(html.indexOf('a recipe') < html.indexOf('z recipe'));
    assert.doesNotMatch(html, /ignored/);
    assert.doesNotMatch(html, /class="facility-category-title">Empty/);
    assert.deepEqual(recipes.map(recipe => recipe.name), originalOrder);
});

test('recipe renderer preserves localized labels, tags, tooltips, and Aniimo job rows', () => {
    const html = createRenderer('vi').render([
        {
            name: 'rare_pie', facility: 'Pot', facility_level: 1, cost: 3, yield_amount: 2,
            byproduct: ['wood_block', 1], workload: 4, emode_base_time: 12,
            sell_currency: 'none', module_requirement: ['kitchen_module', 2],
            jobs: [['Watering', 'Water', 1], ['Watering', 'Water', 1]], verified: false, season: true,
        },
    ]);
    assert.match(html, /Vật phẩm/);
    assert.match(html, /Nguyên liệu/);
    assert.match(html, /Chi phí hạt: 3 Xu Gia Viên/);
    assert.match(html, /\+1 wood block/);
    assert.match(html, /Tưới nước &times;2/);
    assert.match(html, /Nâng cấp RV/);
    assert.match(html, /Kitchen Module Lv\.2/);
    assert.match(html, /mùa vụ/);
    assert.match(html, /đặc biệt/);
    assert.match(html, /Chế độ điện/);
});
