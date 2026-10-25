import test from 'node:test';
import assert from 'node:assert/strict';
import { createAniimoSetupUIController } from '../aniimo-setup-ui.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        hidden: false,
        textContent: '',
        innerHTML: '',
        style: {},
        attributes: {},
        dataset: {},
        setAttribute(name, value) { this.attributes[name] = String(value); },
        getAttribute(name) { return this.attributes[name] ?? null; },
        ...initialProps,
    };
}

function createMockDocument(elements = {}) {
    return {
        getElementById(id) {
            return elements[id] || null;
        },
    };
}

test('aniimo-setup-ui: handles levelledAbilities and bestAniimoLevel with defaults', () => {
    const facilities = [
        { name: 'Kitchen', ability: 'Cooking' },
        { name: 'Mine', ability: 'Mining' },
        { name: 'Warehouse' }, // no ability
    ];
    const abilities = [
        { name: 'Cooking' },
        { name: 'Mining' },
        { name: 'Perfumery' },
    ];
    const controller = createAniimoSetupUIController({
        facilities,
        abilities,
        maxAniimoLevel: 4,
        getWorkerForLevel: () => null,
        abilityTag: ability => `[Tag:${ability}]`,
    });

    // Only Cooking and Mining are in facilities
    assert.deepEqual(controller.levelledAbilities(), ['Cooking', 'Mining']);
    // Default levels: Perfumery = 3, others = 4
    assert.equal(controller.bestAniimoLevel('Cooking'), 4);
    assert.equal(controller.bestAniimoLevel('Perfumery'), 3);

    // After setting custom level
    controller.setAniimoLevels({ Cooking: 2 });
    assert.equal(controller.bestAniimoLevel('Cooking'), 2);
    assert.deepEqual(controller.getAniimoLevels(), { Cooking: 2 });
});

test('aniimo-setup-ui: builds aniimoInput for best, minimum, and roster setups', () => {
    const facilities = [{ name: 'Kitchen', ability: 'Cooking' }];
    const abilities = [{ name: 'Cooking' }];
    const controller = createAniimoSetupUIController({
        facilities,
        abilities,
        maxAniimoLevel: 4,
        rosterPayload: () => ({ members: [{ name: 'Chef' }] }),
    });

    const bestInput = controller.aniimoInput('best');
    assert.deepEqual(bestInput, {
        aniimo: 'best',
        aniimo_levels: { Cooking: 4 },
    });

    const minInput = controller.aniimoInput('minimum:relaxed');
    assert.deepEqual(minInput, {
        aniimo: 'minimum',
        aniimo_levels: { Cooking: 4 },
    });

    const rosterInput = controller.aniimoInput('roster');
    assert.deepEqual(rosterInput, {
        aniimo: 'roster',
        roster: { members: [{ name: 'Chef' }] },
        aniimo_levels: {},
    });
});

test('aniimo-setup-ui: renders ability levels into document element', () => {
    const facilities = [{ name: 'Kitchen', ability: 'Cooking' }];
    const abilities = [{ name: 'Cooking' }];
    const listElem = createMockElement('ability-levels');
    const doc = createMockDocument({ 'ability-levels': listElem });

    const controller = createAniimoSetupUIController({
        document: doc,
        facilities,
        abilities,
        maxAniimoLevel: 4,
        getWorkerForLevel: (ability, level) => ({
            name: `Worker-${ability}-${level}`,
            img_url: `http://img/${level}.png`,
            is_prismana: level >= 4,
        }),
        abilityTag: ability => `<span class="tag">${ability}</span>`,
    });

    controller.renderAbilityLevels();
    assert.match(listElem.innerHTML, /Cooking/);
    assert.match(listElem.innerHTML, /Worker-Cooking-4/);
    assert.match(listElem.innerHTML, /name="level-Cooking"/);
    assert.match(listElem.innerHTML, /value="4" checked/);
});

test('aniimo-setup-ui: handles setup panel change events, confirm prompt, and persistence', () => {
    let saved = false;
    let switched = false;
    let confirmAnswer = true;
    let confirmedMsg = '';

    const facilities = [{ name: 'Perfume Lab', ability: 'Perfumery' }];
    const abilities = [{ name: 'Perfumery' }];
    const panel = createMockElement('aniimo-setup-panel');
    let changeHandler = null;
    panel.addEventListener = (event, fn) => {
        if (event === 'change') changeHandler = fn;
    };

    const controller = createAniimoSetupUIController({
        facilities,
        abilities,
        maxAniimoLevel: 4,
        saveInputsToStorage: () => { saved = true; },
        switchAniimoSetup: () => { switched = true; },
        confirmPrompt: msg => {
            confirmedMsg = msg;
            return confirmAnswer;
        },
    });

    controller.attachAniimoSetupHandlers(panel);
    assert.ok(typeof changeHandler === 'function');

    // Case 1: Selecting unheard-of level (e.g. Perfumery level 4 has prompt) and user accepts
    changeHandler({
        target: {
            name: 'level-Perfumery',
            value: '4',
            checked: true,
            dataset: { confirm: 'Perfumery' },
        },
    });
    assert.ok(confirmedMsg.includes('level-4 Perfumery'));
    assert.equal(controller.bestAniimoLevel('Perfumery'), 4);
    assert.equal(saved, true);
    assert.equal(switched, true);

    // Case 2: User rejects confirm
    saved = false;
    switched = false;
    confirmAnswer = false;
    changeHandler({
        target: {
            name: 'level-Perfumery',
            value: '4',
            checked: true,
            dataset: { confirm: 'Perfumery' },
        },
    });
    // Should abort without saving to storage or changing aniimo level
    assert.equal(saved, false);
    assert.equal(controller.bestAniimoLevel('Perfumery'), 4); // still 4 from previous step
    // showAniimoSetup is called to reset UI which triggers switchAniimoSetup
    assert.equal(switched, true);
});
