import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProfitInsight } from '../profit-insight.js';

const base = overrides => ({
    isVi: false,
    sortedStreams: [],
    totalHourlyCoins: 1000,
    unitRateDisplay: '1,000 coins/hour',
    homeLevel: 12,
    prettyItem: item => `item:${item}`,
    getFacilityDisplayName: facility => `facility:${facility}`,
    perHour: value => String(value * 3600),
    formatNumber: value => String(value),
    ...overrides,
});

test('builds top one, top two, and qualifying top three profit driver bullets', () => {
    const result = buildProfitInsight(base({ sortedStreams: [
        { item_name: 'a', facility: 'Mine (Manual)', rate_per_second: 0.1, units_per_second: 0.25 },
        { item_name: 'b', facility: 'Well (Electric)', rate_per_second: 0.05, units_per_second: 0.5 },
        { item_name: 'c', facility: 'Kiln (Prismana)', rate_per_second: 0.02, units_per_second: 0.1 },
    ] }));

    assert.equal(result.title, '🎯 Selected: Core Profit Drivers');
    assert.match(result.description, /item:a.*facility:Mine.*900\/hr.*360 coins\/hour.*36%/);
    assert.match(result.description, /item:b.*facility:Well.*180 coins\/hour.*18%/);
    assert.match(result.description, /item:c.*facility:Kiln.*72 coins\/hour.*7%/);
    assert.match(result.description, /Total Homeland output:<\/strong>.*1000 coins\/hour.*\(1,000 coins\/hour\)/);
    assert.match(result.description, /RV 12/);
});

test('omits the third stream below five percent and handles no streams', () => {
    const lowThird = buildProfitInsight(base({ sortedStreams: [
        { item_name: 'a', rate_per_second: 0.1, units_per_second: 1 },
        { item_name: 'b', rate_per_second: 0.05, units_per_second: 1 },
        { item_name: 'c', rate_per_second: 0.01, units_per_second: 1 },
    ] }));
    assert.doesNotMatch(lowThird.description, /item:c/);

    const empty = buildProfitInsight(base());
    assert.equal(empty.description.startsWith('<br>•'), true);
    assert.match(empty.description, /Highest net coin yield/);
});

test('localizes profit driver copy and applies the 5 percent threshold inclusively', () => {
    const result = buildProfitInsight(base({
        isVi: true,
        totalHourlyCoins: 720,
        unitRateDisplay: '720 coin / giờ',
        sortedStreams: [
            { item_name: 'a', facility: 'Mine (Manual)', rate_per_second: 0.1, units_per_second: 1 },
            { item_name: 'b', facility: 'Well', rate_per_second: 0.05, units_per_second: 1 },
            { item_name: 'c', facility: 'Kiln', rate_per_second: 0.01, units_per_second: 1 },
        ],
    }));
    assert.equal(result.title, '🎯 Đã chọn: Nguồn lợi nhuận cốt lõi');
    assert.match(result.description, /Tổng sản lượng Homeland:/);
    assert.match(result.description, /Tại sao chọn:/);
    assert.match(result.description, /RV 12/);
    assert.match(result.description, /item:c/);
});
