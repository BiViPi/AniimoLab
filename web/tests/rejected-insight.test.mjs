import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRejectedInsight } from '../rejected-insight.js';

const makeOptions = overrides => ({
    isVi: false,
    woodlandInsight: {},
    woodlandTier: 1,
    sortedStreams: [],
    activeItemNames: new Set(),
    simpleSetup: () => ({ facilities: {} }),
    homeLevel: 12,
    producing: [],
    rivalInsights: {},
    seasonIsActive: false,
    selectedSeasonDishCount: 0,
    plan: { coin_items: [] },
    ...overrides,
});

test('builds localized lower-tier Woodland rejection only when level-up needs wood', () => {
    const result = buildRejectedInsight(makeOptions({
        isVi: true,
        woodlandTier: 4,
        woodlandInsight: {
            hasWoodland: true, hasLevelUp: true, lowerTierTreesExampleVi: 'Willow',
            lowerTierMaxYield: 21, maxYieldPerTree: 47, targetWoodItemName: 'gỗ', targetRv: 14,
        },
    }));
    assert.match(result.description, /Không trồng cây cấp thấp/);
    assert.match(result.description, /Cấp 4/);
    assert.equal((result.description.match(/<li>/g) || []).length, 1);
});

test('deduplicates rival recipes and calculates unused facility capacity', () => {
    const rivalInsights = {
        dish: { rival: 'alternative', rivalNameVi: 'Món B', rivalNameEn: 'Dish B', facility: 'Pot', facilityVi: 'Nồi', reasonVi: ctx => `${ctx.allocated}/${ctx.total}`, reasonEn: ctx => `${ctx.allocated}/${ctx.total}` },
        dish2: { rival: 'alternative', rivalNameVi: 'Món B', rivalNameEn: 'Dish B', facility: 'Pot', facilityVi: 'Nồi', reasonVi: 'reason', reasonEn: 'reason' },
    };
    const result = buildRejectedInsight(makeOptions({
        sortedStreams: [{ item_name: 'dish', rate_per_second: 5 }, { item_name: 'dish2', rate_per_second: 4 }],
        simpleSetup: () => ({ facilities: { Pot: [{ count: 3 }] } }),
        producing: [{ facility: 'Pot (Electric)', facility_count: 2 }],
        rivalInsights,
    }));
    assert.equal((result.description.match(/<li>/g) || []).length, 1);
    assert.match(result.description, /2\/3/);
});

test('includes seasonal and idle facility reasons, and uses localized fallback', () => {
    const options = makeOptions({
        isVi: true,
        seasonIsActive: true,
        selectedSeasonDishCount: 1,
        plan: { coin_items: [{ status: 'idle' }] },
    });
    const result = buildRejectedInsight(options);
    assert.match(result.description, /Lễ hội Trung thu/);
    assert.match(result.description, /cơ sở chế biến để trống/);
    assert.doesNotMatch(result.description, /Toàn bộ cơ sở/);
    const fallback = buildRejectedInsight(makeOptions({ isVi: true }));
    assert.match(fallback.description, /Toàn bộ cơ sở/);
});
