import test from 'node:test';
import assert from 'node:assert/strict';
import { createFacilityPartitionDialogController } from '../facility-partition-dialog.js';

function createMockElement(id, value = '') {
    return {
        id,
        value,
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        style: { display: '' },
        textContent: '',
        innerHTML: '',
        dataset: {},
    };
}

function createMockDocument(elements) {
    return {
        getElementById: (id) => elements[id] || null,
        querySelector: (selector) => {
            if (selector === '.partition-dialog-container') {
                return elements['partition-dialog-container'] || null;
            }
            return null;
        }
    };
}

test('facility-partition-dialog: does not open when plan is missing or unsuccessful', () => {
    const modal = createMockElement('facilityPartitionModal');
    const doc = createMockDocument({ facilityPartitionModal: modal });
    const win = {};

    const dialog = createFacilityPartitionDialogController({
        document: doc,
        window: win,
        getPlan: () => null,
        getEmodeCounts: () => ({}),
        getOverrides: () => [],
        setEmodeCounts: () => {},
        setOverrides: () => {},
        getOwnedFacilityCounts: () => ({ 'Blazing Stove': 2 }),
        getSpecialistQuotas: () => ({}),
        selectedHomeLevel: () => 18,
        getFacilityDisplayName: x => x,
        getFacilityLevel: () => 1,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1,
        getTargetEmodeWatts: () => 1000,
        calculatePowerWatts: () => 100,
        actualEmodeCounts: () => ({}),
        updatePowerGauge: () => {},
        runFastReSolve: async () => {},
        getLanguage: () => 'vi',
        facilities: [{ name: 'Blazing Stove', supportsEmode: true }],
        facilityPowerWatts: { 'Blazing Stove': 100 },
    });

    dialog.open('Blazing Stove');
    assert.equal(modal.classList.contains('show'), false);
});

test('facility-partition-dialog: opens, renders dialog content, and steps partition', () => {
    const modal = createMockElement('facilityPartitionModal');
    const titleEl = createMockElement('partition-modal-title');
    const subtitleEl = createMockElement('partition-modal-subtitle');
    const bodyEl = createMockElement('partition-modal-body');
    const container = createMockElement('partition-dialog-container');
    container.dataset.totalOwned = '2';

    const elE = createMockElement('part-val-electric', '0');
    const elP = createMockElement('part-val-prismana', '0');
    const elM = createMockElement('part-val-manual', '2');
    const sumTotal = createMockElement('part-summary-total');
    const sumWatts = createMockElement('part-summary-watts');

    const doc = createMockDocument({
        facilityPartitionModal: modal,
        'partition-modal-title': titleEl,
        'partition-modal-subtitle': subtitleEl,
        'partition-modal-body': bodyEl,
        'partition-dialog-container': container,
        'part-val-electric': elE,
        'part-val-prismana': elP,
        'part-val-manual': elM,
        'part-summary-total': sumTotal,
        'part-summary-watts': sumWatts,
    });
    const win = {};

    const dialog = createFacilityPartitionDialogController({
        document: doc,
        window: win,
        getPlan: () => ({ success: true, coin_items: [] }),
        getEmodeCounts: () => ({ 'Blazing Stove': 0 }),
        getOverrides: () => [],
        setEmodeCounts: () => {},
        setOverrides: () => {},
        getOwnedFacilityCounts: () => ({ 'Blazing Stove': 2 }),
        getSpecialistQuotas: () => ({}),
        selectedHomeLevel: () => 18,
        getFacilityDisplayName: x => `Tên: ${x}`,
        getFacilityLevel: () => 1,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1,
        getTargetEmodeWatts: () => 1000,
        calculatePowerWatts: () => 100,
        actualEmodeCounts: () => ({}),
        updatePowerGauge: () => {},
        runFastReSolve: async () => {},
        getLanguage: () => 'vi',
        facilities: [{ name: 'Blazing Stove', supportsEmode: true }],
        facilityPowerWatts: { 'Blazing Stove': 100 },
    });

    dialog.open('Blazing Stove');
    assert.equal(modal.classList.contains('show'), true);
    assert.match(titleEl.innerHTML, /Tên: Blazing Stove/);
    assert.match(bodyEl.innerHTML, /Chế độ điện/);

    // Step electric +1
    dialog.step('electric', 1);
    assert.equal(elE.value, 1);
    assert.equal(sumWatts.textContent, '100W');

    // Close
    dialog.close();
    assert.equal(modal.classList.contains('show'), false);
});

test('facility-partition-dialog: attaches global window helpers', () => {
    const doc = createMockDocument({});
    const win = {};

    const dialog = createFacilityPartitionDialogController({
        document: doc,
        window: win,
        getPlan: () => null,
        getEmodeCounts: () => ({}),
        getOverrides: () => [],
        setEmodeCounts: () => {},
        setOverrides: () => {},
        getOwnedFacilityCounts: () => ({}),
        getSpecialistQuotas: () => ({}),
        selectedHomeLevel: () => 18,
        getFacilityDisplayName: x => x,
        getFacilityLevel: () => 1,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1,
        getTargetEmodeWatts: () => 1000,
        calculatePowerWatts: () => 100,
        actualEmodeCounts: () => ({}),
        updatePowerGauge: () => {},
        runFastReSolve: async () => {},
        getLanguage: () => 'vi',
        facilities: [],
        facilityPowerWatts: {},
    });

    dialog.attachGlobal();
    assert.equal(typeof win.openFacilityPartitionModal, 'function');
    assert.equal(typeof win.stepPartition, 'function');
    assert.equal(typeof win.applyFacilityPartition, 'function');
    assert.equal(typeof win.closeFacilityPartitionModal, 'function');
    assert.equal(typeof win.closeFacilityPartitionOnBackdrop, 'function');
});
