import test from 'node:test';
import assert from 'node:assert/strict';
import { applySavedFields, attachPersistedFieldAutosave, buildSavedConfig, getPersistedFieldIds, migrateSavedConfig, persistSavedConfig, readSavedConfig, removeSavedConfig, restoreSavedState } from '../config-storage.js';

test('lists persisted form fields in their current stable order', () => {
    assert.deepEqual(getPersistedFieldIds(), [
        'target-amount', 'current-amount', 'strategy-level-up', 'strategy-priorities', 'level-up-target',
        'mode-simple', 'mode-advanced', 'home-level', 'ecological-module-level', 'kitchen-module-level',
        'resource-detector-level', 'crafting-module-level', 'rate-unit', 'season-on', 'layout-sim-on',
        'power-grid-rate', 'emode-simple-on', 'simple-power-grid-rate', 'generator-capacity',
        'simple-generator-capacity', 'season-radish-plots', 'season-pepper-plots',
    ]);
});

test('migrates legacy config keys and preserves hand-entered advanced mode', () => {
    const saved = {
        facilityTiers: { 'Mineral Pile': [{ count: 2, level: 1 }] },
        'mineral-detector-level': '3',
    };
    const migrated = migrateSavedConfig(saved);
    assert.equal(migrated, saved);
    assert.equal(migrated['mode-simple'], false);
    assert.equal(migrated['mode-advanced'], true);
    assert.deepEqual(migrated.facilityTiers.Mine, [{ count: 2, level: 1 }]);
    assert.equal(migrated['resource-detector-level'], '3');
});

test('reads current key first, then legacy key, and handles corrupt storage with warning callback', () => {
    const data = { home: 12 };
    const calls = [];
    const storage = { getItem: key => { calls.push(key); return key === 'aniimolab-config-v1' ? JSON.stringify(data) : '{bad'; } };
    assert.deepEqual(readSavedConfig({ storage }), data);
    assert.deepEqual(calls, ['aniimolab-config-v1']);

    let warning;
    assert.equal(readSavedConfig({ storage: { getItem: () => '{bad' }, onError: error => { warning = error; } }), null);
    assert.equal(warning instanceof SyntaxError, true);
    assert.equal(readSavedConfig({ storage: { getItem: () => null } }), null);
});

test('builds snapshots from state and persisted controls, forcing expired season off', () => {
    const controls = new Map([
        ['target-amount', { type: 'number', value: '12' }],
        ['season-on', { type: 'checkbox', checked: true, value: 'on' }],
        ['missing-field', null],
    ]);
    const result = buildSavedConfig({ facilityTiers: { Mine: [{ count: 1 }] } }, {
        document: { getElementById: id => controls.get(id) },
        fieldIds: ['target-amount', 'season-on', 'missing-field'],
        seasonExpired: true,
    });
    assert.deepEqual(result, { facilityTiers: { Mine: [{ count: 1 }] }, 'target-amount': '12', 'season-on': false });
});

test('persists snapshots and reports storage write failures through callback', () => {
    const values = new Map();
    const storage = { setItem: (key, value) => values.set(key, value) };
    assert.equal(persistSavedConfig({ storage, key: 'config', data: { count: 2 } }), true);
    assert.deepEqual(JSON.parse(values.get('config')), { count: 2 });
    let warning;
    const result = persistSavedConfig({ storage: { setItem: () => { throw new Error('quota'); } }, key: 'config', data: {}, onError: error => { warning = error; } });
    assert.equal(result, false);
    assert.equal(warning.message, 'quota');
});

test('attaches input/change autosave events based on control type', () => {
    const controls = new Map([
        ['text', { type: 'text', tagName: 'INPUT', addEventListener(event, handler) { this.binding = [event, handler]; } }],
        ['check', { type: 'checkbox', tagName: 'INPUT', addEventListener(event, handler) { this.binding = [event, handler]; } }],
        ['select', { type: 'select-one', tagName: 'SELECT', addEventListener(event, handler) { this.binding = [event, handler]; } }],
        ['missing', null],
    ]);
    const save = () => {};
    attachPersistedFieldAutosave({ document: { getElementById: id => controls.get(id) }, fieldIds: ['text', 'check', 'select', 'missing'], save });
    assert.deepEqual(controls.get('text').binding, ['input', save]);
    assert.deepEqual(controls.get('check').binding, ['change', save]);
    assert.deepEqual(controls.get('select').binding, ['change', save]);
});

test('removes saved config and reports removal failures', () => {
    let removed;
    assert.equal(removeSavedConfig({ storage: { removeItem: key => { removed = key; } }, key: 'current' }), true);
    assert.equal(removed, 'current');
    let warning;
    assert.equal(removeSavedConfig({ storage: { removeItem: () => { throw new Error('denied'); } }, onError: error => { warning = error; } }), false);
    assert.equal(warning.message, 'denied');
});

test('hydrates only saved persisted fields and maps checkbox values to checked state', () => {
    const controls = new Map([
        ['home-level', { type: 'number', value: '20' }],
        ['season-on', { type: 'checkbox', checked: false }],
        ['layout-sim-on', { type: 'checkbox', checked: true }],
    ]);
    applySavedFields({ 'home-level': 14, 'season-on': true }, {
        document: { getElementById: id => controls.get(id) },
        fieldIds: ['home-level', 'season-on', 'layout-sim-on', 'missing'],
    });
    assert.equal(controls.get('home-level').value, 14);
    assert.equal(controls.get('season-on').checked, true);
    assert.equal(controls.get('layout-sim-on').checked, true);
});

test('restores only valid roster, ability, season, and facility state', () => {
    const restored = restoreSavedState({
        seasonRadishPlots: 4,
        seasonPepperPlots: 'bad',
        selectedSeasonDishes: ['dish', 2],
        emodeFacilities: ['Pot'],
        levelUpStock: { wood: 12 },
        skippedRecipes: ['a', 1],
        unlockedSpecial: ['b'],
        priorities: [{ target: 'wood', on: 1 }, { target: 'invalid', on: true }],
        aniimoLevels: { Farming: '3', Unknown: 4, Mining: 5 },
        roster: [
            { name: 'A', count: 2.5, abilities: { Farming: '2', Unknown: 3 }, personalities: ['Calm', 'Odd'] },
            null,
            { name: 'Bad', abilities: null },
        ],
    }, {
        abilityNames: new Set(['Farming', 'Mining']),
        priorityTargets: [{ id: 'wood' }, { id: 'food' }],
        personalityPairs: [{ names: ['Calm', 'Bold'] }, { names: ['Kind', 'Odd'] }],
    });
    assert.equal(restored.seasonRadishPlots, 4);
    assert.equal('seasonPepperPlots' in restored, false);
    assert.deepEqual(restored.selectedSeasonDishes, ['dish']);
    assert.deepEqual(restored.emodeFacilities, ['Pot']);
    assert.deepEqual(restored.levelUpStock, { wood: 12 });
    assert.deepEqual(restored.skippedRecipes, ['a']);
    assert.deepEqual(restored.priorities, [{ target: 'wood', on: true }, { target: 'food', on: false }]);
    assert.deepEqual(restored.aniimoLevels, { Farming: 3 });
    assert.deepEqual(restored.roster, [{
        name: 'A', count: 3, abilities: { Farming: 2 }, personalities: ['Calm', 'Odd'],
    }]);
});

test('defaults priorities when missing or invalid and leaves omitted optional state untouched', () => {
    const targets = [{ id: 'wood' }, { id: 'food' }];
    assert.deepEqual(restoreSavedState({ priorities: [{ target: 'unknown', on: true }] }, {
        abilityNames: new Set(), priorityTargets: targets, personalityPairs: [],
    }), { priorities: [{ target: 'wood', on: false }, { target: 'food', on: false }] });
});
