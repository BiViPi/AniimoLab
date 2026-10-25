export function createTimeToGoalController(deps) {
    async function runTimeToGoal() {
        const plan = deps.getLastPlan();
        if (!plan || !plan.success || deps.getPlanContext()?.levelUp) return;

        const rows = deps.getPriorityRows(plan);
        const targetControl = deps.document.getElementById('goal-target');
        const chosen = rows.find(row => row.target === targetControl.value) || rows[0];
        const name = deps.goalName(chosen);
        deps.document.getElementById('target-amount-label').textContent = `Target ${name}`;
        deps.document.getElementById('current-amount-label').textContent = `Current ${name}`;
        deps.document.getElementById('amount-produced-label').textContent = `${name} produced`;

        const target = deps.parseNumber(deps.document.getElementById('target-amount').value, 0);
        const current = deps.parseNumber(deps.document.getElementById('current-amount').value, 0);

        if (chosen.target === 'coins') {
            try {
                const resultJson = await deps.solveWorker('time_to_reach', JSON.stringify({ plan, target, current }));
                const result = JSON.parse(resultJson);
                deps.displayGoal(result);
                deps.renderGoalAlso(rows, chosen, result.success ? result.total_time_seconds : null, result);
            } catch (error) {
                deps.logError('Goal calculation error:', error);
            }
            return;
        }

        const needed = Math.max(0, target - current);
        const seconds = needed <= 0 ? 0 : chosen.perSecond <= 1e-12 ? null : deps.timeToMake(chosen, needed);
        if (seconds === null) {
            deps.setLastGoalResult(null);
            deps.document.getElementById('total-time').textContent = chosen.missing || 'Not made by this plan';
            deps.document.getElementById('amount-produced').textContent = '-';
            deps.document.getElementById('product-breakdown-section').style.display = 'none';
            deps.document.getElementById('seeds-needed-section').style.display = 'none';
            deps.renderGoalAlso(rows, chosen, null);
            return;
        }

        try {
            const result = JSON.parse(await deps.solveWorker('time_to_reach', JSON.stringify({ plan, seconds })));
            deps.displayGoal(result);
            deps.document.getElementById('amount-produced').textContent = deps.formatNumber(Math.round(needed));
            deps.renderGoalAlso(rows, chosen, seconds, result);
        } catch (error) {
            deps.logError('Goal calculation error:', error);
        }
    }

    return { runTimeToGoal };
}
