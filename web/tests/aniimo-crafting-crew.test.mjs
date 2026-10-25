import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoCraftingMembers } from '../aniimo-crafting-crew.js';

const options = {
    facilities: [
        { name: 'Water Mill', ability: 'Water' },
        { name: 'Artisan Table', ability: 'Artisanship' },
        { name: 'Unknown Table', ability: null },
    ],
    residentFacilities: new Set(['Dewy House']),
    getFacilityDisplayName: name => `localized:${name}`,
    prettyItem: item => `item:${item}`,
    resolveStepMode: step => step.mode,
};

test('groups producing crafting units by ability and assigns one worker per two units', () => {
    const plan = { coin_items: [
        { facility: 'Water Mill', item_name: 'water', status: 'producing', facility_count: 2, mode: 'manual' },
        { facility: 'Water Mill', item_name: 'ice', status: 'producing', facility_count: 1, mode: 'manual' },
        { facility: 'Artisan Table', item_name: 'meal', status: 'producing', facility_count: 2, mode: 'manual' },
    ] };
    const result = buildAniimoCraftingMembers(plan, options);
    assert.deepEqual(result.members.map(member => [member.ability, member.worker, member.count, member.level, member.specific]), [
        ['Water', 'Aquata', 2, 3, 'Aquata'],
        ['Artisanship', 'Artisan', 1, 3, ''],
    ]);
    assert.equal(result.members[0].facility, 'localized:Water Mill (3 units)');
    assert.equal(result.members[0].desc, 'Handles 3 Water crafting units');
    assert.equal(result.total, 3);
});

test('uses Prismana worker when any machine in an ability group is Prismana', () => {
    const plan = { coin_items: [
        { facility: 'Water Mill', item_name: 'water', status: 'producing', facility_count: 1, mode: 'manual' },
        { facility: 'Water Mill', item_name: 'ice', status: 'producing', facility_count: 1, mode: 'prismana' },
    ] };
    const result = buildAniimoCraftingMembers(plan, options);
    assert.equal(result.members[0].worker, 'Piopiota (Đêm)');
    assert.equal(result.members[0].level, 4);
    assert.equal(result.members[0].specific, 'Piopiota (Đêm)');
});

test('omits electric, non-producing, zero-count, and excluded facilities', () => {
    const plan = { coin_items: [
        { facility: 'Water Mill', item_name: 'water', status: 'producing', facility_count: 2, mode: 'electric' },
        { facility: 'Dewy House', item_name: 'rest', status: 'producing', facility_count: 1, mode: 'manual' },
        { facility: 'Mine', item_name: 'ore', status: 'producing', facility_count: 1, mode: 'manual' },
        { facility: 'Water Mill', item_name: 'ice', status: 'queued', facility_count: 1, mode: 'manual' },
        { facility: 'Water Mill', item_name: 'ice', status: 'producing', facility_count: 0, mode: 'manual' },
    ] };
    assert.deepEqual(buildAniimoCraftingMembers(plan, options), { members: [], total: 0 });
});

test('uses plan ability fallback and localizes special worker names and descriptions', () => {
    const plan = { coin_items: [
        { facility: 'Unknown Table', item_name: 'dish', status: 'producing', facility_count: 1, mode: 'manual', aniimo: { ability: 'Dark' } },
        { facility: 'Artisan Table', item_name: 'tool', status: 'producing', facility_count: 1, mode: 'prismana' },
    ] };
    const result = buildAniimoCraftingMembers(plan, { ...options, isVi: true });
    assert.equal(result.members[0].ability, 'Dark');
    assert.equal(result.members[0].worker, 'Rookey');
    assert.equal(result.members[0].desc, 'Chế biến item:dish');
    assert.equal(result.members[1].worker, 'Fulmintis');
    assert.equal(result.members[1].specific, 'Fulmintis');
});
