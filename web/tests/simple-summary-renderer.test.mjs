import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSimpleSummaryViewModel } from '../simple-summary-renderer.js';

const options = {
    facilityDefinitions: [
        { name: 'Mine', hasLevels: true },
        { name: 'Well', hasLevels: false },
    ],
    facilities: { Mine: [{ count: 2, level: 3 }], Well: [{ count: 1, level: 1 }] },
    modules: { ecological_module: 0, kitchen_module: 1, resource_detector: 0, crafting_module: 2, power_module: 3, plant_research_module: 1, incubation_reaction_module: 0, signal_emitter: 0 },
    moduleUnlocks: { power_module: [12, 14, 16, 18, 20] },
    moduleNames: ['Ecological Module', 'Kitchen Module', 'Resource Detector', 'Crafting Module', 'power_module', 'plant_research_module', 'incubation_reaction_module', 'signal_emitter'],
    homeLevel: 14,
    isVietnamese: false,
    getFacilityDisplayName: name => `Facility ${name}`,
    getModuleDisplayName: name => `Module ${name}`,
};

test('simple summary reports built facility kinds, all module slots, unlock levels, and tiers', () => {
    const result = buildSimpleSummaryViewModel(options);
    assert.equal(result.title, '2 facilities and 8 modules at RV 14');
    assert.match(result.html, /chip-count">2×<\/span> Facility Mine.*Lv\.3/s);
    assert.match(result.html, /chip-count">1×<\/span> Facility Well/);
    assert.match(result.html, /Unlocks: Lv\.1 at RV 12, Lv\.2 at RV 14/);
    assert.match(result.html, /Module signal_emitter.*not yet/s);
});

test('simple summary localizes headings, unavailable module text, and unlock descriptions', () => {
    const result = buildSimpleSummaryViewModel({ ...options, isVietnamese: true });
    assert.equal(result.title, '2 cơ sở và 8 mô-đun tại RV 14');
    assert.match(result.html, /<p class="assume-title">Cơ sở<\/p>/);
    assert.match(result.html, /chưa mở/);
    assert.match(result.html, /Mở khóa: Lv\.1 tại RV 12/);
});

test('simple summary includes no facilities as built when all owned counts are zero', () => {
    const result = buildSimpleSummaryViewModel({
        ...options,
        facilities: { Mine: [{ count: 0, level: 3 }], Well: [{ count: 0, level: 1 }] },
    });
    assert.equal(result.title, '0 facilities and 8 modules at RV 14');
    assert.match(result.html, /<div class="chip-grid"><\/div>/);
});
