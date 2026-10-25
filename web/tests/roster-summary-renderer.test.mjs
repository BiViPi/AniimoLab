import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRosterSummaryMarkup } from '../roster-summary-renderer.js';

const fixture = overrides => ({
    roster: [{ name: 'Moss', count: 2, abilities: { Farming: 3 }, personalities: ['Calm'] }],
    busy: [1.5],
    where: [new Map([['Farmland', 2]])],
    guardDoubleCountingViolations: [],
    guardMappingErrors: [],
    working: 2,
    have: 2,
    isVi: false,
    rosterLabel: aniimo => aniimo.name,
    abilityTag: ability => `[${ability}]`,
    personalityLetter: () => 'C',
    ...overrides,
});

test('renders roster table, workload location and injected localized table labels', () => {
    const html = buildRosterSummaryMarkup(fixture({ isVi: true, labels: {
        aniimo: 'Sinh vật', howMany: 'Số lượng', busyAverage: 'Độ bận', where: 'Vị trí',
    } }));
    assert.match(html, /<table class="aniimo-table">/);
    assert.match(html, /Moss/);
    assert.match(html, /\[Farming\] 3 · C/);
    assert.match(html, /Farmland ×2/);
    assert.match(html, /Sinh vật/);
    assert.match(html, /2 of your 2 Aniimo have work in this plan\./);
});

test('renders both guard invariant and mapping warnings', () => {
    const html = buildRosterSummaryMarkup(fixture({
        guardDoubleCountingViolations: [{ name: 'Moss', existingBusy: 2, guardCount: 1, memberCount: 2 }],
        guardMappingErrors: [{ message: 'Unknown pole' }],
    }));
    assert.match(html, /Guard Assignment Invariant Violation/);
    assert.match(html, /2 work \+ 1 poles \/ 2 Aniimo/);
    assert.match(html, /Guard Mapping Warning/);
    assert.match(html, /Unknown pole/);
});

test('renders empty-roster guidance while retaining mapping warnings', () => {
    const html = buildRosterSummaryMarkup(fixture({
        roster: [],
        guardMappingErrors: [{ message: 'Invalid mapping' }],
    }));
    assert.match(html, /Add the Aniimo you have under My Aniimo/);
    assert.match(html, /Invalid mapping/);
    assert.doesNotMatch(html, /<table/);
});
