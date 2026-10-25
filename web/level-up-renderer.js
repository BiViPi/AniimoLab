export function buildLevelUpViewModel(plan, context, {
    rateUnit,
    rateUnitSeconds,
    isVietnamese,
    formatDuration,
    formatRate,
    formatNumber,
    getItemDisplayName,
    getTableHeading,
}) {
    if (!context || !context.levelUp) return { visible: false };

    const isVi = !!isVietnamese;
    const result = {
        visible: true,
        labelText: isVi ? `NÂNG CẤP RV ${context.target}` : `RV ${context.target} level-up`,
        timeText: '-',
        linesHtml: '',
        rateUnitInTable: false,
        rateBlockHidden: false,
    };

    if (context.unavailable) {
        result.linesHtml = `<p class="level-up-note">${context.unavailable} ${isVi ? 'Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'This plan is for the most Home Coins.'}</p>`;
        return result;
    }
    if (context.ready) {
        result.timeText = isVi ? 'Đã đủ nguyên liệu' : 'Ready now';
        result.linesHtml = `<p class="level-up-note">${isVi ? 'Bạn đã có đủ mọi nguyên liệu cần thiết. Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'You already have everything it costs. This plan is for the most Home Coins.'}</p>`;
        return result;
    }

    const report = plan.level_up;
    if (!report) {
        const why = plan.level_up_note === 'unreachable'
            ? (isVi ? 'Các cơ sở hiện tại không thể sản xuất đủ toàn bộ nguyên liệu yêu cầu.' : "These facilities can't make everything it costs.")
            : (isVi ? 'Không thể lập kế hoạch nâng cấp cấp RV này.' : "The level-up couldn't be planned.");
        result.linesHtml = `<p class="level-up-note">${why} ${isVi ? 'Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'This plan is for the most Home Coins.'}</p>`;
        return result;
    }

    result.timeText = isVi ? `trong ${formatDuration(report.seconds)}` : `in ${formatDuration(report.seconds)}`;
    const { multiplier } = rateUnitSeconds[rateUnit] || rateUnitSeconds.second;
    const perUnit = perSecond => formatRate(perSecond * multiplier);
    const slowest = Math.max(...report.requirements.map(requirement => requirement.seconds ?? Infinity));
    const rows = report.requirements.map(requirement => {
        const ready = requirement.seconds === null
            ? (isVi ? 'không thể' : 'never')
            : requirement.seconds === 0
                ? (isVi ? 'đã đủ' : 'have it')
                : formatDuration(requirement.seconds);
        const isSlowest = requirement.seconds !== null && requirement.seconds > 0 && requirement.seconds >= slowest * (1 - 1e-6);
        return `<tr${isSlowest ? ' class="slowest"' : ''}>
            <td>${getItemDisplayName(requirement.name)}</td>
            <td>${formatNumber(requirement.need)}</td>
            <td>${formatNumber(requirement.have)}</td>
            <td>${perUnit(requirement.per_second)}</td>
            <td>${ready}</td>
        </tr>`;
    }).join('');

    const surplus = report.requirements
        .map(requirement => ({ name: requirement.name, spare: Math.floor(requirement.have + requirement.per_second * report.seconds - requirement.need) }))
        .concat((report.leftovers || []).map(([name, amount]) => ({ name, spare: Math.floor(amount) })))
        .filter(requirement => requirement.spare >= 1)
        .map(requirement => `${formatNumber(requirement.spare)} ${requirement.name === 'coins' ? 'Home Coins' : getItemDisplayName(requirement.name)}`);
    const surplusLabel = isVi ? 'Thặng dư:' : 'Surplus:';
    const coinsNote = surplus.length
        ? `<p class="level-up-coins"><span>${surplusLabel}</span> <strong>${surplus.join(', ')}</strong></p>`
        : '';
    result.linesHtml = `
        <table class="level-up-lines">
            <thead><tr><th>${getTableHeading('th_cost', 'Cost')}</th><th>${getTableHeading('th_need', 'Need')}</th><th>${getTableHeading('th_have', 'Have')}</th><th id="level-up-rate-head"></th><th>${getTableHeading('th_ready_in', 'Ready in')}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${coinsNote}`;
    result.rateUnitInTable = true;
    result.rateBlockHidden = true;
    return result;
}
