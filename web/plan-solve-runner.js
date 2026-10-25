export async function executePlanSolve({
    input,
    bestSetup,
    currentRv,
    useEmode,
    solve,
    solveWithEmode,
    allocate,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    isCurrent,
    onBaseProgress,
    onBaseComplete,
    now,
    warn,
    runPruning,
    pruningOptions,
    integrateSeasonPlan,
    normalizePlanFacilityCounts,
    actualEmodeCounts,
}) {
    let plan;
    let emodeCounts = {};

    if (useEmode) {
        const result = await solveWithEmode({
            input,
            bestSetup,
            currentRv,
            solve,
            allocate,
            getGeneratorCapacity,
            getPowerGridRate,
            getTargetEmodeWatts,
            isCurrent,
            now,
            onBaseProgress,
            onBaseComplete,
            warn,
        });
        if (result.cancelled) return { cancelled: true };
        plan = result.plan;
        emodeCounts = result.emodeCounts;
    } else {
        input.emode_facilities = [];
        input.emode_facility_counts = {};
        input.power_grid_rate = 1.0;

        const json = await solve('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }), onBaseProgress);
        onBaseComplete?.();
        if (!isCurrent()) return { cancelled: true };
        plan = JSON.parse(json);
    }

    if (!isCurrent()) return { cancelled: true };
    const pruningResult = await runPruning({
        plan,
        input,
        bestSetup,
        solve,
        isCurrent,
        ...pruningOptions,
    });
    if (pruningResult.cancelled || !isCurrent()) return { cancelled: true };
    plan = integrateSeasonPlan(pruningResult.plan);
    normalizePlanFacilityCounts(plan);
    emodeCounts = useEmode ? actualEmodeCounts(plan) : {};

    return { plan, emodeCounts };
}
