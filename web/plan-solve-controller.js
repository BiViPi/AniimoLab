export function createPlanSolveController({
    document,
    isWasmReady,
    showError,
    getPlanRunId,
    nextPlanRunId,
    resetPlansBySetup,
    resetRankingsBySetup,
    stopRanking,
    stopSetupSolve,
    stopLayout,
    solverClient,
    restartWorker,
    buildStrategyPlanInput,
    isLevelUpStrategy,
    levelUpTarget,
    levelUpUnavailable,
    getLevelUpStock,
    getLevelUpStockAmount,
    wantsAniipods,
    bestAniipod,
    getSkippedRecipes,
    prettyItem,
    isSimpleMode,
    startProgress,
    setStep,
    renderProgress,
    getProgress,
    selectedAniimoSetup,
    bestAniimoSetup,
    aniimoInput,
    selectedHomeLevel,
    getUnlockedSpecial,
    getSelectedSeasonDishes,
    activePriorities,
    seasonActive,
    isRV20Endgame,
    executePlanSolve,
    callWorker,
    solvePlanWithEmode,
    allocateDynamicEmode,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    trialCountToPercent,
    runPlanPruning,
    integrateSeasonPlan,
    normalizePlanFacilityCounts,
    actualEmodeCounts,
    setLastEmodeCounts,
    setLastPlanInput,
    setPlanContext,
    setLastPlan,
    finishSolveSteps,
    setPlanForSetup,
    getPlanForSetup,
    showSelectedPlan,
    updatePowerGauge,
}) {
    async function runFindPlan() {
        if (!isWasmReady()) {
            showError('Optimizer not ready. Please wait...');
            return;
        }

        const btn = document.getElementById('optimize-btn');
        const btnText = btn?.querySelector?.('.btn-text');
        const btnLoading = btn?.querySelector?.('.btn-loading');
        const progressBar = document.getElementById('progress-bar-container');
        const progressFill = document.getElementById('progress-bar-fill');
        const progressCaption = document.getElementById('progress-bar-caption');

        if (btn) btn.disabled = true;
        if (btnText?.style) btnText.style.display = 'none';
        if (btnLoading?.style) btnLoading.style.display = 'inline';
        if (progressBar?.style) progressBar.style.display = 'none';
        if (progressCaption?.style) progressCaption.style.display = 'none';
        if (progressFill?.style) progressFill.style.width = '';

        const runId = nextPlanRunId();
        resetPlansBySetup();
        resetRankingsBySetup();
        stopRanking();
        stopSetupSolve();
        stopLayout();
        if (solverClient && solverClient.pendingCount > 0 && typeof restartWorker === 'function') {
            restartWorker();
        }

        try {
            const input = buildStrategyPlanInput();
            setLastPlanInput(input);
            const levelUpStock = typeof getLevelUpStock === 'function' ? getLevelUpStock() : {};
            const skippedRecipes = typeof getSkippedRecipes === 'function' ? getSkippedRecipes() : new Set();
            const planContext = {
                levelUp: isLevelUpStrategy(),
                target: levelUpTarget(),
                unavailable: levelUpUnavailable(),
                ready: !!(input.level_up && input.level_up.cost.every(([name, need]) => getLevelUpStockAmount(levelUpStock, name) >= need)),
                aniipod: wantsAniipods() ? bestAniipod() : null,
                hasPolisher: (input.facilities['Dance Pad Polisher'] || []).some(t => t.count > 0),
                skipped: [...skippedRecipes].sort((a, b) => prettyItem(a).localeCompare(prettyItem(b))),
                simple: isSimpleMode(),
            };
            if (typeof setPlanContext === 'function') setPlanContext(planContext);
            startProgress(input, runId);

            const currentSetup = selectedAniimoSetup();
            const bestSetup = currentSetup === 'minimum' ? bestAniimoSetup() : currentSetup;
            Object.assign(input, aniimoInput(bestSetup));

            const emodeSimpleOn = document.getElementById('emode-simple-on')?.checked ?? true;
            const currentRv = selectedHomeLevel();
            const useEmode = emodeSimpleOn && currentRv >= 12;

            const unlockedSpecial = typeof getUnlockedSpecial === 'function' ? getUnlockedSpecial() : [];
            const selectedSeasonDishes = typeof getSelectedSeasonDishes === 'function' ? getSelectedSeasonDishes() : new Set();
            const pruningOptions = {
                unlockedSpecial: unlockedSpecial || [],
                selectedSeasonDishes: selectedSeasonDishes || new Set(),
                activePriorities: typeof activePriorities === 'function' ? activePriorities() : [],
                seasonActive: typeof seasonActive === 'function' ? seasonActive() : false,
                isRV20Endgame: typeof isRV20Endgame === 'function' ? isRV20Endgame() : false,
                planContext,
            };

            const solveResult = await executePlanSolve({
                input,
                bestSetup,
                currentRv,
                useEmode,
                solve: callWorker,
                solveWithEmode: solvePlanWithEmode,
                allocate: allocateDynamicEmode,
                getGeneratorCapacity,
                getPowerGridRate,
                getTargetEmodeWatts,
                isCurrent: () => runId === getPlanRunId(),
                onBaseProgress: count => {
                    if (typeof count === 'object') {
                        setStep(count.step, count.state, undefined, count.proven);
                        return;
                    }
                    setStep('backup', 'start', `trial ${count}`);
                    if (progressBar?.style) progressBar.style.display = 'block';
                    if (progressFill?.style) progressFill.style.width = `${trialCountToPercent(count)}%`;
                },
                onBaseComplete: () => {
                    if (progressFill?.style) progressFill.style.width = '100%';
                },
                now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
                warn: message => console.warn(message),
                runPruning: runPlanPruning,
                pruningOptions,
                integrateSeasonPlan,
                normalizePlanFacilityCounts,
                actualEmodeCounts,
            });

            if (solveResult.cancelled) return;
            const bestPlan = solveResult.plan;
            const finalEmodeCounts = solveResult.emodeCounts;
            setLastEmodeCounts(finalEmodeCounts);
            setLastPlanInput(input);
            finishSolveSteps();
            setPlanForSetup(bestSetup, bestPlan);
            showSelectedPlan();
            updatePowerGauge(finalEmodeCounts);

            const progress = typeof getProgress === 'function' ? getProgress() : null;
            const effectiveSuccess = bestPlan?.success;
            if (!effectiveSuccess && progress) {
                progress.steps.forEach(s => {
                    if ((s.key === 'layout' || s.key === 'improve') && s.state === 'pending') s.state = 'skipped';
                });
                renderProgress();
            }

            setStep('minimum', 'start');
            callWorker('find_plan', JSON.stringify({ ...input, aniimo: 'minimum' }))
                .then(json => {
                    if (runId !== getPlanRunId()) return;
                    setStep('minimum', 'done');
                    setPlanForSetup('minimum', normalizePlanFacilityCounts(integrateSeasonPlan(JSON.parse(json))));
                    if (selectedAniimoSetup() === 'minimum') showSelectedPlan();
                })
                .catch(error => {
                    if (runId !== getPlanRunId()) return;
                    setStep('minimum', 'fail');
                    console.error('Minimum Aniimo plan failed:', error);
                    setPlanForSetup('minimum', { success: false, error: `The Minimum team plan failed: ${error.message}` });
                    if (selectedAniimoSetup() === 'minimum') showSelectedPlan();
                });
        } catch (error) {
            if (runId !== getPlanRunId()) return;
            const progress = typeof getProgress === 'function' ? getProgress() : null;
            if (progress) {
                progress.steps.forEach(s => {
                    if (s.state === 'running') s.state = 'fail';
                    else if (s.state === 'pending') s.state = 'skipped';
                });
                renderProgress();
            }
            console.error('Plan calculation error:', error);
            setLastPlan(null);
            showError(`Plan calculation failed: ${error.message}`);
        } finally {
            if (runId !== getPlanRunId()) return;
            if (btn) btn.disabled = false;
            if (btnText?.style) btnText.style.display = 'inline';
            if (btnLoading?.style) btnLoading.style.display = 'none';
            if (progressBar?.style) progressBar.style.display = 'none';
            if (progressCaption?.style) progressCaption.style.display = 'none';
            if (progressFill?.classList) progressFill.classList.remove('indeterminate');
        }
    }

    return { runFindPlan };
}
