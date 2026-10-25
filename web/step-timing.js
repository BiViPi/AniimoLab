// Calculates dynamic production timing, cycle time, worker speed, and throughput for plan steps.
// Supports Electric, Prismana, and Manual modes flexibly without hardcoded speed assumptions.

export function defaultEmodeBaseTime(workload) {
    if (workload <= 45) return 27;
    if (workload <= 90) return 54;
    if (workload <= 180) return 108;
    if (workload <= 250) return 162;
    if (workload <= 350) return 216;
    if (workload <= 450) return 270;
    if (workload <= 600) return 378;
    return Math.round(workload / 1.5 / 27) * 27;
}

export function calculateWorkerSpeed(workerLevel, reqLevel = 1, isGathering = false, hasPersonality = true) {
    const required = Math.max(1, reqLevel);
    const level = Math.max(required, workerLevel);
    const above = level - required;
    let baseSpeed = 1.0;
    if (isGathering) {
        const baseWorkRate = required === 1 ? 1.0 : (required === 2 ? 1.25 : 1.5);
        baseSpeed = 1.0 + (0.5 * above) / baseWorkRate;
    } else {
        baseSpeed = above === 0 ? 1.0 : (2.0 + above);
    }
    if (hasPersonality) {
        baseSpeed = Math.round(baseSpeed * 1.2 * 1000) / 1000;
    }
    return baseSpeed;
}

export function calculateStepCycleTime({
    step,
    targetMode,
    recipeMap = null,
    powerGridRate = 1.2,
    homeLevel = 20,
    workerLevel = null,
    hasPersonality = true,
}) {
    if (!step) return 60;
    const mode = targetMode || step.mode || (step.is_emode ? 'electric' : (step.is_specialist ? 'prismana' : 'manual'));
    const rawFac = step.facility || '';
    const baseFac = rawFac.replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();
    const cleanItem = (step.item_name || '').replace(/__(specialist|manual)$/, '');
    const map = recipeMap || (typeof window !== 'undefined' ? window.ALL_RECIPES_MAP : null);
    const recipe = map?.get?.(cleanItem) || map?.get?.(step.item_name) || null;
    const rate = powerGridRate > 0 ? powerGridRate : 1.2;

    // Mine special handling
    if (baseFac === 'Mine') {
        if (mode === 'electric') return Math.round(1800.0 / rate * 10) / 10;
        if (mode === 'prismana') return 1125.0; // 2700 / ((1.0 + 0.5/1.5)*1.2*1.5) = 2700 / 2.4
        return (homeLevel >= 12 && homeLevel <= 19) ? 1500.0 : 1500.0;
    }

    // Well special handling
    if (baseFac === 'Well') {
        const workload = recipe?.workload || 1800;
        if (mode === 'electric') {
            const emodeTime = recipe?.emode_base_time || 1800.0;
            return Math.round(emodeTime / rate * 10) / 10;
        }
        if (mode === 'prismana') {
            return Math.round((workload / 3.0) * 10) / 10;
        }
        return (homeLevel >= 12 && homeLevel <= 19) ? 1500.0 : Math.round((workload / 1.2) * 10) / 10;
    }

    // Growers (Farmland / Woodland) - preserve their cycle_time
    if (baseFac === 'Farmland' || baseFac === 'Woodland' || step.is_grower) {
        return step.cycle_time || 60;
    }

    // Processing facilities
    const workload = recipe?.workload ?? step.workload;
    if (workload == null) {
        // Fallback when workload is unknown
        const currentCycle = step.cycle_time || 60;
        if (mode === 'electric') {
            return Math.round(currentCycle / rate * 10) / 10;
        }
        return Math.round(currentCycle * rate * 10) / 10;
    }

    if (mode === 'electric') {
        const emodeTime = recipe?.emode_base_time ?? defaultEmodeBaseTime(workload);
        return Math.round(emodeTime / rate * 10) / 10;
    }

    const reqLevel = (Array.isArray(recipe?.aniimo) && recipe.aniimo[1])
        ? Number(recipe.aniimo[1])
        : (step.aniimo?.level || 1);

    if (mode === 'prismana') {
        const speed = calculateWorkerSpeed(4, reqLevel, false, true);
        return Math.round((workload / speed) * 10) / 10;
    }

    // Manual mode
    const lvl = workerLevel ?? 3;
    const speed = calculateWorkerSpeed(lvl, reqLevel, false, hasPersonality);
    return Math.round((workload / speed) * 10) / 10;
}

export function updateStepTimingAndCapacity(step, mode, options = {}) {
    if (!step) return step;
    const targetMode = mode === 'specialist' ? 'prismana' : mode;
    const cycleTime = calculateStepCycleTime({ step, targetMode, ...options });
    step.cycle_time = cycleTime;
    const count = step.facility_count || 1;
    const yieldAmount = step.yield_amount || 1;
    if (cycleTime > 0) {
        step.units_per_second = (count * yieldAmount) / cycleTime;
    }
    return step;
}
