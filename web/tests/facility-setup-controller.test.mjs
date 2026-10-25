import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilitySetupController } from '../facility-setup-controller.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        style: {},
        ...initialProps,
    };
}

function createMockDocument(elements = {}) {
    return {
        getElementById(id) {
            return elements[id] || null;
        },
        querySelector(selector) {
            return elements[selector] || null;
        },
    };
}

test('facility-setup-controller: creates default facility tiers and initializes from saved data', () => {
    const facilities = [
        { name: 'Kitchen', defaultCount: 2, hasLevels: true },
        { name: 'Mine', defaultCount: 1, hasLevels: false },
    ];
    let tiers = {};
    const controller = createFacilitySetupController({
        facilities,
        getFacilityTiers: () => tiers,
        setFacilityTiers: val => { tiers = val; },
    });

    const defaults = controller.defaultFacilityTiers();
    assert.deepEqual(defaults, {
        Kitchen: [{ count: 2, level: 1 }],
        Mine: [{ count: 1, level: 1 }],
    });

    // Fresh init without data
    controller.initFacilityTiers(null);
    assert.deepEqual(tiers, defaults);

    // Init with saved data
    controller.initFacilityTiers({
        facilityTiers: {
            Kitchen: [{ count: 5, level: 3 }],
            Mine: [{ count: 2, level: 4 }], // Mine has hasLevels=false, should force level 1
        },
    });
    assert.deepEqual(tiers.Kitchen, [{ count: 5, level: 3 }]);
    assert.deepEqual(tiers.Mine, [{ count: 2, level: 1 }]);
});

test('facility-setup-controller: renderTierRows renders markup into container', () => {
    const facilities = [{ name: 'Kitchen', defaultCount: 1 }];
    const container = createMockElement('.facility-tiers[data-facility="Kitchen"]');
    const doc = createMockDocument({
        '.facility-tiers[data-facility="Kitchen"]': container,
    });

    const controller = createFacilitySetupController({
        document: doc,
        facilities,
        getFacilityTiers: () => ({ Kitchen: [{ count: 1, level: 1 }] }),
        buildTierRowsMarkup: (f, t) => `<div>Tiers:${f.name}-${t[0].count}</div>`,
    });

    controller.renderTierRows('Kitchen');
    assert.equal(container.innerHTML, '<div>Tiers:Kitchen-1</div>');
});

test('facility-setup-controller: renderFacilityCards builds grid and populates tiers', () => {
    const facilities = [{ name: 'Kitchen', defaultCount: 1 }];
    const grid = createMockElement('facilities-grid');
    const container = createMockElement('.facility-tiers[data-facility="Kitchen"]');
    const doc = createMockDocument({
        'facilities-grid': grid,
        '.facility-tiers[data-facility="Kitchen"]': container,
    });

    const controller = createFacilitySetupController({
        document: doc,
        facilities,
        categories: ['Cooking'],
        getFacilityTiers: () => ({ Kitchen: [{ count: 1, level: 1 }] }),
        buildFacilityCardsMarkup: () => '<div class="card">Kitchen Card</div>',
        buildTierRowsMarkup: () => '<div>Rows</div>',
    });

    controller.renderFacilityCards();
    assert.equal(grid.innerHTML, '<div class="card">Kitchen Card</div>');
    assert.equal(container.innerHTML, '<div>Rows</div>');
});
