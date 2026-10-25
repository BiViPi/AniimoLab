export function createGoalDisplayController(deps) {
    function displayGoal(goalResult) {
        const doc = deps.document;
        if (!goalResult.success) {
            deps.setLastGoalResult(null);
            doc.getElementById('total-time').textContent = '-';
            doc.getElementById('amount-produced').textContent = '-';
            doc.getElementById('product-breakdown-section').style.display = 'none';
            doc.getElementById('seeds-needed-section').style.display = 'none';
            deps.warn('Goal calculation failed:', goalResult.error);
            return;
        }

        deps.setLastGoalResult(goalResult);
        doc.getElementById('total-time').textContent = goalResult.total_time_seconds > 0
            ? deps.formatDuration(goalResult.total_time_seconds)
            : '0m';
        doc.getElementById('amount-produced').textContent = deps.formatNumber(goalResult.amount_produced);
        deps.renderProductBreakdown(goalResult);
        deps.renderSeedsNeeded(goalResult);
    }

    return { displayGoal };
}
