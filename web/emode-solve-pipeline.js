// Coordinates the existing E-mode solve stages while keeping worker, allocator,
// cancellation, timing, and UI progress behavior supplied by the page.
export async function solvePlanWithEmode({
    input,
    bestSetup,
    currentRv,
    solve,
    allocate,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    isCurrent = () => true,
    onBaseProgress = () => {},
    onBaseComplete = () => {},
    now = () => performance.now(),
    warn = message => console.warn(message),
}) {
    const t0Total = now();
    const t0Base = now();
    const originalOverrides = input.facility_overrides || [];
    input.facility_overrides = originalOverrides;

    const baseFixedElectric = {};
    for (const override of originalOverrides) {
        if (override.electric_count > 0) baseFixedElectric[override.facility] = override.electric_count;
    }
    input.emode_facility_counts = baseFixedElectric;
    input.emode_facilities = Object.keys(baseFixedElectric);
    input.power_grid_rate = Object.keys(baseFixedElectric).length > 0 ? getPowerGridRate() : 1.0;

    const baseJson = await solve('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }), onBaseProgress);
    onBaseComplete();
    if (!isCurrent()) return { cancelled: true };

    const basePlan = JSON.parse(baseJson);
    const tBase = now() - t0Base;
    const t0Allocator = now();
    const chosenRate = getPowerGridRate();
    const targetWatts = getTargetEmodeWatts(getGeneratorCapacity(), chosenRate);
    let allocatedCounts = allocate(basePlan, currentRv, targetWatts, {
        overrides: originalOverrides,
        powerGridRate: chosenRate,
        productionAniimoCap: input.production_aniimo_cap,
        facilities: input.facilities,
        specialist_quotas: input.specialist_quotas,
    });
    const tAllocator = now() - t0Allocator;

    const allocationValidationError = allocatedCounts.validation_error ? allocatedCounts.error : null;
    if (allocationValidationError) {
        warn(`E-mode allocation skipped: ${allocationValidationError}`);
        allocatedCounts = {};
    }

    input.required_emode_tiers = currentRv >= 18
        ? ['Chimney Kiln', 'Woodworking Bench'].flatMap(facility => {
            const count = allocatedCounts[facility] || 0;
            if (count <= 0) return [];
            const tiers = input.facilities[facility] || [];
            const highest = Math.max(0, ...tiers.filter(tier => tier.count > 0).map(tier => tier.level || 1));
            return highest > 0 ? [{ facility, level: highest, count: Math.min(count, 1) }] : [];
        })
        : [];

    if (Object.keys(allocatedCounts).length === 0) {
        const total = now() - t0Total;
        basePlan.solver_source = allocationValidationError ? 'base_plan_fallback' : 'smart_two_stage + manual_only';
        if (allocationValidationError) basePlan.fallback_reason = allocationValidationError;
        basePlan.benchmark_breakdown = {
            t_base_solve: Math.round(tBase * 10) / 10,
            t_allocator: Math.round(tAllocator * 10) / 10,
            t_final_solve: 0,
            t_total: Math.round(total * 10) / 10,
        };
        return { plan: basePlan, emodeCounts: {}, input };
    }

    const t0Final = now();
    input.emode_facilities = Object.keys(allocatedCounts);
    input.emode_facility_counts = allocatedCounts;
    input.emode_tier_counts = allocatedCounts._tier_counts || [];
    input.power_grid_rate = chosenRate;

    const emodeJson = await solve('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }));
    if (!isCurrent()) return { cancelled: true };

    const emodePlan = JSON.parse(emodeJson);
    const tFinal = now() - t0Final;
    const total = now() - t0Total;
    const emodeViable = emodePlan && emodePlan.success;
    let violatesFloor = false;
    if (emodeViable && basePlan && basePlan.priorities && emodePlan.priorities) {
        for (const basePriority of basePlan.priorities) {
            const emodePriority = emodePlan.priorities.find(priority => priority.target === basePriority.target);
            const baseRate = basePriority.per_second || 0;
            const emodeRate = emodePriority ? (emodePriority.per_second || 0) : 0;
            const tolerance = 1e-4 * Math.max(1, Math.abs(baseRate));
            if (emodeRate + tolerance < baseRate) {
                violatesFloor = true;
                warn(`[E-mode Invariant] Priority ${basePriority.target} dropped from ${baseRate} to ${emodeRate} (tolerance ${tolerance}); rolling back to baseline.`);
                break;
            }
        }
    }

    const benchmarkBreakdown = {
        t_base_solve: Math.round(tBase * 10) / 10,
        t_allocator: Math.round(tAllocator * 10) / 10,
        t_final_solve: Math.round(tFinal * 10) / 10,
        t_total: Math.round(total * 10) / 10,
    };
    if (emodeViable && !violatesFloor) {
        emodePlan.solver_source = 'smart_two_stage + exact_fixed_allocation';
        emodePlan.allocation_method = 'heuristic_two_stage';
        emodePlan.guard_eligibility = 'unverified';
        emodePlan.allocation_diagnostics = allocatedCounts._diagnostics || [];
        emodePlan.benchmark_breakdown = benchmarkBreakdown;
        return { plan: emodePlan, emodeCounts: allocatedCounts, input };
    }

    const fallbackReason = !emodeViable
        ? (emodePlan?.error || 'emode_solve_infeasible')
        : (violatesFloor ? 'priority_floor_violation' : 'net_coins_dropped');
    warn(`Emode solve fell back to baseline: ${fallbackReason}`);
    basePlan.solver_source = 'base_plan_fallback';
    basePlan.fallback_reason = fallbackReason;
    basePlan.benchmark_breakdown = benchmarkBreakdown;
    input.emode_facilities = [];
    input.emode_facility_counts = {};
    return { plan: basePlan, emodeCounts: {}, input };
}
