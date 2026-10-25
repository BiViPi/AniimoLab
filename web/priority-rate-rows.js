export function buildPriorityRateRows({ plan, planContext = null, isVi, priorityLabel, seasonPointsLabel }) {
    const missing = {
        aniimo_exp: planContext?.hasPolisher ? null : (isVi ? 'Chưa sở hữu Dance Pad Polisher' : 'No Dance Pad Polisher yet'),
        aniipods: planContext?.aniipod ? null : (isVi ? 'Chưa sở hữu Aniipod Maker' : 'No Aniipod Maker yet'),
    };
    const rows = (plan.priorities || []).map((priority, index) => ({
        rank: index + 1,
        target: priority.target,
        label: priorityLabel(priority.target, planContext?.aniipod),
        perSecond: priority.per_second,
        items: priority.items || [],
        streams: priority.streams || [],
        missing: missing[priority.target] || null,
    }));

    if (!rows.some(row => row.target === 'coins')) {
        const coinLabel = isVi
            ? (rows.length ? 'Xu Gia Viên (từ năng lực còn lại)' : 'Xu Gia Viên')
            : (rows.length ? "Home Coins, from what's left" : 'Home Coins');
        rows.push({ rank: null, target: 'coins', label: coinLabel, perSecond: plan.rate_per_second, items: [], missing: null });
    }

    if (plan.season_points != null && !rows.some(row => row.target === 'season_points')) {
        rows.push({ rank: null, target: 'season_points', label: seasonPointsLabel, perSecond: plan.season_points, items: [], missing: null });
    }
    return rows;
}
