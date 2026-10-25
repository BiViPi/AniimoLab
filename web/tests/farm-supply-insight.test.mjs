import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFarmSupplyInsight } from '../farm-supply-insight.js';

const options = overrides => ({
    isVi: false,
    producing: [],
    prettyItem: item => `item:${item}`,
    getFacilityDisplayName: facility => `facility:${facility}`,
    perHour: value => String(value * 3600),
    ...overrides,
});

test('aggregates farmland plots, defaults missing counts, and describes distinct downstream entries', () => {
    const result = buildFarmSupplyInsight(options({
        producing: [
            { facility: 'Farmland', item_name: 'corn', facility_count: 2 },
            { facility: 'Farmland', item_name: 'corn', facility_count: 3 },
            { facility: 'Farmland', item_name: 'berry' },
            { facility: 'Woodland', item_name: 'wood', facility_count: 4 },
            { facility: 'Jukebox Dryer (Electric)', item_name: 'dried_corn', units_per_second: 0.5 },
            { facility: 'Jukebox Dryer (Electric)', item_name: 'dried_corn', units_per_second: 0.5 },
            { facility: 'Crafting Table (Prismana)', item_name: 'meal', units_per_second: 0.25 },
            { facility: 'Chimney Kiln (Manual)', item_name: 'brick', units_per_second: 0.1 },
            { facility: 'Tailor', item_name: 'cloth', units_per_second: 0.05 },
        ],
    }));

    assert.equal(result.title, '🌾 Selected: Farmland & Supply Strategy');
    assert.match(result.description, /Deployed <strong>5 ô item:corn, 1 ô item:berry<\/strong>/);
    assert.match(result.description, /facility:Jukebox Dryer.*item:dried_corn \(1800\/h\)/);
    assert.match(result.description, /facility:Crafting Table.*item:meal \(900\/h\)/);
    assert.match(result.description, /facility:Chimney Kiln/);
    assert.doesNotMatch(result.description, /facility:Tailor/);
    assert.match(result.description, /zero idle waste or raw material starvation/);
});

test('uses localized fallback and farm strategy without downstream processing', () => {
    const result = buildFarmSupplyInsight(options({ isVi: true, producing: [] }));
    assert.equal(result.farmSummary, 'Đất nông nghiệp');
    assert.equal(result.title, '🌾 Đã chọn: Chiến lược nông trại & Chuỗi cung ứng');
    assert.match(result.description, /Bố trí <strong>Đất nông nghiệp<\/strong>/);
    assert.doesNotMatch(result.description, /Cung cấp trực tiếp cho chuỗi chế biến/);
    assert.match(result.description, /đồng bộ công suất/);
});

test('localizes crop units and includes woodland products only as downstream input rows', () => {
    const result = buildFarmSupplyInsight(options({
        isVi: true,
        producing: [
            { facility: 'Farmland', item_name: 'corn', facility_count: 4 },
            { facility: 'Woodland', item_name: 'wood', facility_count: 2 },
            { facility: 'Mill', item_name: 'flour', units_per_second: 0.1 },
        ],
    }));
    assert.match(result.description, /Bố trí <strong>4 ô item:corn<\/strong>/);
    assert.match(result.description, /Cung cấp trực tiếp cho chuỗi chế biến: <strong>facility:Mill<\/strong> \(item:flour \(360\/h\)\)/);
});
