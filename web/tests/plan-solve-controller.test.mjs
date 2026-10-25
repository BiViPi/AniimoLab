import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlanSolveController } from '../plan-solve-controller.js';

function createMockElement(id) {
    const el = {
        id,
        disabled: false,
        style: {},
        classList: {
            classes: new Set(),
            add(c) { this.classes.add(c); },
            remove(c) { this.classes.delete(c); },
            contains(c) { return this.classes.has(c); }
        },
        querySelector: (selector) => {
            if (!el.children) el.children = {};
            if (!el.children[selector]) {
                el.children[selector] = { style: {} };
            }
            return el.children[selector];
        }
    };
    return el;
}

function createMockDocument() {
    const elements = {
        'optimize-btn': createMockElement('optimize-btn'),
        'progress-bar-container': createMockElement('progress-bar-container'),
        'progress-bar-fill': createMockElement('progress-bar-fill'),
        'progress-bar-caption': createMockElement('progress-bar-caption'),
        'emode-simple-on': { checked: false },
    };
    return {
        getElementById: (id) => elements[id] || null,
        querySelector: () => null,
    };
}

test('plan-solve-controller: aborts with error when optimizer is not ready', async () => {
    let errorMsg = '';
    const controller = createPlanSolveController({
        document: createMockDocument(),
        isWasmReady: () => false,
        showError: msg => { errorMsg = msg; },
    });

    await controller.runFindPlan();
    assert.match(errorMsg, /Optimizer not ready/);
});

test('plan-solve-controller: runs successful solve flow, updates state and UI', async () => {
    const doc = createMockDocument();
    let currentRunId = 0;
    const plansBySetup = {};
    const calls = [];

    const controller = createPlanSolveController({
        document: doc,
        isWasmReady: () => true,
        showError: () => {},
        getPlanRunId: () => currentRunId,
        nextPlanRunId: () => ++currentRunId,
        resetPlansBySetup: () => {},
        resetRankingsBySetup: () => {},
        stopRanking: () => calls.push('stopRanking'),
        stopSetupSolve: () => calls.push('stopSetupSolve'),
        stopLayout: () => calls.push('stopLayout'),
        solverClient: { pendingCount: 0 },
        restartWorker: () => {},
        buildStrategyPlanInput: () => ({ facilities: {}, level_up: null }),
        isLevelUpStrategy: () => false,
        levelUpTarget: () => null,
        levelUpUnavailable: () => null,
        getLevelUpStock: () => ({}),
        getLevelUpStockAmount: () => 0,
        wantsAniipods: () => false,
        bestAniipod: () => null,
        getSkippedRecipes: () => new Set(),
        prettyItem: x => x,
        isSimpleMode: () => true,
        startProgress: () => calls.push('startProgress'),
        setStep: () => {},
        renderProgress: () => {},
        getProgress: () => ({ steps: [] }),
        selectedAniimoSetup: () => 'best',
        bestAniimoSetup: () => 'best',
        aniimoInput: () => ({ aniimo: 'best' }),
        selectedHomeLevel: () => 18,
        getUnlockedSpecial: () => [],
        getSelectedSeasonDishes: () => new Set(),
        activePriorities: () => [],
        seasonActive: () => false,
        isRV20Endgame: () => false,
        executePlanSolve: async () => ({
            cancelled: false,
            plan: { success: true, rate_per_second: 100 },
            emodeCounts: { Grill: 2 }
        }),
        callWorker: async () => JSON.stringify({ success: true }),
        solvePlanWithEmode: async () => {},
        allocateDynamicEmode: () => {},
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1,
        getTargetEmodeWatts: () => 1000,
        trialCountToPercent: () => 50,
        runPlanPruning: async () => {},
        integrateSeasonPlan: plan => plan,
        normalizePlanFacilityCounts: plan => plan,
        actualEmodeCounts: () => ({}),
        setLastEmodeCounts: counts => calls.push(['setLastEmodeCounts', counts]),
        setLastPlanInput: () => {},
        setLastPlan: () => {},
        finishSolveSteps: () => calls.push('finishSolveSteps'),
        setPlanForSetup: (setup, plan) => { plansBySetup[setup] = plan; },
        getPlanForSetup: (setup) => plansBySetup[setup],
        showSelectedPlan: () => calls.push('showSelectedPlan'),
        updatePowerGauge: () => calls.push('updatePowerGauge'),
    });

    await controller.runFindPlan();

    assert.ok(calls.includes('stopRanking'));
    assert.ok(calls.includes('startProgress'));
    assert.ok(calls.includes('finishSolveSteps'));
    assert.ok(calls.includes('showSelectedPlan'));
    assert.ok(plansBySetup['best']);
    assert.equal(plansBySetup['best'].success, true);
});

test('plan-solve-controller: handles error during solve and restores button state', async () => {
    const doc = createMockDocument();
    let currentRunId = 0;
    let reportedError = '';

    const controller = createPlanSolveController({
        document: doc,
        isWasmReady: () => true,
        showError: msg => { reportedError = msg; },
        getPlanRunId: () => currentRunId,
        nextPlanRunId: () => ++currentRunId,
        resetPlansBySetup: () => {},
        resetRankingsBySetup: () => {},
        stopRanking: () => {},
        stopSetupSolve: () => {},
        stopLayout: () => {},
        solverClient: { pendingCount: 0 },
        restartWorker: () => {},
        buildStrategyPlanInput: () => { throw new Error('Input crash'); },
        isLevelUpStrategy: () => false,
        levelUpTarget: () => null,
        levelUpUnavailable: () => null,
        getLevelUpStock: () => ({}),
        getLevelUpStockAmount: () => 0,
        wantsAniipods: () => false,
        bestAniipod: () => null,
        getSkippedRecipes: () => new Set(),
        prettyItem: x => x,
        isSimpleMode: () => true,
        startProgress: () => {},
        setStep: () => {},
        renderProgress: () => {},
        getProgress: () => ({ steps: [] }),
        selectedAniimoSetup: () => 'best',
        bestAniimoSetup: () => 'best',
        aniimoInput: () => ({}),
        selectedHomeLevel: () => 18,
        getUnlockedSpecial: () => [],
        getSelectedSeasonDishes: () => new Set(),
        activePriorities: () => [],
        seasonActive: () => false,
        isRV20Endgame: () => false,
        executePlanSolve: async () => {},
        callWorker: async () => '{}',
        solvePlanWithEmode: async () => {},
        allocateDynamicEmode: () => {},
        getGeneratorCapacity: () => 1000,
        getPowerGridRate: () => 1,
        getTargetEmodeWatts: () => 1000,
        trialCountToPercent: () => 50,
        runPlanPruning: async () => {},
        integrateSeasonPlan: plan => plan,
        normalizePlanFacilityCounts: plan => plan,
        actualEmodeCounts: () => ({}),
        setLastEmodeCounts: () => {},
        setLastPlanInput: () => {},
        setLastPlan: () => {},
        finishSolveSteps: () => {},
        setPlanForSetup: () => {},
        getPlanForSetup: () => null,
        showSelectedPlan: () => {},
        updatePowerGauge: () => {},
    });

    await controller.runFindPlan();

    assert.match(reportedError, /Input crash/);
    const btn = doc.getElementById('optimize-btn');
    assert.equal(btn.disabled, false);
});
