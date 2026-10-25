import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomelandPiecesBuilder, splitEnvironmentRowsByUnit } from '../homeland-layout-view.js';

function createBuilder(overrides = {}) {
    return createHomelandPiecesBuilder({
        environmentModeOrder: ['Warm', 'Cool'],
        environmentBuildingSize: name => name === 'Sunlamp' ? 1 : 2,
        getRecipes: () => [
            { name: 'pie', environment: 'Warm' },
            { name: 'tea', environment: null },
        ],
        facilityFootprints: { 'Simmering Pot': [1.5, 1.5], Farmland: [2, 2], Sunlamp: [1, 1] },
        facilityPowerWatts: { 'Simmering Pot': 60 },
        simpleSetup: level => ({ facilities: { 'Simmering Pot': [{ count: 2, level }], Farmland: [{ count: 24, level: 1 }] } }),
        getHomeLevel: () => 12,
        isSimpleMode: () => true,
        getPowerPoleCount: () => 2,
        isEmodeActive: () => true,
        ...overrides,
    });
}

test('environment rows split by assigned geometry and trim unused capacity without changing inputs', () => {
    const rows = [
        { facility: 'Farmland', item_name: 'pie', facility_count: 3 },
        { facility: 'Woodland', item_name: 'tea', facility_count: 1 },
    ];
    const assignments = [{ building: 'Sunlamp', layouts: [[
        { facility: 'Farmland', x: 0, y: 0, size: 2 },
        { facility: 'Farmland', x: 2, y: 0, size: 2 },
        { facility: 'Woodland', x: 4, y: 0, size: 4 },
    ]] }];
    const before = structuredClone({ rows, assignments });
    const units = splitEnvironmentRowsByUnit(rows, assignments);
    assert.equal(units.length, 1);
    assert.deepEqual(units[0].rows.map(row => [row.facility, row.facility_count]), [['Farmland', 2], ['Woodland', 1]]);
    assert.equal(units[0].layout.length, 3);
    assert.deepEqual({ rows, assignments }, before);
});

test('Homeland pieces pack outdoor fields, flag environmental work, report unknown footprints, and add E-mode network pieces', () => {
    const plan = { coin_items: [
        { facility: 'Simmering Pot', item_name: 'pie', status: 'producing', facility_count: 2, busy_units: 2, cycle_time: 10, mode: 'electric' },
        { facility: 'Farmland', item_name: 'tea', status: 'producing', facility_count: 3, cycle_time: 30 },
        { facility: 'Unknown Facility', item_name: 'tea', status: 'producing', facility_count: 1, cycle_time: 30 },
    ] };
    const input = { home_level: 12, emode_facility_counts: { 'Simmering Pot': 2 } };
    const before = structuredClone({ plan, input });
    const result = createBuilder().build(plan, input);
    const potPieces = result.pieces.filter(piece => piece.members?.[0]?.facility === 'Simmering Pot');
    const farmBlocks = result.pieces.filter(piece => piece.isFieldBlock);
    assert.equal(potPieces.length, 2);
    assert.equal(potPieces[0].members[0].isElectric, true);
    assert.equal(potPieces[0].members[0].powerWatts, 60);
    assert.equal(potPieces[0].members[0].sensitive, true);
    assert.equal(farmBlocks.length, 1);
    assert.equal(farmBlocks[0].members.length, 3);
    assert.deepEqual(result.unplaced, ['Unknown Facility']);
    assert.equal(result.pieces.filter(piece => piece.members?.[0]?.generator).length, 1);
    assert.equal(result.pieces.filter(piece => piece.members?.[0]?.powerPole).length, 2);
    assert.deepEqual({ plan, input }, before);
});

test('Homeland pieces create one environment cluster from solver assignments and matching crops', () => {
    const plan = {
        coin_items: [{ facility: 'Farmland', item_name: 'pie', status: 'producing', facility_count: 2, cycle_time: 40, environment: 'Warm' }],
        environment_assignments: [{ mode: 'Warm', building: 'Sunlamp', layouts: [[
            { facility: 'Farmland', x: -1, y: 0, size: 2 },
            { facility: 'Farmland', x: 1, y: 0, size: 2 },
        ]] }],
    };
    const result = createBuilder({ isEmodeActive: () => false }).build(plan, { home_level: 8 });
    const cluster = result.pieces.find(piece => piece.cluster);
    assert.ok(cluster);
    assert.deepEqual(cluster.buildings, [{ x: 0, y: 0, w: 1, h: 1, facility: 'Sunlamp', mode: 'Warm', building: true }]);
    assert.deepEqual(cluster.plots.map(plot => plot.crop), ['pie', 'pie']);
    assert.deepEqual(cluster.planned, [{ x: -1, y: 0 }, { x: 1, y: 0 }]);
    assert.equal(result.pieces.some(piece => piece.members?.[0]?.generator), false);
});
