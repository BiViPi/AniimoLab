import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomelandUIController } from '../homeland-ui-controller.js';

function createMockElement(id = '', tag = 'div') {
    return {
        id,
        tagName: tag.toUpperCase(),
        innerHTML: '',
        textContent: '',
        style: {},
        value: '3',
        checked: false,
        listeners: {},
        addEventListener(event, fn) {
            this.listeners[event] = this.listeners[event] || [];
            this.listeners[event].push(fn);
        },
        querySelector() {
            return null;
        },
        querySelectorAll() {
            return [];
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

test('homeland-ui-controller: calculates homelandPlots correctly', () => {
    const plotsGrid = [[1, 2], [3, 4]];
    const plotSize = { w: 10, h: 10 };

    const controller = createHomelandUIController({
        document: createMockDocument(),
        window: {},
        homelandPlots: plotsGrid,
        homelandPlotSize: plotSize,
        facilityFootprints: {},
        facilityPowerWatts: {},
        environmentModeOrder: [],
        environmentModeColors: {},
        environmentModeShade: {},
        environmentCoverageRadius: 2,
        layoutDistricts: [],
        getLastPlan: () => null,
        getLastPlanInput: () => null,
        isSimpleMode: () => true,
        selectedHomeLevel: () => 1,
        homeLevelCovering: () => 1,
        getPowerPoleCount: () => 0,
        isEmodeActive: () => false,
        getRecipes: () => [],
        environmentBuildingSize: () => null,
        simpleSetup: () => ({}),
        getFacilityDistrict: () => '',
        getFacilityDisplayName: x => x,
        getModeDisplayName: x => x,
        prettyItem: x => x,
        formatRate: x => String(x),
        formatNumber: x => String(x),
        tipAttrs: () => '',
        renderHomelandSvgFacility: () => '',
        getFacilityIconUrl: () => '',
        setStep: () => {},
    });

    const plots = controller.homelandPlots();
    assert.equal(plots.length, 4);
    assert.deepEqual(plots[0], { number: 1, x: 0, y: 0, w: 10, h: 10 });
    assert.deepEqual(plots[1], { number: 2, x: 10, y: 0, w: 10, h: 10 });
    assert.deepEqual(plots[2], { number: 3, x: 0, y: 10, w: 10, h: 10 });
    assert.deepEqual(plots[3], { number: 4, x: 10, y: 10, w: 10, h: 10 });
});

test('homeland-ui-controller: hides layout-card when plan is unsuccessful or lastPlanInput is missing', () => {
    const doc = createMockDocument();
    const controller = createHomelandUIController({
        document: doc,
        window: {},
        homelandPlots: [],
        homelandPlotSize: { w: 1, h: 1 },
        facilityFootprints: {},
        facilityPowerWatts: {},
        environmentModeOrder: [],
        environmentModeColors: {},
        environmentModeShade: {},
        environmentCoverageRadius: 2,
        layoutDistricts: [],
        getLastPlan: () => null,
        getLastPlanInput: () => null,
        isSimpleMode: () => true,
        selectedHomeLevel: () => 1,
        homeLevelCovering: () => 1,
        getPowerPoleCount: () => 0,
        isEmodeActive: () => false,
        getRecipes: () => [],
        environmentBuildingSize: () => null,
        simpleSetup: () => ({}),
        getFacilityDistrict: () => '',
        getFacilityDisplayName: x => x,
        getModeDisplayName: x => x,
        prettyItem: x => x,
        formatRate: x => String(x),
        formatNumber: x => String(x),
        tipAttrs: () => '',
        renderHomelandSvgFacility: () => '',
        getFacilityIconUrl: () => '',
        setStep: () => {},
    });

    controller.renderHomelandLayout({ success: false });
    assert.equal(doc.getElementById('layout-card').style.display, 'none');
});

test('homeland-ui-controller: stopLayout resets lastLayout and simulation', () => {
    const doc = createMockDocument();
    const controller = createHomelandUIController({
        document: doc,
        window: {},
        homelandPlots: [],
        homelandPlotSize: { w: 1, h: 1 },
        facilityFootprints: {},
        facilityPowerWatts: {},
        environmentModeOrder: [],
        environmentModeColors: {},
        environmentModeShade: {},
        environmentCoverageRadius: 2,
        layoutDistricts: [],
        getLastPlan: () => null,
        getLastPlanInput: () => null,
        isSimpleMode: () => true,
        selectedHomeLevel: () => 1,
        homeLevelCovering: () => 1,
        getPowerPoleCount: () => 0,
        isEmodeActive: () => false,
        getRecipes: () => [],
        environmentBuildingSize: () => null,
        simpleSetup: () => ({}),
        getFacilityDistrict: () => '',
        getFacilityDisplayName: x => x,
        getModeDisplayName: x => x,
        prettyItem: x => x,
        formatRate: x => String(x),
        formatNumber: x => String(x),
        tipAttrs: () => '',
        renderHomelandSvgFacility: () => '',
        getFacilityIconUrl: () => '',
        setStep: () => {},
    });

    controller.stopLayout();
    assert.equal(controller.getLastLayout(), null);
});
