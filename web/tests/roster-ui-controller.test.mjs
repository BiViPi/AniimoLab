import test from 'node:test';
import assert from 'node:assert/strict';
import { createRosterUIController } from '../roster-ui-controller.js';

function createMockElement(id = '', tag = 'div') {
    return {
        id,
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); },
        },
        hidden: false,
        title: '',
        listeners: {},
        addEventListener(event, fn) {
            this.listeners[event] = this.listeners[event] || [];
            this.listeners[event].push(fn);
        },
    };
}

function createMockDocument() {
    const elements = new Map();
    function getOrCreate(id) {
        if (!elements.has(id)) {
            elements.set(id, createMockElement(id));
        }
        return elements.get(id);
    }
    return {
        getElementById: id => getOrCreate(id),
        elements,
    };
}

test('roster-ui-controller: newRosterAniimo and rosterPayload format data correctly', () => {
    const personalityPairs = [
        { names: ['Lively', 'Gentle'] },
        { names: ['Careful', 'Brave'] },
    ];
    const facilities = [
        { name: 'House 1', category: 'Aniimo Materials' },
        { name: 'Mine', category: 'Production', personality: 'Brave' },
    ];

    const controller = createRosterUIController({
        document: createMockDocument(),
        window: {},
        facilities,
        abilities: ['Mining', 'Watering'],
        personalityPairs,
        environmentBuildingAbility: { Heat: 'Fire' },
        personalityLetter: p => p[0],
        abilityTag: a => `[${a}]`,
        escapeText: str => str,
        prettyItem: str => str,
        getRecipeIndex: () => [],
        saveInputsToStorage: () => {},
        switchAniimoSetup: () => {},
    });

    const card = controller.newRosterAniimo({ Mining: 2 });
    assert.deepEqual(card, {
        name: '',
        count: 1,
        abilities: { Mining: 2 },
        personalities: ['Lively', 'Careful'],
    });

    controller.setRoster([card]);
    const payload = controller.rosterPayload();

    assert.equal(payload.members.length, 1);
    assert.deepEqual(payload.members[0], {
        count: 1,
        abilities: { Mining: 2 },
        personalities: ['Lively', 'Careful'],
    });
    assert.deepEqual(payload.residents, ['House 1']);
    assert.deepEqual(payload.personalities, { Mine: 'Brave' });
    assert.deepEqual(payload.environment, { Heat: 'Fire' });
});

test('roster-ui-controller: rosterLabel generates formatted names or fallbacks', () => {
    const controller = createRosterUIController({
        document: createMockDocument(),
        window: {},
        facilities: [],
        abilities: [],
        personalityPairs: [],
        environmentBuildingAbility: {},
        personalityLetter: p => p[0],
        abilityTag: a => a,
        escapeText: str => str,
        prettyItem: str => str,
        getRecipeIndex: () => [],
        saveInputsToStorage: () => {},
        switchAniimoSetup: () => {},
    });

    const named = { name: 'Pikachu', abilities: { Mining: 2 } };
    assert.equal(controller.rosterLabel(named, 0), 'Pikachu');

    const unnamed = { name: '', abilities: { Mining: 2, Watering: 1 } };
    assert.equal(controller.rosterLabel(unnamed, 0), 'Mining 2, Watering 1');

    const empty = { name: '', abilities: {} };
    assert.equal(controller.rosterLabel(empty, 4), 'Aniimo 5');
});

test('roster-ui-controller: showRosterShortfall and showSetupOnly manipulate DOM correctly', () => {
    const doc = createMockDocument();
    const controller = createRosterUIController({
        document: doc,
        window: {},
        facilities: [],
        abilities: [],
        personalityPairs: [],
        environmentBuildingAbility: {},
        personalityLetter: p => p[0],
        abilityTag: a => a,
        escapeText: str => str,
        prettyItem: str => str,
        getRecipeIndex: () => [],
        saveInputsToStorage: () => {},
        switchAniimoSetup: () => {},
    });

    controller.setRoster([{ count: 1, abilities: { Mining: 1 } }]);
    controller.showRosterShortfall();

    assert.equal(doc.getElementById('error-message').style.display, 'none');
    assert.equal(doc.getElementById('results-content').style.display, 'block');
    assert.ok(doc.getElementById('results-content').classList.contains('setup-only'));
    assert.equal(doc.getElementById('aniimo-collapsed-summary').textContent, 'No plan found with these Aniimo.');

    controller.setRoster([{ count: 0, abilities: {} }]);
    controller.showRosterShortfall();
    assert.equal(doc.getElementById('aniimo-collapsed-summary').textContent, '');
});

test('roster-ui-controller: renderRosterSummary populates summary markup and counts', () => {
    const doc = createMockDocument();
    const controller = createRosterUIController({
        document: doc,
        window: { i18n: { getLang: () => 'en' }, th: (k, def) => def },
        facilities: [{ name: 'Camp', category: 'Aniimo Materials' }],
        abilities: ['Mining'],
        personalityPairs: [],
        environmentBuildingAbility: {},
        personalityLetter: p => p[0],
        abilityTag: a => `[${a}]`,
        escapeText: str => str,
        prettyItem: str => str,
        getRecipeIndex: () => [],
        saveInputsToStorage: () => {},
        switchAniimoSetup: () => {},
    });

    const plan = {
        assignments: [
            { worker: 'Pikachu', machine_count: 1, ability: 'Mining', level: 1, facility: 'Camp' },
        ],
    };

    const res = controller.renderRosterSummary(plan, {
        roster: [{ name: 'Pikachu', count: 1, abilities: { Mining: 1 }, personalities: [] }],
    });

    assert.equal(res.have, 1);
    assert.ok(doc.getElementById('aniimo-summary').innerHTML.length > 0);
    assert.equal(doc.getElementById('aniimo-count').hidden, false);
});
