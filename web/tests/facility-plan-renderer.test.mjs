import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacilityPlanMarkup } from '../facility-plan-renderer.js';

function dependencies(overrides = {}) {
    return {
        environmentModeOrder: ['Warm', 'Cool'],
        splitByEnvironmentUnit: rows => rows.map((row, index) => ({
            building: row.environment === 'Warm' ? 'Heat Furnace' : 'Cooling Unit',
            layout: [`layout-${row.environment}`],
            rows: [row],
            mode: row.environment,
            zone: 0,
            partner: null,
        })),
        modeTag: mode => `[mode:${mode}]`,
        environmentRenderer: { renderDiagram: (_layout, mode) => `[diagram:${mode}]` },
        facilityPlanTableOf: groups => `[group-table:${groups.map(group => group.label).join(',')}]`,
        facilityPlanTable: rows => `[table:${rows.map(row => row.item_name).join(',')}]`,
        facilityCategories: ['Wood & Ore Processing', 'Materials', 'Aniimo Materials', 'Materials Processing'],
        facilityCategoryByName: new Map([
            ['Bench', 'Wood & Ore Processing'], ['Farm Mill', 'Materials'], ['Craft Table', 'Aniimo Materials'], ['Pot', 'Materials Processing'],
        ]),
        getFacilityDisplayName: name => name,
        isVietnamese: false,
        ...overrides,
    };
}

test('renders environment, unconditioned farming, then ordered producing categories', () => {
    const markup = buildFacilityPlanMarkup({ coin_items: [
        { environment: 'Warm', facility: 'Farmland', item_name: 'warm_crop', status: 'producing', facility_count: 1 },
        { facility: 'Bench', item_name: 'wood_item', status: 'producing' },
        { facility: 'Farmland', item_name: 'plain_crop', status: 'producing', facility_count: 2 },
        { facility: 'Pot', item_name: 'pot_item', status: 'producing' },
        { facility: 'Craft Table', item_name: 'craft_item', status: 'producing' },
    ] }, dependencies());
    assert.ok(markup.indexOf('[mode:Warm]') < markup.indexOf('Unconditioned Farm & Tree Plots'));
    assert.ok(markup.indexOf('Unconditioned Farm & Tree Plots') < markup.indexOf('Wood & Ore Processing'));
    assert.ok(markup.indexOf('Wood & Ore Processing') < markup.indexOf('Materials Production'));
    assert.ok(markup.indexOf('Materials Production') < markup.indexOf('Processing Facilities'));
    assert.match(markup, /plain_crop/);
    assert.match(markup, /\[table:warm_crop\]/);
});

test('keeps unmatched environment rows visible as orphan rows', () => {
    const markup = buildFacilityPlanMarkup({ coin_items: [
        { environment: 'Cool', facility: 'Woodland', item_name: 'cool_tree', status: 'producing', facility_count: 2 },
    ] }, dependencies({ splitByEnvironmentUnit: () => [] }));
    assert.match(markup, /\[table:cool_tree\]/);
    assert.match(markup, /\[mode:Cool\]/);
});

test('combines partner environment units into one overlap section', () => {
    const markup = buildFacilityPlanMarkup({ coin_items: [
        { environment: 'Warm', facility: 'Farmland', item_name: 'warm_crop', status: 'producing', facility_count: 1 },
        { environment: 'Cool', facility: 'Woodland', item_name: 'cool_tree', status: 'producing', facility_count: 1 },
    ] }, dependencies({
        splitByEnvironmentUnit: rows => {
            const mode = rows[0].environment;
            return [{
                building: 'Heat Furnace', partner: ['Cooling Unit', 4, 4], pairModes: ['Warm', 'Cool'],
                layout: [`layout-${mode}`], rows, mode, zone: mode === 'Warm' ? 0 : 1,
            }];
        },
    }));
    assert.match(markup, /Heat Furnace \[mode:Warm\].*Cooling Unit \[mode:Cool\]/s);
    assert.match(markup, /Overlap/);
    assert.match(markup, /\[group-table:\[mode:Warm\],\[mode:Cool\]\]/);
});

test('shows empty plan fallback', () => {
    assert.equal(buildFacilityPlanMarkup({ coin_items: [] }, dependencies()), '<p class="hint">Nothing profitable to produce with the current facilities.</p>');
});
