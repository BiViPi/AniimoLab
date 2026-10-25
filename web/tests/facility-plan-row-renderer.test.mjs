import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacilityPlanRows } from '../facility-plan-row-renderer.js';

const makeOptions = overrides => ({
    rows: [],
    isFarm: false,
    isVietnamese: false,
    homeLevel: 12,
    emodeAvailable: true,
    facilities: [{ name: 'Simmering Pot', supportsEmode: true }, { name: 'Mine', supportsEmode: false }, { name: 'Farmland', supportsEmode: false }],
    facilityOverrides: [],
    lastEmodeCounts: {},
    powerWatts: { 'Simmering Pot': 60 },
    ownedFacilityCounts: { 'Simmering Pot': 2, Mine: 2 },
    stepIndex: () => 0,
    renderFacilityIcon: name => `<i data-fac="${name}"></i>`,
    renderItemIcon: name => `<i data-item="${name}"></i>`,
    getFacilityDisplayName: name => name,
    prettyItem: name => name,
    prettyReason: String,
    formatNumber: String,
    aniimoLabel: () => '<b>Worker</b>',
    ...overrides,
});

test('row renderer exposes all three modes and watt/partition controls for an electric facility', () => {
    const step = { facility: 'Simmering Pot', facility_count: 2, item_name: 'jam', status: 'producing', mode: 'electric', cycle_time: 10, units_per_second: 1, rate_per_second: 2 };
    const result = buildFacilityPlanRows(makeOptions({ rows: [step] }));
    assert.match(result.html, /pill-electric /);
    assert.match(result.html, /pill-electric active/);
    assert.match(result.html, /pill-specialist /);
    assert.match(result.html, /pill-manual /);
    assert.match(result.html, /120W/);
    assert.match(result.html, /btn-partition-gear/);
    assert.deepEqual(result.modeUpdates, [{ step, mode: 'electric' }]);
    assert.equal(step.mode, 'electric');
});

test('row renderer infers legacy mode markers and hides electric controls below RV12', () => {
    const step = { facility: 'Simmering Pot (Electric)', facility_count: 1, item_name: 'jam', status: 'producing', cycle_time: 10 };
    const result = buildFacilityPlanRows(makeOptions({ rows: [step], homeLevel: 11, emodeAvailable: false }));
    assert.match(result.html, /pill-specialist/);
    assert.doesNotMatch(result.html, /pill-electric/);
    assert.equal(result.modeUpdates[0].mode, 'manual');
});

test('row renderer respects explicit row mode ahead of stale override counts and hides watts for non-electric mode', () => {
    const step = { facility: 'Simmering Pot', facility_count: 1, item_name: 'jam', status: 'producing', mode: 'manual' };
    const result = buildFacilityPlanRows(makeOptions({
        rows: [step],
        facilityOverrides: [{ facility: 'Simmering Pot', electric_count: 1, specialist_count: 1, manual_count: 0 }],
    }));
    assert.match(result.html, /pill-manual active/);
    assert.doesNotMatch(result.html, /facility-power-badge/);
    assert.equal(result.modeUpdates[0].mode, 'manual');
});

test('farming rows omit mode and Aniimo cells while preserving crop and reason content', () => {
    const result = buildFacilityPlanRows(makeOptions({
        isFarm: true,
        rows: [{ facility: 'Farmland', facility_count: 3, item_name: 'apple', status: 'producing', reason: 'Used for cider' }],
    }));
    assert.match(result.html, /data-item="apple"/);
    assert.match(result.html, /Used for cider/);
    assert.doesNotMatch(result.html, /mode-selector-pills|Worker/);
    assert.deepEqual(result.modeUpdates, []);
});

test('row renderer assigns step.mode before invoking aniimoLabel and renders separate worker cards and rates', () => {
    const step1 = { facility: 'Simmering Pot', facility_count: 1, item_name: 'cocoa_spread', status: 'producing', mode: 'prismana', cycle_time: 90.0, units_per_second: 1 / 90 };
    const step2 = { facility: 'Simmering Pot', facility_count: 1, item_name: 'malt_sugar', status: 'producing', mode: 'manual', cycle_time: 202.5, units_per_second: 1 / 202.5 };
    
    const aniimoCalls = [];
    const result = buildFacilityPlanRows(makeOptions({
        rows: [step1, step2],
        aniimoLabel: step => {
            aniimoCalls.push({ item: step.item_name, mode: step.mode });
            return `<span class="worker-${step.mode}">Worker ${step.mode}</span>`;
        },
    }));

    // aniimoLabel nhận chính xác step.mode của từng dòng thay vì bị đè thành electric
    assert.deepEqual(aniimoCalls, [
        { item: 'cocoa_spread', mode: 'prismana' },
        { item: 'malt_sugar', mode: 'manual' },
    ]);
    assert.match(result.html, /worker-prismana/);
    assert.match(result.html, /worker-manual/);
    // Thời gian và sản lượng riêng biệt
    assert.match(result.html, /90\.0s/);
    assert.match(result.html, /40\/h/);
    assert.match(result.html, /202\.5s/);
    assert.match(result.html, /18\/h/);
});
