import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSpecialRecipeViewModel } from '../special-recipe-renderer.js';

const options = {
    recipes: [
        { name: 'rare_dish', facility: 'Crafting Table', unlockRV: 12 },
        { name: 'common_dish', facility: 'Simmering Pot' },
    ],
    selectedNames: new Set(['rare_dish', 'common_dish']),
    currentRv: 10,
    selectedPlanNames: [],
    planSucceeded: false,
    isVietnamese: false,
    getItemDisplayName: name => `Item ${name}`,
    getFacilityDisplayName: name => `Facility ${name}`,
    renderItemIcon: name => `<i data-item="${name}"></i>`,
    renderFacilityIcon: name => `<i data-facility="${name}"></i>`,
};

test('special recipe renderer marks locked cards and reports checked locked selections for controller cleanup', () => {
    const before = [...options.selectedNames];
    const result = buildSpecialRecipeViewModel(options);
    assert.match(result.html, /special-recipe-card  locked/);
    assert.match(result.html, /special-recipe-card active /);
    assert.match(result.html, /disabled/);
    assert.deepEqual(result.lockedSelections, ['rare_dish']);
    assert.deepEqual([...options.selectedNames], before);
});

test('special recipe renderer shows selected-in-plan and selected-but-not-used statuses', () => {
    const result = buildSpecialRecipeViewModel({
        ...options,
        currentRv: 20,
        selectedPlanNames: ['rare_dish'],
        planSucceeded: true,
    });
    assert.match(result.html, /✓ In Plan/);
    assert.match(result.html, /\(Not selected\)/);
    assert.doesNotMatch(result.html, /locked/);
});

test('special recipe renderer localizes unlock and usage badges', () => {
    const result = buildSpecialRecipeViewModel({
        ...options,
        selectedNames: new Set(['rare_dish']),
        currentRv: 20,
        selectedPlanNames: ['rare_dish'],
        isVietnamese: true,
    });
    assert.match(result.html, /Mở khóa tại RV 12/);
    assert.match(result.html, /✓ Đã dùng/);
});
