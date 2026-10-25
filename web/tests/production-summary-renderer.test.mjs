import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSeedTableViewModel, buildProfitBreakdownViewModel } from '../production-summary-renderer.js';

const options = {
    unit: 'hour',
    rateUnitSeconds: { hour: { multiplier: 3600 } },
    planContext: { levelUp: false, target: 12 },
    recipeIndex: [
        { name: 'apple', cost: 2, seasonSeedCost: 1 },
        { name: 'pear', cost: 0, seasonSeedCost: 0 },
    ],
    seasonCurrency: 'Harvest Moon Points',
    isVietnamese: false,
    prettyItem: name => `Item ${name}`,
    formatRate: value => `R${Number(value.toFixed(2))}`,
    formatNumber: value => `N${value}`,
    getTableHeading: (_key, fallback) => fallback,
};

test('seed table view model calculates hourly seed, coin, and season costs without mutating the plan', () => {
    const plan = { coin_items: [
        { facility: 'Farmland', item_name: 'apple', status: 'producing', cycle_time: 10, facility_count: 2 },
        { facility: 'Woodland', item_name: 'pear', status: 'producing', cycle_time: 10, facility_count: 1 },
    ] };
    const before = structuredClone(plan);
    const result = buildSeedTableViewModel(plan, options);

    assert.equal(result.visible, true);
    assert.match(result.unitText, /Seeds per hour/);
    assert.match(result.html, /Item apple/);
    assert.match(result.html, /R720<\/td>/);
    assert.match(result.html, /R720 Harvest Moon Points/);
    assert.match(result.html, /R1440 Home Coins/);
    assert.deepEqual(plan, before);
});

test('seed table view model rounds counts up for level-up plans and localizes target text', () => {
    const plan = {
        coin_items: [{ facility: 'Woodland', item_name: 'apple', status: 'producing', cycle_time: 10, facility_count: 2 }],
        level_up: { seconds: 12 },
    };
    const result = buildSeedTableViewModel(plan, {
        ...options,
        isVietnamese: true,
        planContext: { levelUp: true, target: 14 },
    });

    assert.match(result.unitText, /đến RV 14/);
    assert.match(result.html, /R3<\/td>/);
    assert.doesNotMatch(result.html, /Home Coins/);
    assert.match(result.html, /R3 Harvest Moon Points/);
    assert.doesNotMatch(result.html, /Tổng cộng/);
});

test('seed table view model handles plans without producing crops', () => {
    const result = buildSeedTableViewModel({ coin_items: [{ facility: 'Mine', status: 'producing' }] }, options);
    assert.equal(result.visible, true);
    assert.match(result.unitText, /does not use Farmland or Woodland/);
    assert.match(result.html, /No seeds required/);
});

test('profit breakdown aggregates mode variants, sorts by earnings, and reports until-RV totals without mutation', () => {
    const plan = {
        level_up: { seconds: 60 },
        income_streams: [
            { item_name: 'ore__specialist', units_per_second: 2, rate_per_second: 3, facility: 'Mine' },
            { item_name: 'ore', units_per_second: 1, rate_per_second: 2, facility: 'Mine' },
            { item_name: 'jam__manual', units_per_second: 0, rate_per_second: 0, facility: 'Simmering Pot' },
        ],
    };
    const before = structuredClone(plan);
    const result = buildProfitBreakdownViewModel(plan, {
        isVietnamese: false,
        target: 15,
        formatNumber: value => `N${value}`,
        perHour: value => `H${Math.round(value * 3600)}`,
        prettyItem: name => `Item ${name}`,
        getFacilityDisplayName: name => `Facility ${name}`,
        renderItemIcon: name => `<i data-item="${name}"></i>`,
        renderFacilityIcon: name => `<i data-facility="${name}"></i>`,
        getTableHeading: (_key, fallback) => fallback,
    });

    assert.equal(result.visible, true);
    assert.match(result.html, /data-item="ore"/);
    assert.doesNotMatch(result.html, /data-item="ore__specialist"/);
    assert.match(result.html, /H10800/);
    assert.match(result.html, /N300<\/td>/);
    assert.match(result.html, /Profit until RV 15/);
    assert.match(result.html, /data-item="ore"/);
    assert.deepEqual(plan, before);
});

test('profit breakdown hides empty income streams and omits until-RV column without a level-up report', () => {
    const hidden = buildProfitBreakdownViewModel({ income_streams: [] }, {});
    assert.deepEqual(hidden, { visible: false, html: '' });

    const result = buildProfitBreakdownViewModel({
        income_streams: [{ item_name: 'pear', units_per_second: 1, rate_per_second: 2, facility: 'Woodland' }],
    }, {
        isVietnamese: true,
        target: null,
        formatNumber: String,
        perHour: String,
        prettyItem: name => name,
        getFacilityDisplayName: name => name,
        renderItemIcon: () => '',
        renderFacilityIcon: () => '',
        getTableHeading: (_key, fallback) => fallback,
    });
    assert.equal(result.visible, true);
    assert.match(result.html, /Bán \/ giờ/);
    assert.doesNotMatch(result.html, /th><th>Profit until RV/);
    assert.match(result.html, /5 cột dữ liệu/);
});
