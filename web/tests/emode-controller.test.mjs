import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmodeSettingsController, createFacilityPartitionController, createPowerGaugeController, createWorksheetModeController } from '../emode-controller.js';
import { FACILITIES, getFacilityUnitWatts } from '../facility-config.js';
import { getTargetEmodeWatts } from '../emode-policy.js';

function fakeElement(properties = {}) {
    const listeners = new Map();
    return {
        style: {},
        value: '',
        checked: false,
        disabled: false,
        innerHTML: '',
        addEventListener(type, handler) { listeners.set(type, handler); },
        dispatch(type, event = {}) { listeners.get(type)?.({ target: this, ...event }); },
        ...properties,
    };
}

test('E-mode settings bind facility toggles and auto allocation then persist changes', () => {
    const checkboxA = fakeElement({ classList: { contains: value => value === 'facility-emode-checkbox' }, dataset: { facility: 'A' } });
    const checkboxB = fakeElement({ classList: { contains: value => value === 'facility-emode-checkbox' }, dataset: { facility: 'B' } });
    const nodes = new Map([
        ['facilities-grid', fakeElement()], ['emode-auto-btn', fakeElement()],
        ['emode-all-btn', fakeElement()], ['emode-none-btn', fakeElement()],
        ['power-grid-rate', fakeElement({ value: '100' })], ['simple-power-grid-rate', fakeElement({ value: '100' })],
        ['generator-capacity', fakeElement({ value: '600' })], ['simple-generator-capacity', fakeElement({ value: '600' })],
        ['emode-simple-on', fakeElement({ checked: true })], ['home-level', fakeElement()],
    ]);
    const document = {
        getElementById: id => nodes.get(id) || null,
        querySelectorAll: selector => selector === '.facility-emode-checkbox' ? [checkboxA, checkboxB] : [],
    };
    const emodeFacilities = new Set();
    let gaugeCalls = 0;
    let saveCalls = 0;
    const controller = createEmodeSettingsController({
        document, facilities: [{ name: 'A', supportsEmode: true }, { name: 'B', supportsEmode: true }],
        priority: ['B', 'A'], facilityPowerWatts: { A: 60, B: 40 }, facilityTiers: { A: [{ count: 1 }], B: [{ count: 1 }] },
        emodeFacilities, getTargetEmodeWatts: () => 100,
        updatePowerGauge: () => { gaugeCalls++; }, saveInputsToStorage: () => { saveCalls++; },
        getHomeLevel: () => 12, getDefaultGeneratorWatts: () => 600,
        getEmodeCounts: () => ({}), setEmodeCounts: () => {},
        getFacilityOverrides: () => [], setFacilityOverrides: () => {},
    });

    controller.attachEmodeHandlers();
    checkboxA.checked = true;
    nodes.get('facilities-grid').dispatch('change', { target: checkboxA });
    assert.equal(emodeFacilities.has('A'), true);
    nodes.get('emode-auto-btn').dispatch('click');
    assert.deepEqual([...emodeFacilities], ['B', 'A']);
    assert.equal(checkboxA.checked, true);
    assert.equal(checkboxB.checked, true);

    nodes.get('power-grid-rate').value = '120';
    nodes.get('power-grid-rate').dispatch('change');
    assert.equal(nodes.get('simple-power-grid-rate').value, '120');
    nodes.get('simple-generator-capacity').value = '800';
    nodes.get('simple-generator-capacity').dispatch('change');
    assert.equal(nodes.get('generator-capacity').value, '800');
    nodes.get('emode-all-btn').dispatch('click');
    assert.deepEqual([...emodeFacilities], ['B', 'A']);
    nodes.get('emode-none-btn').dispatch('click');
    assert.deepEqual([...emodeFacilities], []);
    assert.equal(checkboxA.checked, false);
    assert.equal(checkboxB.checked, false);
    assert.equal(gaugeCalls, 6);
    assert.equal(saveCalls, 6);
});

test('disabling E-mode below RV12 clears electric state and restores generator defaults', () => {
    const nodes = new Map([
        ['emode-simple-section', fakeElement()], ['emode-simple-on', fakeElement()],
        ['emode-simple-hint', fakeElement()], ['emode-simple-rate-field', fakeElement()],
        ['emode-simple-generator-field', fakeElement()], ['simple-power-gauge-container', fakeElement()],
        ['simple-generator-capacity', fakeElement()], ['generator-capacity', fakeElement()],
    ]);
    const navPill = fakeElement();
    const document = { getElementById: id => nodes.get(id) || null, querySelector: () => navPill };
    let emodeCounts = { Mine: 2, 'Simmering Pot': 1 };
    let overrides = [
        { facility: 'Mine', electric_count: 2, specialist_count: 1 },
        { facility: 'Simmering Pot', electric_count: 0, specialist_count: 2 },
    ];
    let gaugeCalls = 0;
    const controller = createEmodeSettingsController({
        document, facilities: [], priority: [], facilityPowerWatts: {}, facilityTiers: {}, emodeFacilities: new Set(),
        getTargetEmodeWatts: () => 500, updatePowerGauge: () => { gaugeCalls++; }, saveInputsToStorage() {},
        getHomeLevel: () => 11, getDefaultGeneratorWatts: () => 400,
        getEmodeCounts: () => emodeCounts, setEmodeCounts: value => { emodeCounts = value; },
        getFacilityOverrides: () => overrides, setFacilityOverrides: value => { overrides = value; },
    });

    controller.updateSimpleEmodeState();

    assert.equal(nodes.get('emode-simple-section').style.display, 'none');
    assert.equal(nodes.get('emode-simple-on').disabled, true);
    assert.equal(nodes.get('simple-generator-capacity').value, '400');
    assert.deepEqual(emodeCounts, {});
    assert.deepEqual(overrides.map(item => item.facility), ['Simmering Pot']);
    assert.equal(gaugeCalls, 1);
});

test('specialist quota controller clamps values to owned Mine/Well counts and persists edits', () => {
    const earth = fakeElement({ value: '5', min: '0', max: '8' });
    const water = fakeElement({ value: '2', min: '0', max: '8' });
    const earthStepper = fakeElement({ dataset: { stepSpecialist: 'earth_4p', stepDir: '1' } });
    const waterStepper = fakeElement({ dataset: { stepSpecialist: 'water_4f', stepDir: '-1' } });
    const nodes = new Map([['quota-earth-4p', earth], ['quota-water-4f', water]]);
    const document = {
        getElementById: id => nodes.get(id) || null,
        querySelectorAll: selector => selector === '.stepper-btn[data-step-specialist]' ? [earthStepper, waterStepper] : [],
    };
    let saveCalls = 0;
    const controller = createEmodeSettingsController({
        document, facilities: [], priority: [], facilityPowerWatts: {}, facilityTiers: {}, emodeFacilities: new Set(),
        getTargetEmodeWatts: () => 0, updatePowerGauge() {}, saveInputsToStorage: () => { saveCalls++; },
        getHomeLevel: () => 11, getDefaultGeneratorWatts: () => 400,
        getEmodeCounts: () => ({}), setEmodeCounts() {}, getFacilityOverrides: () => [], setFacilityOverrides() {},
        getSimpleSetup: () => ({ facilities: { Mine: [{ count: 2 }], Well: [{ count: 0 }] } }),
    });

    controller.updateSpecialistQuotasLimits(11);
    assert.equal(earth.max, '2');
    assert.equal(earth.value, '2');
    assert.equal(water.max, '0');
    assert.equal(water.value, '0');
    assert.equal(water.disabled, true);
    assert.deepEqual(controller.getSpecialistQuotas(), { earth_4p_mines: 2, water_4f_wells: 0 });

    controller.attachSpecialistQuotaHandlers();
    earthStepper.dispatch('click');
    assert.equal(earth.value, 2);
    assert.equal(saveCalls, 1);
});

test('active E-mode counts prefer actual state and respect simple toggle and home level', () => {
    const simpleToggle = fakeElement({ checked: false });
    const document = { getElementById: id => id === 'emode-simple-on' ? simpleToggle : null };
    let storedCounts = {};
    let homeLevel = 12;
    let allocatedArguments = null;
    const controller = createEmodeSettingsController({
        document, facilities: [], priority: [], facilityPowerWatts: {}, facilityTiers: {}, emodeFacilities: new Set(),
        getTargetEmodeWatts: () => 500, updatePowerGauge() {}, saveInputsToStorage() {},
        getHomeLevel: () => homeLevel, getDefaultGeneratorWatts: () => 600,
        getEmodeCounts: () => storedCounts, setEmodeCounts: value => { storedCounts = value; },
        getFacilityOverrides: () => [], setFacilityOverrides() {}, getSimpleSetup() {},
        autoAllocateEmode: (...args) => { allocatedArguments = args; return { Mine: 1 }; },
    });

    assert.deepEqual(controller.getActiveEmodeFacilityCounts(), {});
    simpleToggle.checked = true;
    assert.deepEqual(controller.getActiveEmodeFacilityCounts(['producing']), { Mine: 1 });
    assert.deepEqual(allocatedArguments, [12, 500, ['producing']]);
    assert.deepEqual(controller.getActiveEmodeFacilities(), ['Mine']);
    storedCounts = { 'Simmering Pot': 2 };
    assert.deepEqual(controller.getActiveEmodeFacilityCounts(), storedCounts);
    homeLevel = 11;
    storedCounts = {};
    assert.deepEqual(controller.getActiveEmodeFacilityCounts(), {});
});

test('partition apply rejects aggregate watt overflow without mutating overrides or counts', async () => {
    let emodeCounts = { 'Simmering Pot': 2 };
    let overrides = [{ facility: 'Simmering Pot', electric_count: 2, specialist_count: 0, manual_count: 0 }];
    const warningMessages = [];
    let closeCalls = 0;
    const controller = createFacilityPartitionController({
        getEmodeCounts: () => emodeCounts,
        getPlan: () => ({ coin_items: [] }),
        getOverrides: () => overrides,
        setEmodeCounts: counts => { emodeCounts = counts; },
        setOverrides: value => { overrides = value; },
        actualEmodeCounts: () => ({}),
        getGeneratorCapacity: () => 600,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        calculatePowerWatts: counts => (counts['Simmering Pot'] || 0) * 60,
        getFacilityLevel: () => 4,
        updatePowerGauge: () => assert.fail('rejected allocation must not update gauge'),
        closeModal: () => { closeCalls++; },
        setResetButtonVisible: () => assert.fail('rejected allocation must not update reset control'),
        runFastReSolve: () => assert.fail('rejected allocation must not solve'),
        showPowerWarning: ({ projectedWatts, maxWatts }) => warningMessages.push(`${projectedWatts}W exceeds ${maxWatts}W`),
    });

    const result = await controller.apply({ facility: 'Simmering Pot', electric: 13, prismana: 0, manual: 0 });

    assert.equal(result.accepted, false);
    assert.deepEqual(emodeCounts, { 'Simmering Pot': 2 });
    assert.equal(overrides[0].electric_count, 2);
    assert.equal(closeCalls, 0);
    assert.match(warningMessages[0], /780W.*500W/);
});

test('partition apply commits facility allocation while preserving other facility loads', async () => {
    let emodeCounts = { 'Jukebox Dryer': 1 };
    let overrides = [{ facility: 'Jukebox Dryer', electric_count: 1 }];
    let gaugeCounts = null;
    let solveCalls = 0;
    const controller = createFacilityPartitionController({
        getEmodeCounts: () => emodeCounts,
        getPlan: () => ({ coin_items: [] }),
        getOverrides: () => overrides,
        setEmodeCounts: counts => { emodeCounts = counts; },
        setOverrides: value => { overrides = value; },
        actualEmodeCounts: () => ({}),
        getGeneratorCapacity: () => 600,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        calculatePowerWatts: counts => (counts['Simmering Pot'] || 0) * 60 + (counts['Jukebox Dryer'] || 0) * 75,
        getFacilityLevel: () => 4,
        updatePowerGauge: counts => { gaugeCounts = counts; },
        closeModal: () => {},
        setResetButtonVisible: () => {},
        runFastReSolve: async () => { solveCalls++; return true; },
        showPowerWarning: () => assert.fail('valid allocation must not warn'),
    });

    const result = await controller.apply({ facility: 'Simmering Pot', electric: 1, prismana: 1, manual: 0 });

    assert.equal(result.accepted, true);
    assert.equal(result.solveSucceeded, true);
    assert.deepEqual(emodeCounts, { 'Jukebox Dryer': 1, 'Simmering Pot': 1 });
    assert.deepEqual(gaugeCounts, emodeCounts);
    assert.deepEqual(overrides.map(item => item.facility), ['Jukebox Dryer', 'Simmering Pot']);
    assert.equal(overrides[1].specialist_count, 1);
    assert.equal(solveCalls, 1);
});

test('power gauge keeps actual watts visible and flags load above the 120 percent cap', () => {
    const elements = new Map([
        ['simple-power-grid-rate', { value: '120' }],
        ['simple-power-gauge-value', { textContent: '' }],
        ['simple-power-gauge-fill', { style: {}, classList: { overload: false, toggle(_name, value) { this.overload = value; } } }],
        ['power-breakdown', { innerHTML: '' }],
    ]);
    const gauge = createPowerGaugeController({
        document: { getElementById: id => elements.get(id) || null },
        facilityPowerWatts: { 'Simmering Pot': 60 },
        getGeneratorCapacity: () => 600,
        getTargetEmodeWatts,
        calculatePowerWatts: counts => (counts['Simmering Pot'] || 0) * 60,
    });

    gauge.updatePowerGauge({ 'Simmering Pot': 13 });

    assert.equal(gauge.getPowerGridRate(), 1.2);
    assert.equal(elements.get('simple-power-gauge-value').textContent, '780W / 600W (100%) (120% cap: 500W)');
    assert.equal(elements.get('simple-power-gauge-fill').style.width, '100%');
    assert.equal(elements.get('simple-power-gauge-fill').classList.overload, true);
    assert.match(elements.get('power-breakdown').innerHTML, /= 780W/);
});

test('switching an electric worksheet row to Prismana updates row, overrides, and watt gauge together', async () => {
    const plan = {
        success: true,
        coin_items: [{
            facility: 'Simmering Pot (Electric)', item_name: 'stew', facility_count: 1,
            status: 'producing', mode: 'electric', is_emode: true,
            is_specialist: false, is_manual: false, cycle_time: 60,
        }],
    };
    let emodeCounts = { 'Simmering Pot': 1 };
    let overrides = [];
    let gaugeCounts = null;
    let displayedPlan = null;
    const controller = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: new Set(),
        getPlan: () => plan,
        setPlan: value => Object.assign(plan, value),
        setEmodeCounts: value => { emodeCounts = value; },
        setOverrides: value => { overrides = value; },
        getHomeLevel: () => 12,
        getGeneratorCapacity: () => 600,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: (counts, level) => Object.entries(counts)
            .reduce((sum, [name, count]) => sum + getFacilityUnitWatts(name, null, level) * count, 0),
        updatePowerGauge: counts => { gaugeCounts = counts; },
        showSelectedPlan: () => { displayedPlan = structuredClone(plan); },
        showInvariantWarning: () => assert.fail('valid mode change should not show a warning'),
        setButtonMode: () => {},
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => assert.fail('valid mode change should not alert'),
    });

    await controller.onWorksheetModeClick('Simmering Pot', 'prismana', 1, 'electric', null, 0);

    assert.equal(displayedPlan.coin_items[0].mode, 'prismana');
    assert.equal(displayedPlan.coin_items[0].facility, 'Simmering Pot (Prismana)');
    assert.equal(displayedPlan.coin_items[0].is_emode, false);
    assert.deepEqual(emodeCounts, {});
    assert.deepEqual(gaugeCounts, {});
    assert.deepEqual(overrides, [{
        facility: 'Simmering Pot', level: 4,
        target_mode: 'prismana', electric_count: 0, specialist_count: 1, manual_count: 0,
    }]);
});
