import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoFarmingCrew } from '../aniimo-farming-crew.js';

test('returns no farming crew when there are no farmland or woodland plots', () => {
    assert.deepEqual(buildAniimoFarmingCrew(0, false), { members: [], physicalWorkers: [], total: 0 });
});

test('builds the compact five-worker rotation below thirty plots', () => {
    const result = buildAniimoFarmingCrew(29, false);
    assert.equal(result.members.length, 5);
    assert.deepEqual(result.physicalWorkers.map(worker => worker.count), [1, 1, 1, 1, 1]);
    assert.equal(result.total, 5);
    assert.equal(result.members[0].facility, 'Reclaiming');
    assert.equal(result.members[1].facility, 'Sowing & Fruit Pick');
    assert.equal(result.members[4].ability, 'Hauling');
});

test('switches to the large alternating rotation at thirty plots', () => {
    const result = buildAniimoFarmingCrew(30, false);
    assert.equal(result.members.length, 6);
    assert.deepEqual(result.physicalWorkers.map(worker => worker.count), [2, 1, 1, 1, 2, 1]);
    assert.equal(result.total, 8);
    assert.match(result.members[0].facility, /30 plots/);
    assert.equal(result.members[5].isShared, true);
});

test('localizes farming labels and descriptions', () => {
    const result = buildAniimoFarmingCrew(1, true);
    assert.equal(result.members[0].facility, 'Khai khẩn');
    assert.equal(result.members[0].desc, 'Thổ Lv.2 · Chuyên tâm 100%');
    assert.equal(result.physicalWorkers[0].desc, 'Khai khẩn đất');
});
