import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoProcessingMembers } from '../aniimo-processing-crew.js';

const displayName = facility => `localized:${facility}`;

test('builds manual and Prismana assignments for woodworking and kiln production', () => {
    const plan = { coin_items: [
        { facility: 'Woodworking Bench', item_name: 'plank', status: 'producing', facility_count: 2, mode: 'manual' },
        { facility: 'Chimney Kiln', item_name: 'brick', status: 'producing', facility_count: 1, mode: 'prismana' },
    ] };
    const result = buildAniimoProcessingMembers(plan, {
        isVi: false,
        getFacilityDisplayName: displayName,
        resolveStepMode: step => step.mode,
    });

    assert.deepEqual(result.members.map(member => ({ worker: member.worker, count: member.count, level: member.level, specific: member.specific })), [
        { worker: 'Carpenter (Artisanship Lv.3)', count: 2, level: 3, specific: '' },
        { worker: 'Scorchhowl', count: 1, level: 4, specific: 'Scorchhowl' },
    ]);
    assert.equal(result.members[0].facility, 'localized:Woodworking Bench');
    assert.equal(result.members[1].desc, 'Smelting (Prismana Fire Lv.4)');
    assert.equal(result.total, 3);
});

test('excludes electric, non-producing, and zero-count rows; localizes manual role labels', () => {
    const plan = { coin_items: [
        { facility: 'Woodworking Bench', item_name: 'plank', status: 'producing', facility_count: 3, mode: 'electric' },
        { facility: 'Chimney Kiln', item_name: 'brick', status: 'queued', facility_count: 2, mode: 'manual' },
        { facility: 'Chimney Kiln', item_name: 'brick', status: 'producing', facility_count: 0, mode: 'manual' },
        { facility: 'Chimney Kiln (Manual)', item_name: 'brick', status: 'producing', facility_count: 1, mode: 'manual' },
    ] };
    const result = buildAniimoProcessingMembers(plan, {
        isVi: true,
        getFacilityDisplayName: displayName,
        resolveStepMode: step => step.mode,
    });

    assert.equal(result.members.length, 1);
    assert.equal(result.members[0].worker, 'Ignis');
    assert.equal(result.members[0].facility, 'localized:Chimney Kiln');
    assert.equal(result.members[0].desc, 'Nung gạch quặng (Thủ công Hỏa Lv.3)');
    assert.equal(result.total, 1);
});
