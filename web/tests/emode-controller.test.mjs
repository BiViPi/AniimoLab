import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmodeSettingsController, createFacilityPartitionController, createPowerGaugeController, createWorksheetModeController } from '../emode-controller.js';
import { FACILITIES, getFacilityUnitWatts } from '../facility-config.js';
import { getTargetEmodeWatts, createWorksheetModeQuotaTracker } from '../emode-policy.js';
import { buildFacilityPlanRows } from '../facility-plan-row-renderer.js';
import { normalizePlanFacilityCounts } from '../plan-normalization.js';

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

test('onWorksheetModeClick calculates flexible cycle_time and rate for prismana and manual without hardcoding', async () => {
    const mockRecipeMap = new Map([
        ['malt_sugar', { name: 'malt_sugar', facility: 'Simmering Pot', workload: 243, emode_base_time: 162, aniimo: ['Fire', 3], yield_amount: 1 }],
    ]);
    const plan = {
        success: true,
        coin_items: [{
            facility: 'Simmering Pot (Electric)', item_name: 'malt_sugar', facility_count: 1,
            status: 'producing', mode: 'electric', is_emode: true,
            is_specialist: false, is_manual: false, cycle_time: 135.0,
        }],
    };
    let displayedPlan = null;
    const controller = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: new Set(),
        getPlan: () => plan,
        setPlan: value => Object.assign(plan, value),
        setEmodeCounts: () => {},
        setOverrides: () => {},
        getHomeLevel: () => 18,
        getGeneratorCapacity: () => 600,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: () => 0,
        updatePowerGauge: () => {},
        showSelectedPlan: () => { displayedPlan = structuredClone(plan); },
        showInvariantWarning: () => {},
        setButtonMode: () => {},
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => {},
        getRecipeMap: () => mockRecipeMap,
    });

    // 1. Chuyển sang Prismana -> Malt sugar cycle time giảm xuống 67.5s (53/h)
    await controller.onWorksheetModeClick('Simmering Pot', 'prismana', 1, 'electric', null, 0);
    assert.equal(displayedPlan.coin_items[0].mode, 'prismana');
    assert.equal(displayedPlan.coin_items[0].cycle_time, 67.5);
    assert.equal(Math.round(displayedPlan.coin_items[0].units_per_second * 3600), 53);

    // 2. Chuyển sang Thường (Manual) -> Malt sugar cycle time tăng lên 202.5s (18/h)
    await controller.onWorksheetModeClick('Simmering Pot', 'manual', 1, 'prismana', null, 0);
    assert.equal(displayedPlan.coin_items[0].mode, 'manual');
    assert.equal(displayedPlan.coin_items[0].cycle_time, 202.5);
    assert.equal(Math.round(displayedPlan.coin_items[0].units_per_second * 3600), 18);

    // 3. Chuyển lại sang Điện (Electric) -> Malt sugar cycle time là 135.0s (27/h)
    await controller.onWorksheetModeClick('Simmering Pot', 'electric', 1, 'manual', null, 0);
    assert.equal(displayedPlan.coin_items[0].mode, 'electric');
    assert.equal(displayedPlan.coin_items[0].cycle_time, 135.0);
    assert.equal(Math.round(displayedPlan.coin_items[0].units_per_second * 3600), 27);
});

test('onWorksheetModeClick correctly switches Woodworking Bench from manual to prismana updating timing and rates', async () => {
    const mockRecipeMap = new Map([
        ['rough_lumber', { name: 'rough_lumber', facility: 'Woodworking Bench', workload: 34, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
        ['laminated_beams', { name: 'laminated_beams', facility: 'Woodworking Bench', workload: 41, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
    ]);
    const plan = {
        success: true,
        coin_items: [
            { facility: 'Woodworking Bench (Electric)', item_name: 'laminated_beams', facility_count: 1, status: 'producing', mode: 'electric', cycle_time: 22.5, units_per_second: 1/22.5 },
            { facility: 'Woodworking Bench (Electric)', item_name: 'laminated_beams', facility_count: 1, status: 'producing', mode: 'electric', cycle_time: 22.5, units_per_second: 1/22.5 },
            { facility: 'Woodworking Bench (Manual)', item_name: 'rough_lumber', facility_count: 1, status: 'producing', mode: 'manual', cycle_time: 9.4, units_per_second: 1/9.4 },
            { facility: 'Woodworking Bench (Manual)', item_name: 'laminated_beams', facility_count: 1, status: 'producing', mode: 'manual', cycle_time: 11.4, units_per_second: 1/11.4 },
        ],
    };
    let displayedPlan = null;
    let overrides = [];
    const controller = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: new Set(),
        getPlan: () => plan,
        setPlan: value => { Object.assign(plan, value); },
        setEmodeCounts: () => {},
        setOverrides: value => { overrides = value; },
        getHomeLevel: () => 18,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: () => 30,
        updatePowerGauge: () => {},
        showSelectedPlan: () => { displayedPlan = structuredClone(plan); },
        showInvariantWarning: () => {},
        setButtonMode: () => {},
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => {},
        getRecipeMap: () => mockRecipeMap,
    });

    // Chuyển hàng thứ 3 (rough_lumber, index 2) sang prismana
    await controller.onWorksheetModeClick('Woodworking Bench', 'prismana', 1, 'manual', null, 2, 'rough_lumber');
    assert.equal(displayedPlan.coin_items[2].mode, 'prismana');
    assert.equal(displayedPlan.coin_items[2].cycle_time, 7.1);
    assert.equal(Math.round(displayedPlan.coin_items[2].units_per_second * 3600), 507);

    // Chuyển hàng thứ 4 (laminated_beams, index 3) sang prismana
    await controller.onWorksheetModeClick('Woodworking Bench', 'prismana', 1, 'manual', null, 3, 'laminated_beams');
    assert.equal(displayedPlan.coin_items[3].mode, 'prismana');
    assert.equal(displayedPlan.coin_items[3].cycle_time, 8.5);
    assert.equal(Math.round(displayedPlan.coin_items[3].units_per_second * 3600), 424);
});

test('regression: end-to-end flow from row renderer to controller with multi-product Woodworking Bench, lookup failure safety, and error rollback', async () => {
    const mockRecipeMap = new Map([
        ['rough_lumber', { name: 'rough_lumber', facility: 'Woodworking Bench', workload: 34, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
        ['laminated_beams', { name: 'laminated_beams', facility: 'Woodworking Bench', workload: 41, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
    ]);

    const initialPlan = {
        success: true,
        coin_items: [
            {
                facility: 'Woodworking Bench (Manual)',
                item_name: 'rough_lumber',
                facility_count: 1,
                status: 'producing',
                mode: 'manual',
                cycle_time: 9.4,
                units_per_second: 1 / 9.4,
                rate_per_second: 10,
                aniimo: { ability: 'Artisanship', level: 3 }
            },
            {
                facility: 'Woodworking Bench (Manual)',
                item_name: 'laminated_beams',
                facility_count: 1,
                status: 'producing',
                mode: 'manual',
                cycle_time: 11.4,
                units_per_second: 1 / 11.4,
                rate_per_second: 15,
                aniimo: { ability: 'Artisanship', level: 3 }
            }
        ],
        income_streams: [
            { item_name: 'rough_lumber', rate_per_second: 10, units_per_second: 1 / 9.4 },
            { item_name: 'laminated_beams', rate_per_second: 15, units_per_second: 1 / 11.4 }
        ]
    };

    let activePlan = structuredClone(initialPlan);
    let facilityOverrides = [];
    const buttonModeCalls = [];
    const loggedErrors = [];

    // Helper re-normalizing plan as showSelectedPlan does
    const normalizeAndDisplay = () => {
        normalizePlanFacilityCounts(activePlan, {
            selectedHomeLevel: () => 20,
            facilities: FACILITIES,
            categoryByName: new Map([['Woodworking Bench', 'Wood & Ore Processing']]),
            facilityOverrides,
            createWorksheetModeQuotaTracker,
            lastEmodeCounts: {},
            getOwnedFacilityCounts: () => ({ 'Woodworking Bench': 2 }),
            getFacilityLevel: () => 4,
            getRecipeMap: () => mockRecipeMap,
            getPowerGridRate: () => 1.2,
        });
    };

    const controller = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: new Set(),
        getPlan: () => activePlan,
        setPlan: value => { activePlan = value; },
        setEmodeCounts: () => {},
        setOverrides: value => { facilityOverrides = value; },
        getHomeLevel: () => 20,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: () => 0,
        updatePowerGauge: () => {},
        showSelectedPlan: () => { normalizeAndDisplay(); },
        showInvariantWarning: () => {},
        setButtonMode: (btn, mode) => { buttonModeCalls.push({ btn, mode }); },
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => {},
        logError: (...args) => { loggedErrors.push(args); },
        getRecipeMap: () => mockRecipeMap,
    });

    // 1. Build actual HTML rows via buildFacilityPlanRows
    const rendered = buildFacilityPlanRows({
        rows: activePlan.coin_items,
        isFarm: false,
        isVietnamese: true,
        homeLevel: 20,
        emodeAvailable: true,
        facilities: FACILITIES,
        facilityOverrides: [],
        lastEmodeCounts: {},
        powerWatts: { 'Woodworking Bench': 30 },
        ownedFacilityCounts: { 'Woodworking Bench': 2 },
        stepIndex: step => activePlan.coin_items.indexOf(step),
        renderFacilityIcon: name => `<i>${name}</i>`,
        renderItemIcon: name => `<i>${name}</i>`,
        getFacilityDisplayName: name => name,
        prettyItem: name => name,
        prettyReason: String,
        formatNumber: String,
        aniimoLabel: step => `${step.mode === 'prismana' ? 'Fulmintis' : 'Artisanship'} Lv.${step.mode === 'prismana' ? 4 : 3}`,
    });

    // Extract onclick calls from generated buttons
    const onclickRegex = /onclick="window\.onWorksheetModeClick\(([^)]+)\)"/g;
    const onclickCalls = [];
    let match;
    while ((match = onclickRegex.exec(rendered.html)) !== null) {
        const rawArgs = match[1].split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
        onclickCalls.push({
            facility: rawArgs[0],
            requestedMode: rawArgs[1],
            stepCount: Number(rawArgs[2]),
            currentModeParam: rawArgs[3],
            stepIndex: Number(rawArgs[5]),
            targetItemName: rawArgs[6] || '',
        });
    }

    // Must find pills with stepIndex and targetItemName for both products
    const roughPrismanaCall = onclickCalls.find(c => c.targetItemName === 'rough_lumber' && c.requestedMode === 'prismana');
    const laminatedPrismanaCall = onclickCalls.find(c => c.targetItemName === 'laminated_beams' && c.requestedMode === 'prismana');
    assert.ok(roughPrismanaCall, 'Row renderer must produce Prismana onclick for rough_lumber with item name');
    assert.ok(laminatedPrismanaCall, 'Row renderer must produce Prismana onclick for laminated_beams with item name');
    assert.equal(roughPrismanaCall.stepIndex, 0);
    assert.equal(laminatedPrismanaCall.stepIndex, 1);

    // 2. Click Prismana on laminated_beams (Row 1)
    const fakeBtnLaminated = { id: 'btn-laminated-prismana' };
    buttonModeCalls.length = 0;
    await controller.onWorksheetModeClick(
        laminatedPrismanaCall.facility,
        laminatedPrismanaCall.requestedMode,
        laminatedPrismanaCall.stepCount,
        laminatedPrismanaCall.currentModeParam,
        fakeBtnLaminated,
        laminatedPrismanaCall.stepIndex,
        laminatedPrismanaCall.targetItemName
    );

    // Verify row 1 switched to Prismana (8.5s) while row 0 remains Manual (9.4s)
    const stepLaminated = activePlan.coin_items.find(s => s.item_name === 'laminated_beams');
    const stepRough = activePlan.coin_items.find(s => s.item_name === 'rough_lumber');
    assert.equal(stepLaminated.mode, 'prismana');
    assert.equal(stepLaminated.facility, 'Woodworking Bench (Prismana)');
    assert.equal(stepLaminated.cycle_time, 8.5);
    assert.equal(Math.round(stepLaminated.units_per_second * 3600), 424);

    assert.equal(stepRough.mode, 'manual');
    assert.equal(stepRough.facility, 'Woodworking Bench (Manual)');
    assert.equal(stepRough.cycle_time, 9.4);
    assert.equal(Math.round(stepRough.units_per_second * 3600), 383);

    // Button mode is activated ONLY after successful update
    assert.deepEqual(buttonModeCalls, [{ btn: fakeBtnLaminated, mode: 'prismana' }]);

    // 3. Click Prismana on rough_lumber (Row 0)
    const fakeBtnRough = { id: 'btn-rough-prismana' };
    buttonModeCalls.length = 0;
    await controller.onWorksheetModeClick(
        roughPrismanaCall.facility,
        roughPrismanaCall.requestedMode,
        roughPrismanaCall.stepCount,
        roughPrismanaCall.currentModeParam,
        fakeBtnRough,
        roughPrismanaCall.stepIndex,
        roughPrismanaCall.targetItemName
    );

    // Both rows are now Prismana (7.1s and 8.5s)
    assert.equal(stepRough.mode, 'prismana');
    assert.equal(stepRough.facility, 'Woodworking Bench (Prismana)');
    assert.equal(stepRough.cycle_time, 7.1);
    assert.equal(Math.round(stepRough.units_per_second * 3600), 507);

    assert.equal(stepLaminated.mode, 'prismana');
    assert.equal(stepLaminated.facility, 'Woodworking Bench (Prismana)');
    assert.equal(stepLaminated.cycle_time, 8.5);

    // Re-run normalization to ensure Prismana is not reverted to manual
    normalizeAndDisplay();
    assert.equal(activePlan.coin_items[0].mode, 'prismana');
    assert.equal(activePlan.coin_items[0].cycle_time, 7.1);
    assert.equal(activePlan.coin_items[1].mode, 'prismana');
    assert.equal(activePlan.coin_items[1].cycle_time, 8.5);

    // 4. Test lookup failure: non-existent targetItemName must not fallback to first facility row
    buttonModeCalls.length = 0;
    loggedErrors.length = 0;
    const fakeBtnInvalid = { id: 'btn-invalid' };
    const savedState = JSON.stringify(activePlan);

    await controller.onWorksheetModeClick(
        'Woodworking Bench',
        'manual',
        1,
        'prismana',
        fakeBtnInvalid,
        999,
        'non_existent_item'
    );

    // Must NOT mutate any row and NOT touch button active state
    assert.equal(JSON.stringify(activePlan), savedState, 'Plan must remain untouched on lookup failure');
    assert.equal(buttonModeCalls.length, 0, 'setButtonMode must not be called when target step lookup fails');
    assert.ok(loggedErrors.length > 0, 'deps.logError must be called with lookup failure details');
    assert.match(loggedErrors[0][0], /Cannot find target worksheet step/);

    // 5. Test error rollback: if update throws, restore originalPlan and reset button mode
    const snapshotBeforeError = JSON.stringify(activePlan);
    const controllerWithError = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: new Set(),
        getPlan: () => activePlan,
        setPlan: value => { activePlan = value; },
        setEmodeCounts: () => {},
        setOverrides: () => {},
        getHomeLevel: () => 20,
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: () => 0,
        updatePowerGauge: () => {},
        showSelectedPlan: () => {},
        showInvariantWarning: () => {},
        setButtonMode: (btn, mode) => { buttonModeCalls.push({ btn, mode }); },
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => {},
        logError: (...args) => { loggedErrors.push(args); },
        getRecipeMap: () => { throw new Error('Simulated recipe error'); },
    });

    buttonModeCalls.length = 0;
    loggedErrors.length = 0;
    const fakeBtnCrash = { id: 'btn-crash' };

    await controllerWithError.onWorksheetModeClick(
        'Woodworking Bench',
        'manual',
        1,
        'prismana',
        fakeBtnCrash,
        0,
        'rough_lumber'
    );

    // Plan must be restored to snapshot and button mode restored to prevMode ('prismana')
    assert.equal(JSON.stringify(activePlan), snapshotBeforeError);
    assert.deepEqual(buttonModeCalls, [{ btn: fakeBtnCrash, mode: 'prismana' }]);
    assert.ok(loggedErrors.some(e => String(e[0]).includes('In-place worksheet update failed')));
});

test('regression: multi-step cycling across Manual <-> Prismana <-> Electric with ANIIMO_RESIDENT_FACILITIES and Homeland pieces builder', async () => {
    const { ANIIMO_RESIDENT_FACILITIES } = await import('../aniimo-resident-crew.js');
    const { createHomelandPiecesBuilder } = await import('../homeland-layout-view.js');
    const { FACILITY_FOOTPRINTS, FACILITY_POWER_WATTS, simpleSetup } = await import('../facility-config.js');

    const mockRecipeMap = new Map([
        ['rough_lumber', { name: 'rough_lumber', facility: 'Woodworking Bench', workload: 34, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
        ['laminated_beams', { name: 'laminated_beams', facility: 'Woodworking Bench', workload: 41, emode_base_time: 27, aniimo: ['Artisanship', 2], yield_amount: 1 }],
    ]);

    let activePlan = {
        success: true,
        coin_items: [
            {
                facility: 'Woodworking Bench',
                item_name: 'rough_lumber',
                facility_count: 1,
                status: 'producing',
                cycle_time: 7.1,
                yield_amount: 1,
            },
            {
                facility: 'Woodworking Bench',
                item_name: 'laminated_beams',
                facility_count: 1,
                status: 'producing',
                cycle_time: 8.5,
                yield_amount: 1,
            },
        ],
        income_streams: [],
    };

    let currentOverrides = [];
    let currentEmodeCounts = {};

    const normalizeAndVerify = () => {
        normalizePlanFacilityCounts(activePlan, {
            selectedHomeLevel: () => 16,
            facilityOverrides: currentOverrides,
            facilities: FACILITIES,
            categoryByName: new Map(),
            lastEmodeCounts: currentEmodeCounts,
            createWorksheetModeQuotaTracker,
            getOwnedFacilityCounts: () => ({ 'Woodworking Bench': 2 }),
            getRecipeMap: () => mockRecipeMap,
            getPowerGridRate: () => 1.2,
        });
    };

    // Initial normalization sets single-unit non-electric Woodworking Bench to manual (9.4s and 11.4s)
    normalizeAndVerify();
    assert.equal(activePlan.coin_items[0].mode, 'manual');
    assert.equal(activePlan.coin_items[0].cycle_time, 9.4);
    assert.equal(activePlan.coin_items[1].mode, 'manual');
    assert.equal(activePlan.coin_items[1].cycle_time, 11.4);

    const controller = createWorksheetModeController({
        facilities: FACILITIES,
        residentFacilities: { has: name => ANIIMO_RESIDENT_FACILITIES.has(name) },
        getPlan: () => activePlan,
        setPlan: value => { activePlan = value; },
        setEmodeCounts: value => { currentEmodeCounts = value; },
        setOverrides: value => { currentOverrides = value; },
        getHomeLevel: () => 16,
        getGeneratorCapacity: () => 2000,
        getPowerGridRate: () => 1.2,
        getTargetEmodeWatts,
        getSpecialistQuotas: () => ({}),
        getFacilityLevel: () => 4,
        calculatePowerWatts: () => 0,
        updatePowerGauge: () => {},
        getRecipeMap: () => mockRecipeMap,
        showSelectedPlan: () => normalizeAndVerify(),
        showInvariantWarning: () => {},
        setButtonMode: () => {},
        setResetButtonVisible: () => {},
        isVietnamese: () => true,
        alert: () => {},
        logError: () => {},
    });

    // Cycle rough_lumber: Manual -> Prismana -> Electric -> Manual
    await controller.onWorksheetModeClick('Woodworking Bench', 'prismana', 1, 'manual', null, 0, 'rough_lumber');
    assert.equal(activePlan.coin_items[0].mode, 'prismana');
    assert.equal(activePlan.coin_items[0].cycle_time, 7.1);
    assert.equal(activePlan.coin_items[1].mode, 'manual');
    assert.equal(activePlan.coin_items[1].cycle_time, 11.4);

    await controller.onWorksheetModeClick('Woodworking Bench', 'electric', 1, 'prismana', null, 0, 'rough_lumber');
    assert.equal(activePlan.coin_items[0].mode, 'electric');
    assert.equal(activePlan.coin_items[0].cycle_time, 22.5);
    assert.equal(activePlan.coin_items[1].mode, 'manual');
    assert.equal(activePlan.coin_items[1].cycle_time, 11.4);

    await controller.onWorksheetModeClick('Woodworking Bench', 'manual', 1, 'electric', null, 0, 'rough_lumber');
    assert.equal(activePlan.coin_items[0].mode, 'manual');
    assert.equal(activePlan.coin_items[0].cycle_time, 9.4);

    // Ensure Homeland pieces builder resolves suffixed facility footprints without unplaced errors
    const builder = createHomelandPiecesBuilder({
        environmentModeOrder: ['Warm', 'Scorching', 'Cool', 'Freeze', 'Adequate'],
        environmentBuildingSize: () => 2,
        getRecipes: () => [
            { name: 'rough_lumber', turns: true },
            { name: 'laminated_beams', turns: true },
        ],
        facilityFootprints: FACILITY_FOOTPRINTS,
        facilityPowerWatts: FACILITY_POWER_WATTS,
        simpleSetup,
        getHomeLevel: () => 16,
        isSimpleMode: () => true,
        getPowerPoleCount: () => 2,
        isEmodeActive: () => true,
    });
    const built = builder.build(activePlan, { home_level: 16 });
    assert.deepEqual(built.unplaced, []);
});
