export function createFastResolveController(deps) {
    async function runFastReSolve(fixedLayout = false) {
        try {
            const input = deps.buildInput();
            const priorPlanInput = deps.getLastPlanInput();
            if (priorPlanInput?.exclude?.length) {
                input.exclude = [...new Set([...(input.exclude || []), ...priorPlanInput.exclude])];
            }

            const emodeCounts = deps.getEmodeCounts() || {};
            input.emode_facilities = Object.keys(emodeCounts).filter(facility => (emodeCounts[facility] || 0) > 0);
            input.emode_facility_counts = { ...emodeCounts };
            const previousPlan = deps.getLastPlan();
            const fixedLines = fixedLayout ? deps.getWorksheetLines(previousPlan) : null;
            input.facility_overrides = fixedLayout
                ? deps.buildWorksheetOverrides(fixedLines)
                : deps.getFacilityOverrides();
            if (fixedLayout) input.fixed_plan_lines = fixedLines;
            input.emode_tier_counts = Object.entries(emodeCounts)
                .filter(([, count]) => (count || 0) > 0)
                .map(([facility, count]) => ({ facility, level: deps.getFacilityLevel(facility), count }));

            const selectedSetup = deps.getSelectedSetup();
            const bestSetup = selectedSetup === 'minimum' ? deps.getBestSetup() : selectedSetup;
            const payload = JSON.stringify({ ...input, ...deps.getAniimoInput(bestSetup) });
            const start = deps.now();
            const json = await deps.solveWorker('find_plan', payload);
            let plan = JSON.parse(json);

            if (!plan?.success) {
                deps.setLastError(plan?.error || 'Plan unfeasible');
                deps.warn('Fast re-solve returned unsuccessful plan:', plan?.error);
                return false;
            }

            const elapsed = Math.round(deps.now() - start);
            plan.solver_source = 'fast_resolve_exact';
            plan.guard_eligibility = 'unverified';
            plan.elapsed_ms = elapsed;
            plan = deps.integrateSeasonPlan(plan);
            deps.normalizePlanFacilityCounts(plan);

            if (fixedLayout) {
                const expected = lineTotals(fixedLines);
                const actual = lineTotals(deps.getWorksheetLines(plan));
                const unchanged = expected.size === actual.size
                    && [...expected].every(([key, count]) => actual.get(key) === count);
                if (!unchanged) {
                    deps.setLastError('The constrained mode solve changed a facility/product assignment; the previous layout was kept.');
                    return false;
                }
            }

            deps.setPlanForSetup(bestSetup, plan);
            deps.setLastPlan(plan);
            const finalEmodeCounts = deps.actualEmodeCounts(plan);
            deps.setEmodeCounts(finalEmodeCounts);
            deps.showSelectedPlan();
            deps.updatePowerGauge(finalEmodeCounts);

            const badge = deps.document.getElementById('fast-resolve-benchmark-badge');
            if (badge) {
                badge.style.display = 'inline-flex';
                badge.innerHTML = `⚡ ${elapsed}ms`;
            }
            return true;
        } catch (error) {
            deps.setLastError(error?.message || String(error));
            deps.logError('runFastReSolve error:', error);
            return false;
        }
    }

    return { runFastReSolve };
}

function lineTotals(lines) {
    const totals = new Map();
    for (const line of lines || []) {
        const key = `${line.facility}|${line.item_name}|${line.mode}`;
        totals.set(key, (totals.get(key) || 0) + line.facility_count);
    }
    return totals;
}
