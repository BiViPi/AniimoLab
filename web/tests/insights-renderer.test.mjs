import test from 'node:test';
import assert from 'node:assert/strict';
import { createInsightsRenderer, RECIPE_RIVAL_INSIGHTS } from '../insights-renderer.js';

function createMockElement(id, value = '') {
    return {
        id,
        value,
        innerHTML: '',
        hidden: false,
    };
}

function createMockDocument(elements = {}) {
    return {
        getElementById(id) {
            return elements[id] || null;
        }
    };
}

test('insights-renderer: displays localized hint when no plan or plan is unsuccessful', () => {
    const container = createMockElement('insights-content');
    const doc = createMockDocument({ 'insights-content': container });

    let lang = 'vi';
    const renderer = createInsightsRenderer({
        document: doc,
        getLanguage: () => lang,
        selectedHomeLevel: () => 18,
        simpleSetup: () => ({ facilities: {} }),
        planContext: () => ({}),
        levelUpCosts: {},
        lastPlanInput: () => null,
        lastEmodeCounts: () => ({}),
        prettyItem: x => x,
        perHour: x => x * 3600,
        formatDuration: () => '1h',
        formatRate: () => '10/s',
        getFacilityDisplayName: x => x,
        getGeneratorCapacity: () => 1000,
        calculatePowerWatts: () => 500,
        seasonActive: () => false,
        selectedSeasonDishes: () => new Set(),
        buildWoodlandInsight: () => ({ cardHtml: '' }),
        buildProfitInsight: () => ({ title: 'Profit', description: 'Desc' }),
        buildFarmSupplyInsight: () => ({ title: 'Farm', description: 'Desc' }),
        buildRejectedInsight: () => ({ title: 'Rejected', description: 'Desc' }),
        buildLogisticsInsight: () => ({ title: 'Logistics', description: 'Desc' }),
    });

    renderer.render(null);
    assert.match(container.innerHTML, /Chưa có kế hoạch được tính toán/);

    lang = 'en';
    renderer.render({ success: false });
    assert.match(container.innerHTML, /No plan calculated yet/);
});

test('insights-renderer: safely no-ops when container element is missing', () => {
    const doc = createMockDocument({});
    const renderer = createInsightsRenderer({
        document: doc,
        getLanguage: () => 'en',
        selectedHomeLevel: () => 18,
        simpleSetup: () => ({ facilities: {} }),
        planContext: () => ({}),
        levelUpCosts: {},
        lastPlanInput: () => null,
        lastEmodeCounts: () => ({}),
        prettyItem: x => x,
        perHour: x => x * 3600,
        formatDuration: () => '1h',
        formatRate: () => '10/s',
        getFacilityDisplayName: x => x,
        getGeneratorCapacity: () => 1000,
        calculatePowerWatts: () => 500,
        seasonActive: () => false,
        selectedSeasonDishes: () => new Set(),
        buildWoodlandInsight: () => ({ cardHtml: '' }),
        buildProfitInsight: () => ({ title: 'Profit', description: 'Desc' }),
        buildFarmSupplyInsight: () => ({ title: 'Farm', description: 'Desc' }),
        buildRejectedInsight: () => ({ title: 'Rejected', description: 'Desc' }),
        buildLogisticsInsight: () => ({ title: 'Logistics', description: 'Desc' }),
    });

    assert.doesNotThrow(() => renderer.render({ success: true }));
});

test('insights-renderer: compiles 5 insight cards for successful plan', () => {
    const container = createMockElement('insights-content');
    const suInput = createMockElement('layout-su-count', '4');
    const doc = createMockDocument({
        'insights-content': container,
        'layout-su-count': suInput,
    });

    const calls = [];
    const renderer = createInsightsRenderer({
        document: doc,
        getLanguage: () => 'vi',
        selectedHomeLevel: () => 19,
        simpleSetup: () => ({ facilities: { Woodland: [{ level: 5 }] } }),
        planContext: () => ({}),
        levelUpCosts: {},
        lastPlanInput: () => ({ emode_facility_counts: { Grill: 2 } }),
        lastEmodeCounts: () => ({ Grill: 2 }),
        prettyItem: x => `pretty_${x}`,
        perHour: x => x * 3600,
        formatDuration: () => '2h',
        formatRate: () => '42/s',
        getFacilityDisplayName: x => `fac_${x}`,
        getGeneratorCapacity: () => 1200,
        calculatePowerWatts: () => 600,
        seasonActive: () => true,
        selectedSeasonDishes: () => new Set(['dish_1']),
        buildWoodlandInsight: (args) => {
            calls.push('woodland');
            assert.equal(args.woodlandTier, 5);
            return {
                cardHtml: '<div class="insight-levelup">Level Up Card</div>',
                woodlandSummary: 'Woodland summary',
                totalTrees: 10,
                totalHourlyWood: 500,
                woodItemHourly: '500',
            };
        },
        buildProfitInsight: () => {
            calls.push('profit');
            return { title: 'Tối ưu Lợi nhuận', description: 'Chi tiết lợi nhuận' };
        },
        buildFarmSupplyInsight: () => {
            calls.push('farm');
            return { title: 'Chiến lược Nông trại', description: 'Chi tiết nông trại' };
        },
        buildRejectedInsight: (args) => {
            calls.push('rejected');
            assert.equal(args.seasonIsActive, true);
            assert.equal(args.selectedSeasonDishCount, 1);
            return { title: 'Lý do Loại bỏ', description: 'Chi tiết loại bỏ' };
        },
        buildLogisticsInsight: (args) => {
            calls.push('logistics');
            assert.equal(args.suCount, 4);
            return { title: 'Hậu cần & Điện', description: 'Chi tiết hậu cần' };
        },
    });

    const samplePlan = {
        success: true,
        rate_per_second: 12.5,
        coin_items: [
            { item_name: 'cranberry_chocolate', status: 'producing' }
        ],
        income_streams: [
            { item_name: 'cranberry_chocolate', units_per_second: 0.1, rate_per_second: 12.5 }
        ]
    };

    renderer.render(samplePlan);

    assert.deepEqual(calls, ['woodland', 'profit', 'farm', 'rejected', 'logistics']);
    assert.match(container.innerHTML, /Tối ưu Lợi nhuận/);
    assert.match(container.innerHTML, /Chiến lược Nông trại/);
    assert.match(container.innerHTML, /Level Up Card/);
    assert.match(container.innerHTML, /Hậu cần & Điện/);
    assert.match(container.innerHTML, /Lý do Loại bỏ/);
});

test('insights-renderer: exports RECIPE_RIVAL_INSIGHTS with valid reason generators', () => {
    assert.ok(RECIPE_RIVAL_INSIGHTS.cranberry_chocolate);
    const item = RECIPE_RIVAL_INSIGHTS.cranberry_chocolate;
    assert.equal(item.rival, 'strawberry_cream_puff');
    const ctx = {
        facName: 'Bếp Lò',
        facNameEn: 'Blazing Stove',
        allocated: 1,
        total: 2,
        idle: 1,
    };
    assert.match(item.reasonVi(ctx), /Bếp Lò/);
    assert.match(item.reasonEn(ctx), /Blazing Stove/);
});
