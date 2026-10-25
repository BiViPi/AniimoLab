export function buildGoalAlsoViewModel({ rows, chosen, seconds, result, madeBy, goalName, formatNumber }) {
    const getMade = row => row.target === 'coins' && result?.success
        ? result.amount_produced
        : madeBy(row, seconds);
    const items = seconds > 0
        ? rows.filter(row => row !== chosen && row.perSecond > 1e-12)
            .map(row => `${formatNumber(Math.floor(getMade(row)))} ${goalName(row)}`)
        : [];
    return {
        display: items.length ? 'block' : 'none',
        html: items.length ? `<span>By then you'll also have:</span> <strong>${items.join(', ')}</strong>` : '',
    };
}
