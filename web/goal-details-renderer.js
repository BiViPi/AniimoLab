export function renderGoalTargetOptions(rows, getGoalName) {
    return rows.map(row => `<option value="${row.target}">${getGoalName(row)}</option>`).join('');
}

export function renderProductBreakdown(goalResult, {
    unit,
    rateUnitSeconds,
    lastPlan,
    prettyItem,
    formatRate,
    formatNumber,
}) {
    const products = goalResult.products || [];
    const byproducts = (goalResult.byproducts || []).filter(([, amount]) => Math.floor(amount) > 0);
    const visible = products.length > 0 || byproducts.length > 0;
    if (!visible) return { visible: false, rateHeaderHtml: '', pointsHidden: true, rowsHtml: '' };

    const { multiplier, suffix } = rateUnitSeconds[unit] || rateUnitSeconds.second;
    const season = lastPlan?.season_points != null;
    const pointsEach = new Map((lastPlan?.income_streams || []).map(stream => [stream.item_name, stream.points || 0]));
    const pointsCell = amount => season ? `<td>${amount > 0 ? formatNumber(amount) : '&mdash;'}</td>` : '';
    const productRows = products.map(product => {
        const wholeAmount = Math.floor(product.total_units);
        const worth = wholeAmount * product.sell_value;
        return `
            <tr>
                <td>${prettyItem(product.item_name)}</td>
                <td>${product.facility}</td>
                <td>${wholeAmount.toLocaleString()}</td>
                <td>${formatRate(product.rate_per_second * multiplier)}</td>
                <td>${formatNumber(worth)}</td>
                ${pointsCell(wholeAmount * (pointsEach.get(product.item_name) || 0))}
            </tr>
        `;
    }).join('');
    const byproductRows = byproducts.map(([name, amount]) => `
        <tr class="byproduct-row">
            <td>${name} <span class="hint small">(bonus)</span></td>
            <td>&mdash;</td>
            <td>${Math.floor(amount).toLocaleString()}</td>
            <td>&mdash;</td>
            <td>not sold</td>
            ${pointsCell(0)}
        </tr>
    `).join('');

    return {
        visible: true,
        rateHeaderHtml: `Profit <span class="th-unit">Home Coins${suffix}</span>`,
        pointsHidden: !season,
        rowsHtml: productRows + byproductRows,
    };
}

export function renderSeedRequirements(goalResult, { prettyItem }) {
    const requirements = goalResult.seed_requirements || [];
    if (requirements.length === 0) return { visible: false, rowsHtml: '' };

    const rowsHtml = requirements.map(requirement => `
        <tr>
            <td>${prettyItem(requirement.item_name)}</td>
            <td>${requirement.facility}</td>
            <td>${requirement.facility_count.toLocaleString()}</td>
            <td>${requirement.seeds_per_plot.toLocaleString()}</td>
            <td>${requirement.total_seeds.toLocaleString()}</td>
        </tr>
    `).join('');
    return { visible: true, rowsHtml };
}
