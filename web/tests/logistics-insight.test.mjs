import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLogisticsInsight } from '../logistics-insight.js';

const base = overrides => ({
    isVi: false,
    producing: [],
    lastPlanInput: null,
    lastEmodeCounts: {},
    suCount: 3,
    getGeneratorCapacity: () => 600,
    calculatePowerWatts: counts => Object.values(counts || {}).reduce((a, b) => a + b, 0) * 60,
    ...overrides,
});

test('builds standard-mode and localized distributed-storage logistics copy', () => {
    const result = buildLogisticsInsight(base({ isVi: true, suCount: 2 }));
    assert.equal(result.title, '⚡ Vận hành điện lưới & Hậu cần đa kho');
    assert.match(result.description, /Chế độ thủ công tiêu chuẩn/);
    assert.match(result.description, /2 Kho lưu trữ phân tán/);
});

test('reports active electric production using actual producing count and current E-mode counts', () => {
    const result = buildLogisticsInsight(base({
        producing: [
            { is_emode: true, facility_count: 2 },
            { facility: 'Pot (Electric)', facility_count: 1 },
            { facility: 'Stove (Prismana)', facility_count: 4 },
        ],
        lastEmodeCounts: { Pot: 3 },
        calculatePowerWatts: counts => counts.Pot * 75,
    }));
    assert.match(result.description, /3 machines & facilities<\/strong> \(225W \/ 600W\)/);
    assert.match(result.description, /3 distributed Storage Units/);
});

test('falls back to saved E-mode facility counts when plan rows are absent', () => {
    const result = buildLogisticsInsight(base({
        lastPlanInput: { emode_facility_counts: { Pot: 2, Stove: 1 } },
        calculatePowerWatts: counts => counts.Pot * 60 + counts.Stove * 75,
    }));
    assert.match(result.description, /3 machines & facilities<\/strong> \(195W \/ 600W\)/);
});
