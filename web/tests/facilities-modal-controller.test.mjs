import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilitiesModalController } from '../facilities-modal-controller.js';

function createMockElement(id) {
    return {
        id,
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        style: { display: '' },
        textContent: '',
        innerHTML: '',
    };
}

function createMockDocument(elements) {
    return {
        getElementById: (id) => elements[id] || null,
    };
}

test('facilities-modal-controller: closes modal directly or on backdrop click', () => {
    const modal = createMockElement('facilitiesModal');
    modal.classList.add('show');
    const doc = createMockDocument({ facilitiesModal: modal });
    const win = {};

    const controller = createFacilitiesModalController({
        document: doc,
        window: win,
        callWorker: async () => '[]',
        isWasmReady: () => true,
        recipeTableRenderer: { render: () => '' },
        recipeSearchController: { filter: () => {} },
    });

    controller.closeOnBackdrop({ target: { id: 'other' } });
    assert.equal(modal.classList.contains('show'), true);

    controller.closeOnBackdrop({ target: { id: 'facilitiesModal' } });
    assert.equal(modal.classList.contains('show'), false);

    modal.classList.add('show');
    controller.close();
    assert.equal(modal.classList.contains('show'), false);
});

test('facilities-modal-controller: notifies if optimizer is not ready on show', async () => {
    const modal = createMockElement('facilitiesModal');
    const hint = createMockElement('facilities-loading-hint');
    const doc = createMockDocument({
        facilitiesModal: modal,
        'facilities-loading-hint': hint,
    });
    const win = {};

    const controller = createFacilitiesModalController({
        document: doc,
        window: win,
        callWorker: async () => '[]',
        isWasmReady: () => false,
        recipeTableRenderer: { render: () => '' },
        recipeSearchController: { filter: () => {} },
    });

    await controller.show();
    assert.equal(modal.classList.contains('show'), true);
    assert.match(hint.textContent, /Optimizer not ready/);
});

test('facilities-modal-controller: fetches recipes once, renders and filters on ready', async () => {
    const modal = createMockElement('facilitiesModal');
    const hint = createMockElement('facilities-loading-hint');
    const container = createMockElement('facilities-modal-container');
    const doc = createMockDocument({
        facilitiesModal: modal,
        'facilities-loading-hint': hint,
        'facilities-modal-container': container,
    });
    const win = {};

    let workerCalls = 0;
    let filterCalls = 0;
    const sampleRecipes = [{ name: 'bread', tier: 1 }];

    const controller = createFacilitiesModalController({
        document: doc,
        window: win,
        callWorker: async (action) => {
            assert.equal(action, 'get_all_items');
            workerCalls++;
            return JSON.stringify(sampleRecipes);
        },
        isWasmReady: () => true,
        recipeTableRenderer: {
            render: (recipes) => {
                assert.deepEqual(recipes, sampleRecipes);
                return '<table>mock</table>';
            }
        },
        recipeSearchController: {
            filter: () => { filterCalls++; }
        },
    });

    await controller.show();
    assert.equal(workerCalls, 1);
    assert.equal(filterCalls, 1);
    assert.equal(container.innerHTML, '<table>mock</table>');
    assert.equal(hint.style.display, 'none');

    // Second show should not re-fetch
    await controller.show();
    assert.equal(workerCalls, 1);

    // Reset allows re-fetch
    controller.reset();
    await controller.show();
    assert.equal(workerCalls, 2);
});

test('facilities-modal-controller: displays error message if worker fails', async () => {
    const modal = createMockElement('facilitiesModal');
    const hint = createMockElement('facilities-loading-hint');
    const doc = createMockDocument({
        facilitiesModal: modal,
        'facilities-loading-hint': hint,
    });
    const win = {};

    const controller = createFacilitiesModalController({
        document: doc,
        window: win,
        callWorker: async () => { throw new Error('Worker crash'); },
        isWasmReady: () => true,
        recipeTableRenderer: { render: () => '' },
        recipeSearchController: { filter: () => {} },
    });

    await controller.show();
    assert.match(hint.textContent, /Failed to load recipe data/);
});
