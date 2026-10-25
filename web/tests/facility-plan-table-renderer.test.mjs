import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacilityPlanTableMarkup } from '../facility-plan-table-renderer.js';

const heading = (_key, fallback) => `H:${fallback}`;

test('farming table uses four columns, group bands, and injected row markup', () => {
    const result = buildFacilityPlanTableMarkup({
        groups: [{ label: 'North field', rows: [{ id: 1 }] }, { rows: [{ id: 2 }] }],
        isFarm: true,
        isVietnamese: true,
        hasOverrides: false,
        renderRows: rows => rows.map(row => `<tr data-row="${row.id}"></tr>`).join(''),
        heading,
    });
    assert.match(result, /farming-plots-table-wrapper/);
    assert.match(result, /colspan="4">North field/);
    assert.match(result, /H:Facility.*H:Count.*H:Producing.*H:Why/s);
    assert.match(result, /data-row="1".*data-row="2"/s);
    assert.doesNotMatch(result, /worksheet-toolbar/);
});

test('worksheet table uses six columns, localization, and reset visibility from overrides', () => {
    const result = buildFacilityPlanTableMarkup({
        groups: [{ label: 'Zone A', rows: [{ id: 'a' }] }],
        isFarm: false,
        isVietnamese: true,
        hasOverrides: true,
        renderRows: rows => rows.map(row => `<tr data-row="${row.id}"></tr>`).join(''),
        heading,
    });
    assert.match(result, /worksheet-toolbar/);
    assert.match(result, /Vuốt ngang để chỉnh Chế độ & xem Aniimo/);
    assert.match(result, /display: inline-flex/);
    assert.match(result, /<th>Chế độ<\/th>/);
    assert.match(result, /colspan="6">Zone A/);
    assert.match(result, /data-row="a"/);
});

test('worksheet table hides reset control when no overrides exist and localizes English scroll hint', () => {
    const result = buildFacilityPlanTableMarkup({
        groups: [{ rows: [] }],
        isFarm: false,
        isVietnamese: false,
        hasOverrides: false,
        renderRows: () => '',
        heading: (_key, fallback) => fallback,
    });
    assert.match(result, /Swipe horizontally for Modes & Aniimo/);
    assert.match(result, /display: none/);
    assert.match(result, /<th>Mode<\/th>/);
});
