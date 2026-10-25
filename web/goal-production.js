// Production projections include the first-batch delay for every income stream.
export function madeBy(row, seconds, plan = null) {
    const streams = row.streams?.length ? row.streams
        : row.target === 'season_points'
            ? (plan?.income_streams || []).map(stream => [(stream.points || 0) * stream.units_per_second, stream.lead_time_seconds])
            : [[row.perSecond, 0]];
    return streams.reduce((sum, [rate, lead]) => sum + rate * Math.max(0, seconds - lead), 0);
}

// Returns seconds until a row makes `needed`, or null if it never reaches that amount.
export function timeToMake(row, needed, plan = null) {
    let lo = 0;
    let hi = 3600;
    while (madeBy(row, hi, plan) < needed) {
        hi *= 2;
        if (hi > 1e10) return null;
    }
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (madeBy(row, mid, plan) >= needed) hi = mid;
        else lo = mid;
    }
    return hi;
}
