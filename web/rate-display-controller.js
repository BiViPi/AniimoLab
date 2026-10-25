import { buildPriorityRateRows as defaultBuildPriorityRateRows } from './priority-rate-rows.js?v=aniimolab_v1';

export function createRateDisplayController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    getLastPlan = () => null,
    getPlanContext = () => null,
    getLastGoalResult = () => null,
    rateUnitSeconds = {},
    currencyLabels = {},
    seasonPointsLabel = '',
    formatRate = n => String(n),
    prettyItem = n => String(n),
    priorityLabel = target => target,
    buildPriorityRateRows = defaultBuildPriorityRateRows,
    renderImprovements = () => {},
    renderSeedTable = () => {},
    renderLevelUp = () => {},
    renderProductBreakdown = () => {},
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
} = {}) {
    function priorityRows(plan) {
        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const isVi = isVietnamese();
        return buildPriorityRateRows({
            plan,
            planContext,
            isVi,
            priorityLabel,
            seasonPointsLabel,
        });
    }

    function updateRateDisplay(pickUnit = false) {
        const lastPlan = typeof getLastPlan === 'function' ? getLastPlan() : null;
        if (!lastPlan || !lastPlan.success) return;

        const select = document?.getElementById?.('rate-unit');
        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const rows = planContext && !planContext.levelUp ? priorityRows(lastPlan) : null;

        const costRates = (lastPlan.level_up?.requirements || []).map(r => r.per_second);
        const rates = (rows ? rows.map(r => r.perSecond) : costRates).filter(r => r > 1e-9);
        const smallest = rates.length ? Math.min(...rates) : lastPlan.rate_per_second;
        const least = rates.length ? 1 : 0.05;

        if (select) {
            while (pickUnit && smallest * (rateUnitSeconds[select.value]?.multiplier || 1) < least) {
                const next = { second: 'minute', minute: 'hour', hour: 'day' }[select.value];
                if (!next) break;
                select.value = next;
            }
        }

        const { multiplier, suffix } = (select && rateUnitSeconds[select.value]) || rateUnitSeconds.second || { multiplier: 1, suffix: '/s' };
        const rateLine = document?.getElementById?.('rate-line');
        const table = document?.getElementById?.('priority-rates');

        if (!rows) {
            if (select?.closest?.('#priority-rates') && rateLine) {
                rateLine.appendChild(select);
            }
            const label = currencyLabels[lastPlan.currency] || lastPlan.currency;
            const points = lastPlan.season_points > 1e-12
                ? ` + ${formatRate(lastPlan.season_points * multiplier)} ${seasonPointsLabel}`
                : '';
            const planRate = document?.getElementById?.('plan-rate');
            if (planRate) {
                planRate.textContent = `${formatRate(lastPlan.rate_per_second * multiplier)} ${label}${points}${suffix}`;
            }
            const rateLabel = document?.getElementById?.('rate-label');
            if (rateLabel) {
                rateLabel.textContent = 'Your Rate';
            }
            if (rateLine?.style) rateLine.style.display = '';
            if (table) table.innerHTML = '';
            return;
        }

        const isVi = isVietnamese();
        const amount = formatRate;
        const body = rows.map(r => {
            const why = r.perSecond <= 1e-9 && r.missing ? `<span class="hint small">${r.missing}</span>` : '';
            let made = '';
            if (r.target === 'aniimo_exp') {
                made = r.items
                    .filter(([, n]) => n > 1e-9)
                    .map(([item, n]) => `${amount(n * multiplier)} ${prettyItem(item)}`)
                    .join(', ');
            } else if (r.target === 'aniimo_food') {
                const foodItems = r.items
                    .filter(([, n]) => n > 1e-9)
                    .map(([item, n]) => `${amount(n * multiplier)} ${prettyItem(item)}`)
                    .join(', ');
                const energyPct = Math.min(100, Math.round((r.perSecond / 7.5) * 100));
                made = `${energyPct}% ${isVi ? 'định mức (7.5 Energy/s)' : 'quota (7.5 Energy/s)'}${foodItems ? ': ' + foodItems : ''}`;
            }
            let rateDisplay = '';
            if (why) {
                rateDisplay = 'none';
            } else if (r.target === 'aniimo_food') {
                rateDisplay = `${amount(r.perSecond * multiplier)} Energy${suffix}`;
            } else {
                rateDisplay = amount(r.perSecond * multiplier);
            }
            return `<tr${r.rank === 1 ? ' class="top"' : ''}>
            <td>${r.rank ?? ''}</td>
            <td>${r.label}</td>
            <td>${rateDisplay}</td>
            <td>${why || made}</td>
        </tr>`;
        }).join('');

        const optimalBadge = lastPlan.proven_optimal === true
            ? `<span class="priority-optimal-badge" title="${isVi ? 'Toàn bộ mục tiêu đã được chứng minh tối ưu toán học' : 'All priorities proven mathematically optimal'}">✓ ${isVi ? 'Tối ưu chuẩn xác' : 'Optimal'}</span>`
            : '';

        if (table) {
            table.innerHTML = `
        <table class="level-up-lines rate-table">
            <thead><tr><th>#</th><th>${isVi ? 'Mục tiêu ưu tiên' : 'Priority'} ${optimalBadge}</th><th id="priority-rate-head"></th><th>${isVi ? 'Chi tiết sản xuất' : 'Details'}</th></tr></thead>
            <tbody>${body}</tbody>
        </table>`;
        }

        const priorityRateHead = document?.getElementById?.('priority-rate-head');
        if (priorityRateHead && select) {
            priorityRateHead.appendChild(select);
        }
        const rateLabel = document?.getElementById?.('rate-label');
        if (rateLabel) {
            rateLabel.textContent = isVi ? 'Tốc độ sản xuất' : 'Your Rates';
        }
        if (rateLine?.style) rateLine.style.display = 'none';
    }

    function updateRateUnitDisplays() {
        updateRateDisplay();
        if (typeof renderImprovements === 'function') renderImprovements();
        const lastPlan = typeof getLastPlan === 'function' ? getLastPlan() : null;
        if (lastPlan && lastPlan.success) {
            if (typeof renderSeedTable === 'function') renderSeedTable(lastPlan);
            if (typeof renderLevelUp === 'function') renderLevelUp(lastPlan);
        }
        const lastGoalResult = typeof getLastGoalResult === 'function' ? getLastGoalResult() : null;
        if (lastGoalResult) {
            if (typeof renderProductBreakdown === 'function') renderProductBreakdown(lastGoalResult);
        }
    }

    return {
        priorityRows,
        updateRateDisplay,
        updateRateUnitDisplays,
    };
}
