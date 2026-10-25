import test from 'node:test';
import assert from 'node:assert/strict';
import { createHomelandLayoutView } from '../homeland-layout-view.js';

function createView(language = 'en') {
    return createHomelandLayoutView({
        getLanguage: () => language,
        getEnvironmentCoverageRadius: () => 4.5,
        getEnvironmentModeColors: () => ({ Adequate: '#22aa77' }),
        getEnvironmentModeShade: () => ({ Adequate: 0.55 }),
        getLayoutDistricts: () => [{ id: 'workshop', color: '#abcdef' }],
        homelandPlots: () => [{ number: 1, x: -5, y: -5, w: 10, h: 10 }, { number: 2, x: 5, y: -5, w: 10, h: 10 }],
        getFacilityDistrict: () => 'workshop',
        getFacilityDisplayName: name => name,
        getModeDisplayName: mode => `Mode ${mode}`,
        prettyItem: name => name,
        formatRate: value => `${value}/h`,
        tipAttrs: title => `data-tip="${title}"`,
        renderHomelandSvgFacility: member => `<rect data-facility="${member.facility}" />`,
        getFacilityIconUrl: () => '/storage.png',
    });
}

function layoutFixture() {
    return {
        storage: { x: 0, y: 0, w: 2, h: 2, role: 'central', label: 'Central SU' },
        pieces: [{ members: [
            { facility: 'Generator', x: 3, y: 3, w: 1, h: 1, generator: true, weight: 0 },
            { facility: 'Power Pole', x: 5, y: 3, w: 1, h: 1, powerPole: true, weight: 0 },
            { facility: 'Electric Pot', x: 4, y: 5, w: 1, h: 1, isElectric: true, weight: 12, jobs: [{ item: 'pie' }] },
            { facility: 'Cooling Unit', x: 8, y: 4, w: 2, h: 2, building: true, mode: 'Adequate', weight: 0 },
        ] }],
    };
}

test('Homeland SVG view renders plots, facility details, climate coverage, and power network', () => {
    const result = createView().render(layoutFixture(), 1, { whole: false, showMinorGrid: true });
    assert.match(result.svg, /class="layout-svg" viewBox=/);
    assert.match(result.svg, /class="minor-grid"/);
    assert.match(result.svg, /data-facility="Electric Pot"/);
    assert.match(result.svg, /data-tip="Electric Pot"/);
    assert.match(result.svg, /class="layout-plot locked"/);
    assert.match(result.svg, /layout-coverage-edges/);
    assert.match(result.svg, /Generator #1 \(11×11 · 1000W\)/);
    assert.match(result.svg, /Power Pole #1 \(7×7 Relay\)/);
    assert.match(result.svg, /Power Requirement Met ⚡/);
    assert.match(result.svg, /layout-storage-unit/);
    assert.deepEqual(result.viewBox, { x: -3, y: -3, w: 16, h: 12 });
    assert.equal(result.whole, false);
});

test('Homeland SVG view localizes labels and supports the full-island viewbox without mutating layout', () => {
    const layout = layoutFixture();
    const before = structuredClone(layout);
    const result = createView('vi').render(layout, 1, { whole: true, showMinorGrid: false });
    assert.match(result.svg, /Trụ điện #1/);
    assert.match(result.svg, /Cột điện #1/);
    assert.match(result.svg, /Đã đáp ứng yêu cầu ⚡/);
    assert.match(result.svg, />Lô 1</);
    assert.doesNotMatch(result.svg, /class="minor-grid"/);
    assert.deepEqual(result.viewBox, { x: -1, y: -1, w: 17, h: 7 });
    assert.equal(result.whole, true);
    assert.deepEqual(layout, before);
});
