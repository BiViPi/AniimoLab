import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateAniimoRosterSummary } from '../aniimo-roster-summary.js';

const options = roster => ({
    roster,
    residentFacilities: new Set(['Mine']),
    recipeIndex: [{ name: 'apple', jobs: [['Sowing', 'Earth', 2]] }],
    prettyItem: name => name,
    rosterLabel: member => member.name,
    isVietnamese: false,
});

test('roster summary counts production, resident work, staffing, and guard duty without mutating plan', () => {
    const roster = [
        { name: 'Ada', count: 1, abilities: { Earth: 2 }, personalities: [] },
        { name: 'Bo', count: 2, abilities: { Earth: 3 }, personalities: [] },
    ];
    const plan = {
        coin_items: [
            { crew: 0, status: 'producing', facility: 'Mine', item_name: 'ore', facility_count: 1, busy_units: 0.5 },
            { crew: 1, status: 'producing', facility: 'Stove', item_name: 'jam', facility_count: 1, busy_units: 0.25 },
            { crew: 0, status: 'skipped', facility: 'Mine', item_name: 'x', facility_count: 1 },
        ],
        staffing: [['Garden', 1, 0.5]],
        guard_staffing: [[0, 1]],
    };
    const before = structuredClone(plan);
    const summary = calculateAniimoRosterSummary(plan, options(roster));
    assert.deepEqual(summary.busy, [2, 0.75]);
    assert.equal(summary.where[0].get('Mine (ore)'), 1);
    assert.equal(summary.where[0].get('⚡ Power Pole Guard'), 1);
    assert.equal(summary.where[1].get('Garden'), 0.5);
    assert.equal(summary.have, 3);
    assert.equal(summary.working, 2);
    assert.equal(summary.guardDoubleCountingViolations.length, 1);
    assert.deepEqual(plan, before);
});

test('roster summary maps invalid guard assignments and accepts object aliases with localized messages', () => {
    const plan = { guard_staffing: [{ member: 4, count: 1 }, { index: 0, count: 0 }] };
    const summary = calculateAniimoRosterSummary(plan, { ...options([{ name: 'A', count: 1, abilities: {}, personalities: [] }]), isVietnamese: true });
    assert.equal(summary.guardMappingErrors.length, 2);
    assert.match(summary.guardMappingErrors[0].message, /Lỗi mapping/);
    assert.match(summary.guardMappingErrors[1].message, /không hợp lệ/);
    assert.equal(summary.guardDoubleCountingViolations.length, 0);
});

test('roster summary assigns growing jobs to the least busy qualified member', () => {
    const roster = [
        { name: 'Ada', count: 1, abilities: { Earth: 2 }, personalities: [] },
        { name: 'Bo', count: 1, abilities: { Earth: 2 }, personalities: [] },
    ];
    const plan = {
        coin_items: [
            { crew: 0, status: 'producing', facility: 'Stove', item_name: 'jam', facility_count: 1, busy_units: 0.8 },
            { status: 'producing', facility: 'Farmland', item_name: 'apple', facility_count: 3 },
        ],
    };
    const summary = calculateAniimoRosterSummary(plan, options(roster));
    assert.equal(summary.busy[0], 0.8);
    assert.equal(summary.where[1].get('Sowing on Farmland'), 1);
});
