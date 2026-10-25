export function calculateAniimoRosterSummary(plan, options) {
    const activeRoster = options.roster || [];
    const busy = activeRoster.map(() => 0);
    const where = activeRoster.map(() => new Map());
    const guardDoubleCountingViolations = [];
    const guardMappingErrors = [];
    const isVietnamese = options.isVietnamese;

    for (const step of plan.coin_items || []) {
        if (step.crew == null || step.status !== 'producing' || !activeRoster[step.crew]) continue;
        busy[step.crew] += options.residentFacilities.has(step.facility) ? step.facility_count : (step.busy_units ?? step.facility_count);
        const place = `${step.facility} (${options.prettyItem(step.item_name)})`;
        where[step.crew].set(place, (where[step.crew].get(place) || 0) + step.facility_count);
    }
    for (const [building, member, share] of plan.staffing || []) {
        if (!activeRoster[member]) continue;
        busy[member] += share;
        where[member].set(building, (where[member].get(building) || 0) + share);
    }

    for (const entry of Array.isArray(plan.guard_staffing) ? plan.guard_staffing : []) {
        let memberIndex;
        let count;
        if (Array.isArray(entry)) [memberIndex, count] = entry;
        else if (entry && typeof entry === 'object') {
            memberIndex = entry.aniimo_index ?? entry.member ?? entry.index;
            count = entry.count ?? 1;
        } else continue;
        if (!Number.isInteger(memberIndex) || memberIndex < 0 || memberIndex >= activeRoster.length) {
            guardMappingErrors.push({
                index: memberIndex,
                count,
                message: isVietnamese
                    ? `Lỗi mapping: Solver gán guard cho index #${memberIndex} nhưng roster chỉ có ${activeRoster.length} thành viên`
                    : `Mapping error: Solver assigned guard to index #${memberIndex} but roster has only ${activeRoster.length} members`,
            });
            continue;
        }
        const member = activeRoster[memberIndex];
        const parsedMemberCount = Number(member?.count);
        const memberCount = Number.isFinite(parsedMemberCount) && parsedMemberCount >= 0 ? parsedMemberCount : 1;
        const validGuardCount = Number.isFinite(count) && count > 0 ? count : 0;
        if (validGuardCount === 0) {
            guardMappingErrors.push({
                index: memberIndex,
                count,
                message: isVietnamese
                    ? `Lỗi mapping: số Aniimo trực trụ không hợp lệ tại index #${memberIndex}`
                    : `Mapping error: invalid guard count at index #${memberIndex}`,
            });
            continue;
        }
        if (busy[memberIndex] + validGuardCount > memberCount + 1e-6) {
            guardDoubleCountingViolations.push({
                index: memberIndex,
                name: options.rosterLabel(member, memberIndex),
                existingBusy: busy[memberIndex],
                guardCount: validGuardCount,
                memberCount,
            });
        }
        busy[memberIndex] += validGuardCount;
        const guardPlace = isVietnamese
            ? (validGuardCount > 1 ? `⚡ Trực trạm điện ×${validGuardCount}` : '⚡ Trực trạm điện')
            : (validGuardCount > 1 ? `⚡ Power Pole Guard ×${validGuardCount}` : '⚡ Power Pole Guard');
        where[memberIndex].set(guardPlace, (where[memberIndex].get(guardPlace) || 0) + validGuardCount);
    }

    const jobs = new Map();
    for (const step of plan.coin_items || []) {
        if (step.status !== 'producing' || !(step.facility === 'Farmland' || step.facility === 'Woodland')) continue;
        for (const [job, ability, level] of (options.recipeIndex.find(recipe => recipe.name === step.item_name)?.jobs || [])) {
            jobs.set(`${job}|${ability}|${level}|${step.facility}`, { job, ability, level, facility: step.facility });
        }
    }
    for (const { job, ability, level, facility } of jobs.values()) {
        const able = activeRoster.map((_, index) => index).filter(index => (activeRoster[index].abilities[ability] || 0) >= level);
        if (!able.length) continue;
        const pick = able.reduce((a, b) => busy[b] / activeRoster[b].count < busy[a] / activeRoster[a].count ? b : a);
        const place = `${job} on ${facility}`;
        if (!where[pick].has(place)) where[pick].set(place, 1);
    }
    const have = activeRoster.reduce((sum, member) => sum + member.count, 0);
    const working = activeRoster.reduce((sum, member, index) => sum + Math.min(member.count, Math.ceil(busy[index] - 1e-6)), 0);
    return { working, have, busy, where, guardDoubleCountingViolations, guardMappingErrors };
}
