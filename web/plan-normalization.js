// Normalizes worker plan rows for per-unit mode controls and worksheet revenue display.
// Page state and game configuration are injected so this transformation can be tested alone.
export function normalizePlanFacilityCounts(plan, deps) {
    if (!plan || !Array.isArray(plan.coin_items)) return plan;

    const emodeAvailable = deps.selectedHomeLevel() >= 12;
    const newSteps = [];
    let modified = false;
    const takeModeForFacility = deps.createWorksheetModeQuotaTracker(deps.facilityOverrides);

    for (const step of plan.coin_items) {
        const rawFac = step.facility || '';
        const baseFac = rawFac.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        const facDef = deps.facilities.find(facility => facility.name === baseFac);
        const facCategory = facDef?.category || deps.categoryByName.get(baseFac);
        const isFarm = baseFac === 'Farmland' || baseFac === 'Woodland' || step.is_grower;
        const isProcessingFacility = !isFarm && (
            facCategory === 'Materials Processing' ||
            facCategory === 'Wood & Ore Processing' ||
            !['Farmland', 'Woodland', 'Mine', 'Well'].includes(baseFac)
        );

        const count = step.facility_count || 1;
        const hasFacilityOverride = deps.facilityOverrides.some(override => override.facility === baseFac);
        if (isProcessingFacility && (count > 1 || hasFacilityOverride)) {
            modified = true;
            let initialMode = step.mode;
            if (!initialMode) {
                if (emodeAvailable && (step.is_emode || rawFac.includes('(Electric)'))) {
                    initialMode = 'electric';
                } else if (step.is_manual || rawFac.includes('(Manual)') || (step.item_name && step.item_name.includes('__manual'))) {
                    initialMode = 'manual';
                } else if (step.is_specialist || rawFac.includes('(Prismana)') || (step.item_name && step.item_name.includes('__specialist'))) {
                    initialMode = 'prismana';
                } else if (emodeAvailable && step.is_emode !== false && facDef?.supportsEmode && (deps.lastEmodeCounts[baseFac] || 0) > 0) {
                    initialMode = 'electric';
                } else {
                    initialMode = 'prismana';
                }
            }

            const override = deps.facilityOverrides.find(item => item.facility === baseFac);
            for (let i = 0; i < count; i++) {
                let unitMode = initialMode;
                if (override) unitMode = takeModeForFacility(baseFac, unitMode, emodeAvailable);
                newSteps.push({
                    ...step,
                    facility_count: 1,
                    mode: unitMode,
                    is_emode: unitMode === 'electric',
                    is_specialist: unitMode === 'prismana',
                    is_manual: unitMode === 'manual',
                    units_per_second: step.units_per_second != null ? step.units_per_second / count : null,
                    rate_per_second: step.rate_per_second != null ? step.rate_per_second / count : null,
                    busy_units: step.busy_units != null ? step.busy_units / count : 1,
                    aniimo: step.aniimo ? { ...step.aniimo } : null,
                });
            }
        } else {
            newSteps.push(step);
        }
    }

    const ownedCounts = deps.getOwnedFacilityCounts();
    const facilityActiveCounts = {};
    const clampedSteps = [];
    for (const step of newSteps) {
        const rawFac = step.facility || '';
        const baseFac = rawFac.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        const isFarm = baseFac === 'Farmland' || baseFac === 'Woodland' || step.is_grower;
        if (!isFarm && (baseFac === 'Woodworking Bench' || baseFac === 'Chimney Kiln')) {
            const maxOwned = ownedCounts[baseFac];
            if (typeof maxOwned === 'number' && maxOwned > 0) {
                const currentUnits = facilityActiveCounts[baseFac] || 0;
                const stepUnits = step.facility_count || 1;
                if (currentUnits + stepUnits > maxOwned) {
                    modified = true;
                    continue;
                }
                facilityActiveCounts[baseFac] = currentUnits + stepUnits;
            }
        }
        clampedSteps.push(step);
    }

    if (modified) plan.coin_items = clampedSteps;

    const streamMap = new Map();
    for (const stream of plan.income_streams || []) {
        if (!stream.item_name) continue;
        const cleanName = stream.item_name.replace(/__(specialist|manual)$/, '');
        streamMap.set(cleanName, stream);
        streamMap.set(stream.item_name, stream);
    }

    const targetSteps = plan.coin_items || [];
    const itemCapacityMap = new Map();
    for (const step of targetSteps) {
        if (step.status !== 'producing' || !step.item_name) continue;
        const cleanItem = step.item_name.replace(/__(specialist|manual)$/, '');
        const capacity = ((step.facility_count || 1) * (step.yield_amount || 1)) / Math.max(0.1, step.cycle_time || 60);
        itemCapacityMap.set(cleanItem, (itemCapacityMap.get(cleanItem) || 0) + capacity);
    }

    for (const step of targetSteps) {
        if (step.status !== 'producing' || !step.item_name) {
            step.rate_per_second = 0;
            step.sold_units_per_second = 0;
            continue;
        }
        const cleanItem = step.item_name.replace(/__(specialist|manual)$/, '');
        const stream = streamMap.get(cleanItem) || streamMap.get(step.item_name);
        if (stream && typeof stream.rate_per_second === 'number' && stream.rate_per_second > 0) {
            const totalCapacity = itemCapacityMap.get(cleanItem) || 0;
            const stepCapacity = ((step.facility_count || 1) * (step.yield_amount || 1)) / Math.max(0.1, step.cycle_time || 60);
            const ratio = totalCapacity > 0 ? stepCapacity / totalCapacity : 1;
            step.rate_per_second = stream.rate_per_second * ratio;
            step.sold_units_per_second = (stream.units_per_second || 0) * ratio;
        } else {
            step.rate_per_second = 0;
            step.sold_units_per_second = 0;
        }
    }

    return plan;
}
