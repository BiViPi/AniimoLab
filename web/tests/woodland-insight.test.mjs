import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWoodlandInsight } from '../woodland-insight.js';

const options = overrides => ({
    plan: { coin_items: [], level_up: null },
    planContext: null,
    homeLevel: 14,
    isVi: false,
    woodlandTier: 4,
    levelUpCosts: {},
    producing: [],
    prettyItem: item => `item:${item}`,
    perHour: rate => String(rate * 3600),
    formatDuration: seconds => `${seconds}s`,
    formatNumber: value => String(value),
    ...overrides,
});

test('builds tiered Woodland yield, target wood rate, and level-up card', () => {
    const result = buildWoodlandInsight(options({
        plan: {
            coin_items: [],
            level_up: { seconds: 3600, requirements: [{ name: 'standard_planks', per_second: 0.5 }] },
        },
        planContext: { levelUp: true, target: 15 },
        levelUpCosts: { 15: { items: [['standard_planks', 120]] } },
        producing: [
            { facility: 'Woodland', item_name: 'willow', facility_count: 2 },
            { facility: 'Woodland', item_name: 'bamboo' },
            { facility: 'Farmland', item_name: 'corn', facility_count: 4 },
        ],
    }));

    assert.equal(result.hasLevelUp, true);
    assert.equal(result.targetRv, 15);
    assert.equal(result.targetWoodItemName, 'item:standard_planks');
    assert.equal(result.woodlandSummary, '2 cây item:willow, 1 cây item:bamboo');
    assert.equal(result.totalTrees, 3);
    assert.equal(result.maxYieldPerTree, 47);
    assert.equal(result.lowerTierMaxYield, 21);
    assert.equal(result.totalHourlyWood, 282);
    assert.equal(result.woodItemHourly, '1800');
    assert.match(result.cardHtml, /RV 15 Progression & Woodland/);
    assert.match(result.cardHtml, /282 blocks\/hr/);
    assert.match(result.cardHtml, /1800 item:standard_planks \/ giờ/);
});

test('keeps Woodland metadata when no level-up card applies and uses top-tier fallback copy', () => {
    const result = buildWoodlandInsight(options({
        woodlandTier: 1,
        producing: [{ facility: 'Woodland', item_name: 'willow', facility_count: 2 }],
    }));
    assert.equal(result.hasLevelUp, false);
    assert.equal(result.cardHtml, '');
    assert.equal(result.hasWoodland, true);
    assert.equal(result.totalTrees, 2);
    assert.equal(result.maxYieldPerTree, 1);
    assert.equal(result.lowerTierMaxYield, 1);
    assert.equal(result.lowerTierTreesExampleEn, 'Willow, Bamboo');
});

test('localizes level-up card and chooses the target wood item from the RV cost list', () => {
    const result = buildWoodlandInsight(options({
        plan: { coin_items: [], level_up: { seconds: 120, requirements: [] } },
        planContext: { levelUp: true, target: 18 },
        isVi: true,
        woodlandTier: 6,
        levelUpCosts: { 18: { items: [['laminated_beams', 20]] } },
        producing: [{ facility: 'Woodland', item_name: 'coconut', facility_count: 1 }],
    }));
    assert.equal(result.targetWoodItemName, 'item:laminated_beams');
    assert.equal(result.maxYieldPerTree, 122);
    assert.match(result.cardHtml, /Tiến độ nâng cấp RV 18/);
    assert.match(result.cardHtml, /122 Vụn gỗ/);
    assert.match(result.cardHtml, /1 cây item:coconut/);
});
