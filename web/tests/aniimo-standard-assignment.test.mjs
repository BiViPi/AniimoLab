import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAniimoWorkGroups, assignAniimoGroups } from '../aniimo-standard-assignment.js';

test('work group builder combines task time, farm jobs, facility locations, and paired environment staffing', () => {
    const plan = {
        coin_items: [
            { facility: 'Mine', item_name: 'ore', facility_level: 2, facility_count: 1, aniimo_tasks: [{ ability: 'Earth', level: 3, personality_bonus: true, busy: 0.4, jobs: [] }] },
            { facility: 'Farmland', item_name: 'apple', facility_count: 4, aniimo_tasks: [{ ability: 'Earth', level: 3, personality_bonus: false, busy: 0.2, jobs: ['Sowing'] }] },
        ],
        environment_assignments: [
            { building: 'Tall Grove', partner: ['Amber Grove'], units: 2, mode: 'Lush', pair_modes: ['Lush', 'Wet'] },
            { building: 'Tall Grove', partner: ['Amber Grove'], units: 1, mode: 'Lush', pair_modes: ['Lush', 'Wet'] },
            { building: 'Moon Pool', units: 1, mode: 'Cool' },
        ],
    };
    const groups = buildAniimoWorkGroups(plan, {
        facilities: [{ name: 'Mine', personality: 'Judicious' }],
        environmentBuildingAbility: { 'Tall Grove': 'Earth', 'Amber Grove': 'Water', 'Moon Pool': 'Water' },
        getFacilitySpecificWorker: () => null,
        taskLabel: task => `${task.ability} Lv.${task.level}`,
        prettyItem: name => name,
    });

    const earth = groups.get('Earth Lv.3');
    assert.ok(Math.abs(earth.busy - 0.6) < 1e-9);
    assert.equal(earth.personality, 'Judicious');
    assert.equal(earth.where.get('Mine (ore)'), 1);
    assert.equal(earth.jobs.get('Sowing').has('Farmland'), true);
    assert.equal(groups.get('Earth (environment)').busy, 2);
    assert.equal(groups.get('Water (environment)').busy, 3);
    assert.equal(groups.get('Water (environment)').where.get('Amber Grove (Wet)'), 2);
});

test('assignment merges compatible spare time but separates opposing personalities, environment, and specific workers', () => {
    const groups = new Map([
        ['Earth Lv.4', { label: 'Earth Lv.4', ability: 'Earth', level: 4, bonus: true, personality: 'Bold', busy: 0.4, where: new Map([['Mine', 1]]), jobs: new Map(), specificWorker: null }],
        ['Earth Lv.3 compatible', { label: 'Earth Lv.3 compatible', ability: 'Earth', level: 3, bonus: false, personality: null, busy: 0.2, where: new Map([['Well', 1]]), jobs: new Map([['Sowing', new Set(['Farmland'])]]), specificWorker: null }],
        ['Earth Lv.3 opposite', { label: 'Earth Lv.3 opposite', ability: 'Earth', level: 3, bonus: true, personality: 'Calm', busy: 0.2, where: new Map(), jobs: new Map(), specificWorker: null }],
        ['Water env', { label: 'Water any level', ability: 'Water', level: 1, bonus: false, busy: 0.5, where: new Map(), jobs: new Map(), environment: true }],
        ['Water specific', { label: 'Water specific', ability: 'Water', level: 2, bonus: false, busy: 0.5, where: new Map(), jobs: new Map(), specificWorker: 'Aquata' }],
    ]);
    const before = [...groups.values()].map(group => ({ ...group, where: new Map(group.where), jobs: new Map(group.jobs) }));
    const result = assignAniimoGroups(groups, personality => ({ Bold: 'Calm', Calm: 'Bold' })[personality]);

    assert.ok(Math.abs(result.kept.find(group => group.label === 'Earth Lv.4').busy - 0.6) < 1e-9);
    assert.ok(result.kept.some(group => group.label === 'Earth Lv.3 opposite'));
    assert.ok(result.kept.some(group => group.label === 'Water any level'));
    assert.ok(result.kept.some(group => group.label === 'Water specific'));
    assert.equal(result.total, result.kept.reduce((sum, group) => sum + group.count, 1));
    assert.deepEqual([...groups.values()].map(group => group.busy), before.map(group => group.busy));
});

test('assignment rounds worker count up and accounts for the hauling baseline', () => {
    const groups = new Map([['one', { label: 'one', ability: 'Water', level: 2, bonus: false, busy: 1.2, where: new Map(), jobs: new Map() }]]);
    const result = assignAniimoGroups(groups, () => false);
    assert.equal(result.kept[0].count, 2);
    assert.equal(result.kept[0].spare, 0.8);
    assert.equal(result.total, 3);
});
