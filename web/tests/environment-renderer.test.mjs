import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentRenderer } from '../environment-renderer.js';

function createRenderer(language = 'en') {
    return createEnvironmentRenderer({
        environmentBuildingSize: name => ({ 'Heat Furnace': 1, 'Cooling Unit': 2, Sunlamp: 1 }[name] ?? 2),
        coverageRadius: 4.5,
        modeColors: { Warm: '#f59e0b', Scorching: '#ef4444', Cool: '#67e8f9', Freeze: '#2563eb', Adequate: '#facc15' },
        modeShade: { Adequate: 0.55 },
        facilityColors: { Farmland: '#8b5e34', Woodland: '#4caf50' },
        getLanguage: () => language,
        tipAttrs: (title, options = {}) => `data-tip="${title}" data-detail="${options.detail || ''}"`,
        getFacilityDisplayName: name => language === 'vi' ? ({ Farmland: 'Đất trồng', 'Heat Furnace': 'Lò nhiệt' }[name] || name) : name,
        getModeDisplayName: mode => language === 'vi' ? ({ Warm: 'Ấm', Scorching: 'Nóng', Adequate: 'Đầy đủ' }[mode] || mode) : mode,
        prettyItem: name => language === 'vi' ? ({ Apple: 'Táo', Wheat: 'Lúa mì' }[name] || name) : name,
    });
}

test('environment renderer creates a localized single-building diagram and matches plots to crop rows without mutation', () => {
    const layout = [{ facility: 'Farmland', x: -1, y: 0, size: 2 }];
    const rows = [{ facility: 'Farmland', item_name: 'Apple', facility_count: 1 }];
    const before = structuredClone({ layout, rows });
    const html = createRenderer('vi').renderDiagram(layout, 'Warm', 'Heat Furnace', rows);

    assert.match(html, /<svg viewBox="-9 -9 19 19"/);
    assert.match(html, /class="env-grid"/);
    assert.match(html, /fill="#f59e0b"/);
    assert.match(html, /data-tip="Đất trồng" data-detail="Táo"/);
    assert.match(html, /Lò nhiệt/);
    assert.match(html, /Phạm vi Ấm/);
    assert.match(html, /class="quarter"/);
    assert.deepEqual({ layout, rows }, before);
});

test('environment renderer draws paired buildings, overlap zones, and doubled strong-mode icons', () => {
    const unit = { partner: ['Cooling Unit', 2, -1], pairModes: ['Scorching', 'Freeze'], zone: 1 };
    const zones = [
        { mode: 'Scorching', zone: 0, layout: [{ facility: 'Farmland', x: 0, y: 0, size: 2 }, { facility: 'Farmland', x: 2, y: 0, size: 2 }], rows: [{ facility: 'Farmland', item_name: 'Apple', facility_count: 1 }, { facility: 'Farmland', item_name: 'Wheat', facility_count: 1 }] },
        { mode: 'Warm', zone: 1, layout: [{ facility: 'Woodland', x: 2, y: 0, size: 2 }], rows: [{ facility: 'Woodland', item_name: 'Wheat', facility_count: 1 }] },
        { mode: 'Freeze', zone: 2, layout: [], rows: [] },
    ];
    const html = createRenderer().renderDiagram(zones.flatMap(zone => zone.layout), 'Warm', 'Heat Furnace', zones.flatMap(zone => zone.rows), unit, zones);

    assert.equal((html.match(/class="env-building"/g) || []).length, 2);
    assert.equal((html.match(/class="env-coverage-top"/g) || []).length, 3);
    assert.equal((html.match(/<path d=/g) || []).length, 2);
    assert.match(html, /Cooling Unit/);
    assert.match(html, /<b>1<\/b>/);
    assert.match(html, /<b>2<\/b>/);
    assert.match(html, /fill-rule="evenodd"/);
});

test('environment renderer returns empty markup when there are no plots', () => {
    assert.equal(createRenderer().renderDiagram([], 'Warm', 'Heat Furnace'), '');
    assert.equal(createRenderer().renderDiagram(null, 'Warm', 'Heat Furnace'), '');
});
