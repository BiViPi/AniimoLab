import test from 'node:test';
import assert from 'node:assert/strict';
import { createAniimoSummaryController } from '../aniimo-summary-controller.js';

function createMockElement(id) {
    return {
        id,
        textContent: '',
        innerHTML: '',
        hidden: false,
        style: {},
        title: '',
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            toggle(c, force) {
                if (force) this.classes.add(c);
                else this.classes.delete(c);
            },
            contains(c) { return this.classes.has(c); }
        }
    };
}

function createMockDocument(elements) {
    return {
        getElementById: (id) => elements[id] || null,
    };
}

test('aniimo-summary-controller: delegates to renderRosterSummary when in custom tab', () => {
    let customCalled = false;
    const controller = createAniimoSummaryController({
        document: createMockDocument({}),
        window: {},
        abilities: [{ name: 'Fire', color: '#ff0000' }],
        facilities: [],
        environmentBuildingAbility: {},
        renderRosterSummary: () => { customCalled = true; },
        selectedSetupTab: () => 'custom',
        selectedHomeLevel: () => 18,
        selectedAniimoSetup: () => 'best',
        isSimpleMode: () => true,
        getProductionAniimoCap: () => 30,
        getPowerPoleCount: () => 2,
        getPowerProfile: () => ({ capacity: 1000, status: 'firm' }),
        calculatePowerWatts: () => 0,
        getLastEmodeCounts: () => ({}),
        getFacilityOverrides: () => [],
        getFacilityDisplayName: x => x,
        prettyItem: x => x,
        getFacilitySpecificWorker: () => null,
        taskLabel: () => 'Task',
        opposedPersonality: () => null,
        setLastBestTeam: () => {},
        getLanguage: () => 'vi',
    });

    controller.render({ success: true }, { tab: 'custom' });
    assert.equal(customCalled, true);
});

test('aniimo-summary-controller: toggles details expansion state and updates DOM', () => {
    const wrapper = createMockElement('roster-details-wrapper');
    const icon = createMockElement('roster-toggle-icon');
    const text = createMockElement('roster-toggle-text');
    const doc = createMockDocument({
        'roster-details-wrapper': wrapper,
        'roster-toggle-icon': icon,
        'roster-toggle-text': text,
    });
    const win = {};

    const controller = createAniimoSummaryController({
        document: doc,
        window: win,
        abilities: [{ name: 'Fire', color: '#ff0000' }],
        facilities: [],
        environmentBuildingAbility: {},
        renderRosterSummary: () => {},
        selectedSetupTab: () => 'best',
        selectedHomeLevel: () => 18,
        selectedAniimoSetup: () => 'best',
        isSimpleMode: () => true,
        getProductionAniimoCap: () => 30,
        getPowerPoleCount: () => 2,
        getPowerProfile: () => ({ capacity: 1000, status: 'firm' }),
        calculatePowerWatts: () => 0,
        getLastEmodeCounts: () => ({}),
        getFacilityOverrides: () => [],
        getFacilityDisplayName: x => x,
        prettyItem: x => x,
        getFacilitySpecificWorker: () => null,
        taskLabel: () => 'Task',
        opposedPersonality: () => null,
        setLastBestTeam: () => {},
        getLanguage: () => 'vi',
    });

    controller.attachGlobal();
    assert.equal(controller.isDetailsExpanded, false);

    controller.toggleDetails();
    assert.equal(controller.isDetailsExpanded, true);
    assert.equal(wrapper.style.display, 'block');
    assert.equal(icon.textContent, '▼');

    controller.toggleDetails();
    assert.equal(controller.isDetailsExpanded, false);
    assert.equal(wrapper.style.display, 'none');
    assert.equal(icon.textContent, '▶');
});

test('aniimo-summary-controller: renders standard summary with groups, abilities, and cap', () => {
    const container = createMockElement('aniimo-summary');
    const countHave = createMockElement('aniimo-count-have');
    const countOf = createMockElement('aniimo-count-of');
    const count = createMockElement('aniimo-count');
    const abilitiesEl = createMockElement('aniimo-abilities');
    const collapsedSummary = createMockElement('aniimo-collapsed-summary');

    const doc = createMockDocument({
        'aniimo-summary': container,
        'aniimo-count-have': countHave,
        'aniimo-count-of': countOf,
        'aniimo-count': count,
        'aniimo-abilities': abilitiesEl,
        'aniimo-collapsed-summary': collapsedSummary,
    });

    let bestTeamSet = false;
    const controller = createAniimoSummaryController({
        document: doc,
        window: {},
        abilities: [{ name: 'Fire', color: '#ff0000' }, { name: 'Lightning', color: '#ffff00' }],
        facilities: [
            { name: 'Farmland', ability: 'Grass' },
            { name: 'Well', ability: 'Water' },
        ],
        environmentBuildingAbility: {},
        abilityThemes: {},
        renderRosterWorkerBadge: () => '<span class="badge"></span>',
        renderRosterSummary: () => {},
        selectedSetupTab: () => 'best',
        selectedHomeLevel: () => 18,
        selectedAniimoSetup: () => 'best',
        isSimpleMode: () => true,
        getProductionAniimoCap: () => 30,
        getPowerPoleCount: () => 1,
        getPowerProfile: () => ({ capacity: 1000, status: 'firm' }),
        calculatePowerWatts: () => 100,
        getLastEmodeCounts: () => ({ Grill: 1 }),
        getFacilityOverrides: () => [],
        getFacilityDisplayName: x => `Fac: ${x}`,
        prettyItem: x => `Item: ${x}`,
        getFacilitySpecificWorker: () => null,
        taskLabel: () => 'Task',
        opposedPersonality: () => null,
        setLastBestTeam: (team) => { bestTeamSet = true; },
        getLanguage: () => 'vi',
    });

    const samplePlan = {
        success: true,
        coin_items: [
            { facility: 'Farmland', facility_count: 5, status: 'producing' },
            { facility: 'Well', facility_count: 1, status: 'producing' },
        ],
        steps: [],
        guard_staffing: [['Lightning', 1]],
    };

    controller.render(samplePlan, { tab: 'best' });

    assert.equal(bestTeamSet, true);
    assert.ok(countHave.textContent);
    assert.equal(countOf.textContent, 30);
    assert.ok(abilitiesEl.innerHTML);
    assert.ok(container.innerHTML);
});
