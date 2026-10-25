function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function heading(options, key, fallback) {
    return options.getTableHeading ? options.getTableHeading(key, fallback) : fallback;
}

export function buildSeedTableViewModel(plan, options) {
    const unit = options.unit;
    const levelUp = plan.level_up && plan.level_up.seconds > 0 && options.planContext?.levelUp ? plan.level_up : null;
    const multiplier = levelUp ? levelUp.seconds : (options.rateUnitSeconds[unit] || options.rateUnitSeconds.second).multiplier;
    const rows = (plan.coin_items || [])
        .filter(row => (row.facility === 'Farmland' || row.facility === 'Woodland') && row.status === 'producing' && row.cycle_time > 0)
        .map(row => {
            const recipe = options.recipeIndex.find(item => item.name === row.item_name);
            const seeds = levelUp ? Math.ceil(row.facility_count / row.cycle_time * multiplier) : row.facility_count / row.cycle_time * multiplier;
            const wheat = seeds * (recipe?.seasonSeedCost || 0);
            return { name: row.item_name, plots: row.facility_count, seeds, cost: seeds * (recipe?.cost || 0), wheat };
        })
        .sort((a, b) => b.seeds - a.seeds);
    const isVi = options.isVietnamese;
    if (!rows.length) {
        return {
            visible: true,
            unitText: isVi ? 'Kế hoạch hiện tại không sử dụng Đất nông nghiệp hoặc Vườn ươm cây trồng.' : 'The current plan does not use Farmland or Woodland crops.',
            html: `<p class="hint" style="text-align: center; padding: 1.5rem; margin: 0;">${isVi ? 'Không có hạt giống nào cần gieo trồng.' : 'No seeds required for this plan.'}</p>`,
        };
    }
    const amount = options.formatRate;
    const totalCost = rows.reduce((sum, row) => sum + row.cost, 0);
    const totalWheat = rows.reduce((sum, row) => sum + row.wheat, 0);
    const totals = [totalCost > 0 ? `${amount(totalCost)} Home Coins` : '', totalWheat > 0 ? `${amount(totalWheat)} ${options.seasonCurrency}` : ''].filter(Boolean).join(' + ');
    const per = levelUp
        ? (isVi ? `đến RV ${options.planContext.target}` : `until RV ${options.planContext.target}`)
        : (isVi ? ({ second: 'mỗi giây', minute: 'mỗi phút', hour: 'mỗi giờ', day: 'mỗi ngày' }[unit] || 'mỗi giây') : ({ second: 'per second', minute: 'per minute', hour: 'per hour', day: 'per day' }[unit] || 'per second'));
    const unitText = isVi
        ? `Hạt giống cần ${per}: 1 hạt cho mỗi lượt gieo trồng trên Đất nông nghiệp và Vườn ươm trong kế hoạch.`
        : `Seeds ${per}: one per planting, for every Farmland and Woodland crop in the plan.`;
    const body = rows.map(row => `<tr>
                <td>${options.prettyItem(row.name)}</td>
                <td>${row.plots}</td>
                <td>${amount(row.seeds)}</td>
                <td>${row.wheat > 0 ? `${amount(row.wheat)} ${options.seasonCurrency}` : row.cost > 0 ? `${amount(row.cost)} Home Coins` : (isVi ? 'miễn phí' : 'free')}</td>
            </tr>`).join('');
    const footer = rows.length > 1 && totals ? `<tfoot><tr><td colspan="3">${isVi ? 'Tổng cộng' : 'Total'}</td><td>${totals}</td></tr></tfoot>` : '';
    return {
        visible: true,
        unitText,
        html: `<table><thead><tr><th>${heading(options, 'th_crop', 'Crop')}</th><th>${heading(options, 'th_plots', 'Plots')}</th><th>${heading(options, 'th_seeds', 'Seeds')}</th><th>${heading(options, 'th_cost', 'Cost')}</th></tr></thead><tbody>${body}</tbody>${footer}</table>`,
    };
}

export function buildProfitBreakdownViewModel(plan, options) {
    const report = plan.level_up;
    const grouped = new Map();
    for (const stream of (plan.income_streams || []).filter(item => item.units_per_second > 0)) {
        const name = stream.item_name.replace(/__(specialist|manual)$/, '');
        const existing = grouped.get(name);
        if (existing) {
            existing.units_per_second += stream.units_per_second;
            existing.rate_per_second += stream.rate_per_second;
        } else grouped.set(name, { ...stream, item_name: name });
    }
    if (!grouped.size) return { visible: false, html: '' };
    const isVi = options.isVietnamese;
    const streams = [...grouped.values()];
    const total = streams.reduce((sum, stream) => sum + stream.rate_per_second, 0);
    const target = options.target || '';
    const rows = streams.sort((a, b) => b.rate_per_second - a.rate_per_second).map(stream => {
        const labels = isVi
            ? ['Sản phẩm', 'Cơ sở', 'Bán / giờ', 'Lợi nhuận / giờ', 'Tỷ lệ']
            : ['Product', 'Facility', 'Sold per hour', 'Profit per hour', 'Share'];
        const profitUntil = report ? `<td data-label="${isVi ? `Lợi nhuận đến RV ${target}` : `Profit until RV ${target}`}">${options.formatNumber(Math.floor(stream.rate_per_second * report.seconds))}</td>` : '';
        return `<tr>
                <td data-label="${labels[0]}"><div class="item-cell">${options.renderItemIcon(stream.item_name)}<span class="item-name-text">${options.prettyItem(stream.item_name)}</span></div></td>
                <td data-label="${labels[1]}"><div class="facility-cell">${options.renderFacilityIcon(stream.facility)}<span class="facility-name-text">${options.getFacilityDisplayName(stream.facility)}</span></div></td>
                <td data-label="${labels[2]}">${options.perHour(stream.units_per_second)}</td>
                <td data-label="${labels[3]}">${options.formatNumber(Math.round(stream.rate_per_second * 3600))}</td>
                <td data-label="${labels[4]}">${total > 0 ? Math.round(stream.rate_per_second / total * 100) : 0}%</td>
                ${profitUntil}
            </tr>`;
    }).join('');
    const profitHeader = report ? `<th>${heading(options, 'th_profit_until_rv', 'Profit until RV {rv}').replace('{rv}', escapeHtml(target))}</th>` : '';
    const hint = report ? (isVi ? 'Vuốt ngang để xem đủ 6 cột dữ liệu' : 'Swipe horizontally to view all columns') : (isVi ? 'Vuốt ngang để xem đủ 5 cột dữ liệu' : 'Swipe horizontally to view all columns');
    const html = `<span class="worksheet-scroll-hint">👉 ${hint}</span><div class="table-wrapper profit-table-wrapper"><table class="facility-plan-table profit-plan-table"><thead><tr><th>${heading(options, 'th_product', 'Product')}</th><th>${heading(options, 'th_facility', 'Facility')}</th><th>${heading(options, 'th_sold_hour', 'Sold per hour')}</th><th>${heading(options, 'th_profit_hour', 'Profit per hour')}</th><th>${heading(options, 'th_share', 'Share')}</th>${profitHeader}</tr></thead><tbody>${rows}</tbody></table></div>`;
    return { visible: true, html };
}
