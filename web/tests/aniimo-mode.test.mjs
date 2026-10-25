import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAniimoCrewStepMode } from '../aniimo-mode.js';

const overrides = [{ facility: 'Simmering Pot', target_mode: 'electric' }];

test('crew mode uses explicit step mode before all inferred markers', () => {
    assert.equal(resolveAniimoCrewStepMode({ step: { mode: 'manual', is_emode: true }, baseFacility: 'Simmering Pot', emodeAvailable: true, overrides }), 'manual');
});

test('crew mode recognizes electric, manual, and Prismana legacy markers in priority order', () => {
    assert.equal(resolveAniimoCrewStepMode({ step: { is_emode: true }, baseFacility: 'Simmering Pot', emodeAvailable: true }), 'electric');
    assert.equal(resolveAniimoCrewStepMode({ step: { facility: 'Simmering Pot (Manual)' }, baseFacility: 'Simmering Pot', emodeAvailable: true }), 'manual');
    assert.equal(resolveAniimoCrewStepMode({ step: { item_name: 'ore__specialist' }, baseFacility: 'Simmering Pot', emodeAvailable: true }), 'prismana');
});

test('crew mode applies facility override only after step markers and defaults to Prismana', () => {
    assert.equal(resolveAniimoCrewStepMode({ step: {}, baseFacility: 'Simmering Pot', emodeAvailable: true, overrides }), 'electric');
    assert.equal(resolveAniimoCrewStepMode({ step: {}, baseFacility: 'Unknown', emodeAvailable: true }), 'prismana');
});

test('crew mode does not treat electric flags as electric below RV12', () => {
    assert.equal(resolveAniimoCrewStepMode({ step: { is_emode: true }, baseFacility: 'Simmering Pot', emodeAvailable: false }), 'prismana');
});
