import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateWorkerSpeed, defaultEmodeBaseTime, calculateStepCycleTime, updateStepTimingAndCapacity } from '../step-timing.js';

test('calculateWorkerSpeed calculates processing and gathering speeds correctly', () => {
    // Processing, matching personality (+20%)
    // req 3, worker 4 -> above = 1 -> (2 + 1) * 1.2 = 3.6
    assert.equal(calculateWorkerSpeed(4, 3, false, true), 3.6);
    // req 3, worker 3 -> above = 0 -> 1.0 * 1.2 = 1.2
    assert.equal(calculateWorkerSpeed(3, 3, false, true), 1.2);
    // req 1, worker 4 -> above = 3 -> (2 + 3) * 1.2 = 6.0
    assert.equal(calculateWorkerSpeed(4, 1, false, true), 6.0);
    // req 1, worker 3 -> above = 2 -> (2 + 2) * 1.2 = 4.8
    assert.equal(calculateWorkerSpeed(3, 1, false, true), 4.8);
    // No personality bonus
    assert.equal(calculateWorkerSpeed(4, 3, false, false), 3.0);
    assert.equal(calculateWorkerSpeed(3, 3, false, false), 1.0);
});

test('calculateStepCycleTime calculates Cocoa Spread and Malt Sugar in Simmering Pot', () => {
    const mockRecipeMap = new Map([
        ['malt_sugar', { name: 'malt_sugar', facility: 'Simmering Pot', workload: 243, emode_base_time: 162, aniimo: ['Fire', 3], yield_amount: 1 }],
        ['cocoa_spread', { name: 'cocoa_spread', facility: 'Simmering Pot', workload: 324, emode_base_time: 216, aniimo: ['Fire', 3], yield_amount: 1 }],
    ]);

    // Malt Sugar (req 3, workload 243, emode_base_time 162)
    const maltStep = { facility: 'Simmering Pot', item_name: 'malt_sugar', facility_count: 1 };
    
    // Electric @ 1.2 rate -> 162 / 1.2 = 135.0s
    assert.equal(calculateStepCycleTime({ step: maltStep, targetMode: 'electric', recipeMap: mockRecipeMap, powerGridRate: 1.2 }), 135.0);
    // Prismana (Lv.4, req 3 -> speed 3.6) -> 243 / 3.6 = 67.5s
    assert.equal(calculateStepCycleTime({ step: maltStep, targetMode: 'prismana', recipeMap: mockRecipeMap }), 67.5);
    // Manual (Lv.3, req 3 -> speed 1.2) -> 243 / 1.2 = 202.5s
    assert.equal(calculateStepCycleTime({ step: maltStep, targetMode: 'manual', recipeMap: mockRecipeMap }), 202.5);

    // Cocoa Spread (req 3, workload 324, emode_base_time 216)
    const cocoaStep = { facility: 'Simmering Pot', item_name: 'cocoa_spread', facility_count: 1 };
    
    // Electric @ 1.2 rate -> 216 / 1.2 = 180.0s
    assert.equal(calculateStepCycleTime({ step: cocoaStep, targetMode: 'electric', recipeMap: mockRecipeMap, powerGridRate: 1.2 }), 180.0);
    // Prismana -> 324 / 3.6 = 90.0s
    assert.equal(calculateStepCycleTime({ step: cocoaStep, targetMode: 'prismana', recipeMap: mockRecipeMap }), 90.0);
    // Manual -> 324 / 1.2 = 270.0s
    assert.equal(calculateStepCycleTime({ step: cocoaStep, targetMode: 'manual', recipeMap: mockRecipeMap }), 270.0);
});

test('calculateStepCycleTime handles Mine and Well timings', () => {
    const mineStep = { facility: 'Mine', item_name: 'iron_ore', facility_count: 1 };
    assert.equal(calculateStepCycleTime({ step: mineStep, targetMode: 'electric', powerGridRate: 1.2 }), 1500.0);
    assert.equal(calculateStepCycleTime({ step: mineStep, targetMode: 'prismana' }), 1125.0);
    assert.equal(calculateStepCycleTime({ step: mineStep, targetMode: 'manual', homeLevel: 18 }), 1500.0);

    const wellStep = { facility: 'Well', item_name: 'fresh_water', facility_count: 1 };
    assert.equal(calculateStepCycleTime({ step: wellStep, targetMode: 'electric', powerGridRate: 1.2 }), 1500.0);
    assert.equal(calculateStepCycleTime({ step: wellStep, targetMode: 'prismana' }), 600.0);
    assert.equal(calculateStepCycleTime({ step: wellStep, targetMode: 'manual', homeLevel: 18 }), 1500.0);
});

test('updateStepTimingAndCapacity mutates step with cycle_time and units_per_second', () => {
    const mockRecipeMap = new Map([
        ['malt_sugar', { name: 'malt_sugar', facility: 'Simmering Pot', workload: 243, emode_base_time: 162, aniimo: ['Fire', 3], yield_amount: 1 }],
    ]);
    const step = { facility: 'Simmering Pot', item_name: 'malt_sugar', facility_count: 1, yield_amount: 1 };
    
    updateStepTimingAndCapacity(step, 'prismana', { recipeMap: mockRecipeMap });
    assert.equal(step.cycle_time, 67.5);
    assert.equal(Math.round(step.units_per_second * 3600), 53);

    updateStepTimingAndCapacity(step, 'manual', { recipeMap: mockRecipeMap });
    assert.equal(step.cycle_time, 202.5);
    assert.equal(Math.round(step.units_per_second * 3600), 18);

    updateStepTimingAndCapacity(step, 'electric', { recipeMap: mockRecipeMap, powerGridRate: 1.2 });
    assert.equal(step.cycle_time, 135.0);
    assert.equal(Math.round(step.units_per_second * 3600), 27);
});
