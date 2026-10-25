import test from 'node:test';
import assert from 'node:assert/strict';
import { ANIIMO_RESIDENT_FACILITIES, buildAniimoResidentMembers } from '../aniimo-resident-crew.js';

const options = {
    facilities: [{ name: 'Nimbus Bed', ability: 'Leisure' }, { name: 'Dewy House', ability: 'Nature' }],
    getFacilitySpecificWorker: (facility, item) => item === 'rare-fruit' ? 'Leafy' : '',
    getFacilityDisplayName: name => `localized:${name}`,
    prettyItem: item => `item:${item}`,
};

test('includes configured producing resident facilities with step assignment taking priority', () => {
    const plan = { coin_items: [
        { facility: 'Nimbus Bed (Electric)', item_name: 'nap', status: 'producing', facility_count: 2, facility_level: 4, aniimo: { ability: 'Water', level: 3 } },
        { facility: 'Dewy House', item_name: 'rare-fruit', status: 'producing', facility_count: 1, facility_level: 2 },
        { facility: 'Starfall Hammock', item_name: 'rest', status: 'producing', facility_count: 1, facility_level: 1 },
    ] };
    const before = structuredClone(plan);
    const result = buildAniimoResidentMembers(plan, options);

    assert.deepEqual(result.members.map(member => [member.worker, member.ability, member.level, member.count, member.specific]), [
        ['Water Lv.3', 'Water', 3, 2, ''],
        ['Leafy', 'Nature', 4, 1, 'Leafy'],
        ['Leisure Lv.4', 'Leisure', 4, 1, ''],
    ]);
    assert.equal(result.members[1].desc, 'item:rare-fruit (Resident 24/7)');
    assert.equal(result.total, 4);
    assert.deepEqual(plan, before);
});

test('uses legacy count and ability fallbacks and excludes queued or non-resident facilities', () => {
    const plan = { coin_items: [
        { facility: 'Dewy House', item_name: 'food', status: 'producing', facility_count: 0 },
        { facility: 'Nimbus Bed', item_name: 'nap', status: 'queued', facility_count: 2 },
        { facility: 'Mine', item_name: 'ore', status: 'producing', facility_count: 3 },
    ] };
    const result = buildAniimoResidentMembers(plan, options);
    assert.deepEqual(result.members.map(member => [member.ability, member.level, member.count]), [['Nature', 4, 1]]);
    assert.deepEqual([...ANIIMO_RESIDENT_FACILITIES], ['Tidewhisper Sandcastle', 'Dewy House', 'Nimbus Bed', 'Starfall Hammock', 'Floral Windmill']);
});

test('localizes the resident description', () => {
    const plan = { coin_items: [{ facility: 'Dewy House', item_name: 'food', status: 'producing', facility_count: 1 }] };
    assert.equal(buildAniimoResidentMembers(plan, { ...options, isVi: true }).members[0].desc, 'item:food (Túc trực 24/7)');
});
