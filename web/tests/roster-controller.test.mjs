import test from 'node:test';
import assert from 'node:assert/strict';
import { createRosterController } from '../roster-controller.js';

function fakeEditor() {
    const listeners = new Map();
    return {
        addEventListener(type, handler) { listeners.set(type, handler); },
        dispatch(type, event) { listeners.get(type)?.({ target: {}, ...event }); },
    };
}

function makeController(initialRoster, bestTeam = []) {
    const editor = fakeEditor();
    let roster = initialRoster;
    let saves = 0;
    let renders = 0;
    let solves = 0;
    let timerSequence = 0;
    const timers = new Map();
    const cleared = [];
    const controller = createRosterController({
        document: { getElementById: id => id === 'roster-editor' ? editor : null },
        getRoster: () => roster,
        setRoster: value => { roster = value; },
        getBestTeam: () => bestTeam,
        createNewAniimo: (abilities = {}, personalities = null) => ({ name: '', count: 1, abilities, personalities: personalities || ['Bold', 'Gentle'] }),
        personalityPairs: [{ names: ['Bold', 'Gentle'] }, { names: ['Bright', 'Calm'] }],
        saveInputsToStorage: () => { saves++; },
        renderRoster: () => { renders++; },
        switchAniimoSetup: () => { solves++; },
        setTimeoutFn: callback => { const id = ++timerSequence; timers.set(id, callback); return id; },
        clearTimeoutFn: id => { cleared.push(id); timers.delete(id); },
    });
    return { controller, editor, getRoster: () => roster, timers, cleared, getSaves: () => saves, getRenders: () => renders, getSolves: () => solves };
}

test('roster controller handles count, remove, drop, and add clicks then debounces replan', () => {
    const harness = makeController([{ name: '', count: 1, abilities: { Earth: 2 }, personalities: ['Bold', 'Calm'] }]);
    harness.controller.attachHandlers();
    const click = dataset => harness.editor.dispatch('click', { target: { closest: selector => selector === 'button' ? { dataset } : null } });
    click({ count: '0|-1' });
    assert.equal(harness.getRoster()[0].count, 1);
    click({ drop: '0|Earth' });
    assert.deepEqual(harness.getRoster()[0].abilities, {});
    click({ roster: 'add' });
    assert.equal(harness.getRoster().length, 2);
    assert.deepEqual(harness.getRoster()[1].personalities, ['Bold', 'Gentle']);
    click({ remove: '1' });
    assert.equal(harness.getRoster().length, 1);
    assert.equal(harness.getSaves(), 4);
    assert.equal(harness.getRenders(), 4);
    assert.equal(harness.cleared.length, 4);
    [...harness.timers.values()][0]();
    assert.equal(harness.getSolves(), 1);
});

test('roster controller imports and aggregates alike Best team members by level and personalities', () => {
    const bestTeam = [
        { ability: 'Earth', level: 3, count: 2, personalities: new Set(['Bold', 'Bright']) },
        { ability: 'Earth', level: 3, count: 1, personalities: new Set(['Bold', 'Bright']) },
        { ability: 'Earth', level: 4, count: 1, personalities: new Set(['Bold', 'Bright']) },
    ];
    const harness = makeController([], bestTeam);
    harness.controller.attachHandlers();
    harness.editor.dispatch('click', { target: { closest: () => ({ dataset: { roster: 'from-best' } }) } });
    assert.equal(harness.getRoster().length, 2);
    assert.equal(harness.getRoster()[0].count, 3);
    assert.deepEqual(harness.getRoster()[0].personalities, ['Bold', 'Bright']);
    assert.deepEqual(harness.getRoster()[0].abilities, { Earth: 3 });
    assert.equal(harness.getSaves(), 1);
});

test('roster controller applies level/personality/add changes, while name edits only save', () => {
    const harness = makeController([{ name: '', count: 1, abilities: {}, personalities: ['Bold', 'Calm'] }]);
    harness.controller.attachHandlers();
    const change = (dataset, value) => harness.editor.dispatch('change', { target: { dataset, value } });
    change({ level: '0|Earth' }, '4');
    change({ personality: '0|1' }, 'Bright');
    change({ add: '0' }, 'Water');
    change({ name: '0' }, 'My Aniimo');
    change({ add: '0' }, '');
    assert.deepEqual(harness.getRoster()[0], { name: 'My Aniimo', count: 1, abilities: { Earth: 4, Water: 1 }, personalities: ['Bold', 'Bright'] });
    assert.equal(harness.getSaves(), 4);
    assert.equal(harness.getRenders(), 3);
    assert.equal(harness.timers.size, 1);
});
