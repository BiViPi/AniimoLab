import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoExtractionMembers } from '../aniimo-extraction-crew.js';

const options = {
    getFacilityDisplayName: facility => `localized:${facility}`,
    prettyItem: item => `item:${item}`,
    resolveStepMode: step => step.mode,
};

test('assigns manual and Prismana workers independently for each producing Mine and Well row', () => {
    const plan = { coin_items: [
        { facility: 'Mine (Manual)', item_name: 'ore', status: 'producing', facility_count: 2, mode: 'manual' },
        { facility: 'Mine (Prismana)', item_name: 'crystal', status: 'producing', facility_count: 1, mode: 'prismana' },
        { facility: 'Well', item_name: 'water', status: 'producing', facility_count: 3, mode: 'manual' },
        { facility: 'Well (Prismana)', item_name: 'spring', status: 'producing', facility_count: 1, mode: 'prismana' },
    ] };

    const result = buildAniimoExtractionMembers(plan, { ...options, isVi: false });
    assert.deepEqual(result.members.map(member => [member.ability, member.worker, member.count, member.level, member.specific]), [
        ['Earth', 'Shrubclaw', 2, 3, 'Shrubclaw'],
        ['Earth', 'Waleetle', 1, 4, 'Waleetle'],
        ['Water', 'Aquata', 3, 3, 'Aquata'],
        ['Water', 'Water Prismana Lv.4', 1, 4, ''],
    ]);
    assert.equal(result.members[0].facility, 'localized:Mine (item:ore)');
    assert.equal(result.members[3].desc, 'Pumping (Prismana Water Lv.4)');
    assert.equal(result.total, 7);
});

test('ignores electric, queued, zero-count, and unrelated production rows', () => {
    const plan = { coin_items: [
        { facility: 'Mine', item_name: 'ore', status: 'producing', facility_count: 4, mode: 'electric' },
        { facility: 'Well', item_name: 'water', status: 'queued', facility_count: 2, mode: 'manual' },
        { facility: 'Mine', item_name: 'ore', status: 'producing', facility_count: 0, mode: 'manual' },
        { facility: 'Woodland', item_name: 'wood', status: 'producing', facility_count: 3, mode: 'manual' },
    ] };

    assert.deepEqual(buildAniimoExtractionMembers(plan, { ...options, isVi: true }), { members: [], total: 0 });
});

test('localizes Mine and Well role descriptions', () => {
    const plan = { coin_items: [
        { facility: 'Mine', item_name: 'ore', status: 'producing', facility_count: 1, mode: 'manual' },
        { facility: 'Well', item_name: 'water', status: 'producing', facility_count: 1, mode: 'prismana' },
    ] };
    const result = buildAniimoExtractionMembers(plan, { ...options, isVi: true });
    assert.equal(result.members[0].desc, 'Khai thác quặng (Thủ công Thổ Lv.3)');
    assert.equal(result.members[1].worker, 'Thủy Prismana Lv.4');
    assert.equal(result.members[1].desc, 'Bơm nước (Prismana Thủy Lv.4)');
});
