import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInfeasibleExplanationMarkup } from '../infeasible-explanation.js';

const options = overrides => ({
    currentRv: 12,
    isVietnamese: true,
    isLevelUp: false,
    targetRv: 13,
    isSeason: false,
    wantsSauce: false,
    wantsHotpot: false,
    hasSpecialGinseng: false,
    eventPlots: 0,
    seasonRadishPlots: 0,
    seasonPepperPlots: 0,
    totalFarmland: 30,
    ownedCounts: {},
    currentAniimoCap: 30,
    maxAniimo: 38,
    renderFacilityIcon: name => `[facility:${name}]`,
    renderItemIcon: name => `[item:${name}]`,
    ...overrides,
});

test('builds specific seasonal contention, farmland and level-up causes with remedies', () => {
    const html = buildInfeasibleExplanationMarkup(options({
        isSeason: true,
        wantsSauce: true,
        wantsHotpot: true,
        hasSpecialGinseng: true,
        eventPlots: 12,
        seasonRadishPlots: 6,
        seasonPepperPlots: 6,
        isLevelUp: true,
        ownedCounts: { 'Simmering Pot': 3 },
    }));
    assert.match(html, /Tranh chấp Nồi hầm/);
    assert.match(html, /Chiếm dụng Bếp lửa lớn/);
    assert.match(html, /12\/30/);
    assert.match(html, /Xung đột mục tiêu Nâng cấp RV 13/);
    assert.match(html, /Đĩa tiệc mùa màng/);
    assert.match(html, /Bỏ chọn món đang gây tắc nghẽn/);
    assert.match(html, /Cân bằng lại số ô đất sự kiện/);
});

test('falls back to generic cause and recommends cap/electric changes outside the festival', () => {
    const html = buildInfeasibleExplanationMarkup(options({ currentAniimoCap: 20, maxAniimo: 38 }));
    assert.match(html, /Xung đột tài nguyên và công nhân Aniimo/);
    assert.match(html, /20\/38/);
    assert.match(html, /Điều chỉnh Chế độ điện/);
    assert.match(html, /Tại sao kế hoạch này không khả thi/);
});

test('uses English copy and omits cap recommendation when already at maximum', () => {
    const html = buildInfeasibleExplanationMarkup(options({
        isVietnamese: false,
        isLevelUp: true,
        isSeason: false,
        currentAniimoCap: 38,
        maxAniimo: 38,
    }));
    assert.match(html, /Why is this plan infeasible/);
    assert.match(html, /Conflict with RV 13 Level-Up Goal/);
    assert.doesNotMatch(html, /Increase Aniimo worker cap/);
    assert.match(html, /Adjust Electric Mode/);
});
