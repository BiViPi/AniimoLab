import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoEnvironmentMembers } from '../aniimo-environment-crew.js';

const getFacilityDisplayName = name => `localized:${name}`;

test('builds localized environmental worker rows for heat, cooling, and lighting', () => {
    const plan = { environment_assignments: [
        { building: 'Heat Furnace', units: 2, mode: 'Warm' },
        { building: 'Cooling Unit', units: 1, mode: 'Cold' },
        { building: 'Sunlamp', units: 3, mode: 'Bright' },
    ] };

    const result = buildAniimoEnvironmentMembers(plan, { isVi: true, getFacilityDisplayName });
    assert.deepEqual(result.members.map(member => [member.ability, member.worker, member.count, member.specific]), [
        ['Fire', 'Ignis', 2, 'Ignis'],
        ['Ice', 'Băng Lv.3', 1, ''],
        ['Light', 'Lumik', 3, 'Lumik'],
    ]);
    assert.equal(result.members[0].facility, 'localized:Heat Furnace (Warm)');
    assert.equal(result.members[1].desc, 'Trực Máy Làm Mát (Cold) 24/7');
    assert.equal(result.total, 6);
});

test('deduplicates paired assignment rows by pair using the maximum units and each paired mode', () => {
    const plan = { environment_assignments: [
        { building: 'Heat Furnace', partner: ['Cooling Unit'], units: 2, mode: 'Warm', pair_modes: ['Warm', 'Cold'] },
        { building: 'Heat Furnace', partner: ['Cooling Unit'], units: 1, mode: 'Warm', pair_modes: ['Warm', 'Cold'] },
    ] };

    const result = buildAniimoEnvironmentMembers(plan, { isVi: false, getFacilityDisplayName });
    assert.equal(result.members.length, 2);
    assert.deepEqual(result.members.map(member => [member.facility, member.count]), [
        ['localized:Heat Furnace (Warm)', 2],
        ['localized:Cooling Unit (Cold)', 2],
    ]);
    assert.equal(result.total, 4);
});

test('ignores non-staffed buildings and non-positive assignments', () => {
    const plan = { environment_assignments: [
        { building: 'Heat Furnace', units: 0, mode: 'Warm' },
        { building: 'Unknown', units: 4, mode: 'Other' },
        { building: 'Sunlamp', units: -1, mode: 'Bright' },
    ] };
    assert.deepEqual(buildAniimoEnvironmentMembers(plan, { isVi: false, getFacilityDisplayName }), { members: [], total: 0 });
});
