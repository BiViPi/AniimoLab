import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecipeFilterController } from '../recipe-filter-controller.js';

function createMockElement(id = '', tag = 'div') {
    return {
        id,
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        value: '',
        listeners: {},
        addEventListener(event, fn) {
            this.listeners[event] = this.listeners[event] || [];
            this.listeners[event].push(fn);
        },
        dispatchEvent(event) {
            (this.listeners[event.type] || []).forEach(fn => fn(event));
        },
        setCustomValidity() {},
        reportValidity() {},
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

test('recipe-filter-controller: calculates excludedRecipes correctly with locked specials, season, and aniipods', () => {
    const unlockedSpecial = new Set(['special_apple']);
    const selectedSeasonDishes = new Set(['season_stew']);
    let seasonActiveFlag = true;
    let wantsAniipodsFlag = true;

    const controller = createRecipeFilterController({
        document: createMockDocument(),
        window: {},
        callWorker: async () => '[]',
        specialRecipes: [{ name: 'special_apple' }, { name: 'special_banana' }],
        seasonRecipes: [{ name: 'season_stew' }, { name: 'season_salad' }],
        aniipodTiers: ['aniipod_small', 'aniipod_medium', 'aniipod_mega'],
        getUnlockedSpecial: () => unlockedSpecial,
        getSpecialNames: () => new Set(['special_apple', 'special_banana']),
        isSeasonActive: () => seasonActiveFlag,
        getSelectedSeasonDishes: () => selectedSeasonDishes,
        wantsAniipods: () => wantsAniipodsFlag,
        bestAniipod: () => 'aniipod_mega',
        prettyItem: name => `[${name}]`,
        escapeText: str => str,
        saveInputsToStorage: () => {},
        runFindPlan: () => {},
    });

    controller.setSkipped('plain_bread', true);

    // Locked special: special_banana
    // Locked season (seasonActive=true): season_salad
    // Lesser aniipods: aniipod_small, aniipod_medium
    // Skipped: plain_bread
    const excluded = controller.excludedRecipes();
    assert.ok(excluded.includes('plain_bread'));
    assert.ok(excluded.includes('special_banana'));
    assert.ok(!excluded.includes('special_apple'));
    assert.ok(excluded.includes('season_salad'));
    assert.ok(!excluded.includes('season_stew'));
    assert.ok(excluded.includes('aniipod_small'));
    assert.ok(excluded.includes('aniipod_medium'));
    assert.ok(!excluded.includes('aniipod_mega'));

    // When season inactive: all season recipes locked
    seasonActiveFlag = false;
    const excludedNoSeason = controller.excludedRecipes();
    assert.ok(excludedNoSeason.includes('season_stew'));
    assert.ok(excludedNoSeason.includes('season_salad'));
});

test('recipe-filter-controller: loads recipe index from worker and populates datalist options', async () => {
    const doc = createMockDocument();
    const mockWindow = {};
    const rawItems = [
        { name: 'item_b', facility: 'Kitchen' },
        { name: 'item_a', facility: 'Kitchen' },
        { name: 'item_c', facility: 'Workshop' },
    ];

    const controller = createRecipeFilterController({
        document: doc,
        window: mockWindow,
        callWorker: async msg => (msg === 'get_all_items' ? JSON.stringify(rawItems) : '[]'),
        specialRecipes: [],
        seasonRecipes: [],
        aniipodTiers: [],
        getUnlockedSpecial: () => new Set(),
        getSpecialNames: () => new Set(),
        isSeasonActive: () => false,
        getSelectedSeasonDishes: () => new Set(),
        wantsAniipods: () => false,
        bestAniipod: () => null,
        prettyItem: name => name.toUpperCase(),
        escapeText: str => str,
        saveInputsToStorage: () => {},
        runFindPlan: () => {},
    });

    await controller.loadRecipeIndex();

    assert.equal(mockWindow.ALL_RECIPES_MAP.size, 3);
    const index = controller.getRecipeIndex();
    assert.equal(index.length, 3);
    assert.equal(index[0].name, 'item_a');
    assert.equal(index[1].name, 'item_b');
    assert.equal(index[2].name, 'item_c');

    const datalist = doc.getElementById('skip-options');
    assert.ok(datalist.innerHTML.includes('ITEM_A (Kitchen)'));
    assert.ok(datalist.innerHTML.includes('ITEM_B (Kitchen)'));
    assert.ok(datalist.innerHTML.includes('ITEM_C (Workshop)'));
});

test('recipe-filter-controller: manages skipped set, updates DOM and persists storage', () => {
    const doc = createMockDocument();
    let saved = false;

    const controller = createRecipeFilterController({
        document: doc,
        window: {},
        callWorker: async () => '[]',
        specialRecipes: [],
        seasonRecipes: [],
        aniipodTiers: [],
        getUnlockedSpecial: () => new Set(),
        getSpecialNames: () => new Set(),
        isSeasonActive: () => false,
        getSelectedSeasonDishes: () => new Set(),
        wantsAniipods: () => false,
        bestAniipod: () => null,
        prettyItem: name => name,
        escapeText: str => str,
        saveInputsToStorage: () => {
            saved = true;
        },
        runFindPlan: () => {},
    });

    controller.setSkipped('apple_pie', true);
    assert.equal(saved, true);
    assert.ok(controller.getSkippedRecipes().has('apple_pie'));
    assert.ok(doc.getElementById('recipe-count').textContent.includes('1'));

    saved = false;
    controller.setSkipped('apple_pie', false);
    assert.equal(saved, true);
    assert.ok(!controller.getSkippedRecipes().has('apple_pie'));
});
