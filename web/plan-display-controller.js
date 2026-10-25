export function createPlanDisplayController(deps) {
    function displayPlan(plan) {
        const doc = deps.document;
        const resultsSection = doc.getElementById('results-section');
        const errorEl = doc.getElementById('error-message');
        const resultsContent = doc.getElementById('results-content');
        const goalSection = doc.getElementById('goal-section');
        resultsSection.style.display = 'block';

        const infeasibleEl = doc.getElementById('infeasible-explanation-section');
        if (!plan.success) {
            goalSection.style.display = 'none';
            resultsContent.style.display = 'none';
            if (errorEl) errorEl.style.display = 'none';
            deps.renderInfeasibleExplanation(plan);
            return;
        }

        if (infeasibleEl) infeasibleEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        resultsContent.style.display = 'block';
        resultsContent.classList.remove('setup-only');
        goalSection.style.display = plan.level_up ? 'none' : 'block';

        deps.updateRateDisplay(!deps.getRateUnitChosen());
        deps.renderGoalTargets(plan);
        deps.renderInsights(plan);
        deps.evaluatePlotsOptimization(plan);

        const isVi = deps.isVietnamese();
        const solverResult = deps.buildSolverResultViewModel({ plan, isVi });
        const explored = doc.getElementById('plan-explored-hint');
        if (solverResult.exploredDisplay !== undefined) explored.style.display = solverResult.exploredDisplay;
        if (solverResult.exploredText !== undefined) explored.textContent = solverResult.exploredText;

        const solverInfoEl = doc.getElementById('plan-solver-info');
        const solverBadgeEl = doc.getElementById('plan-solver-badge');
        const benchBadgeEl = doc.getElementById('fast-resolve-benchmark-badge');
        if (solverInfoEl && solverBadgeEl) {
            if (solverResult.solverInfoDisplay !== undefined) solverInfoEl.style.display = solverResult.solverInfoDisplay;
            if (solverResult.solverBadgeText !== undefined) solverBadgeEl.textContent = solverResult.solverBadgeText;
            if (benchBadgeEl && solverResult.benchmarkDisplay !== undefined) benchBadgeEl.style.display = solverResult.benchmarkDisplay;
            if (benchBadgeEl && solverResult.benchmarkText !== undefined) benchBadgeEl.textContent = solverResult.benchmarkText;
        }

        const unverifiedEl = doc.getElementById('plan-unverified');
        const unverified = plan.unverified || [];
        deps.setUnverifiedRowKeys(new Set(unverified.map(row => `${row.facility}|${row.item_name}`)));
        unverifiedEl.style.display = 'none';

        const skippedEl = doc.getElementById('plan-skipped');
        const skipped = deps.getPlanContext()?.skipped || [];
        skippedEl.style.display = skipped.length ? 'block' : 'none';
        skippedEl.textContent = skipped.length
            ? (isVi ? `Đang bỏ qua: ${skipped.map(deps.prettyItem).join(', ')}.` : `Skipping ${skipped.map(deps.prettyItem).join(', ')}.`)
            : '';

        deps.renderSeedTable(plan);
        deps.renderLevelUp(plan);
        deps.renderProfitBreakdown(plan);
        deps.renderFacilityPlan(plan);
        deps.renderHomelandLayout(plan);
        deps.renderAniimoSummary(plan);
    }

    return { displayPlan };
}
