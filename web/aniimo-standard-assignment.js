export function buildAniimoWorkGroups(plan, options) {
    const groups = new Map();
    for (const step of plan.coin_items || []) {
        const specificWorker = options.getFacilitySpecificWorker(step.facility, step.item_name, step.facility_level);
        for (const task of step.aniimo_tasks || []) {
            const key = specificWorker ? `${options.taskLabel(task, step.facility)} (${specificWorker})` : options.taskLabel(task, step.facility);
            if (!groups.has(key)) {
                const personality = task.personality_bonus
                    ? options.facilities.find(facility => facility.name === step.facility)?.personality ?? null
                    : null;
                groups.set(key, {
                    label: key,
                    ability: task.ability,
                    level: task.level,
                    bonus: task.personality_bonus,
                    personality,
                    busy: 0,
                    where: new Map(),
                    jobs: new Map(),
                    specificWorker: specificWorker || null,
                });
            }
            const group = groups.get(key);
            group.busy += task.busy;
            if ((task.jobs || []).length) {
                for (const job of task.jobs) {
                    if (!group.jobs.has(job)) group.jobs.set(job, new Set());
                    group.jobs.get(job).add(step.facility);
                }
                continue;
            }
            const place = `${step.facility} (${options.prettyItem(step.item_name)})`;
            group.where.set(place, (group.where.get(place) || 0) + step.facility_count);
        }
    }

    const addEnvironmentWorker = (building, units, place) => {
        const ability = options.environmentBuildingAbility[building];
        if (!ability || !units) return;
        const key = `${ability} (environment)`;
        if (!groups.has(key)) groups.set(key, { label: `${ability} any level`, ability, level: 1, bonus: false, busy: 0, where: new Map(), jobs: new Map(), environment: true });
        const group = groups.get(key);
        group.busy += units;
        group.where.set(place, (group.where.get(place) || 0) + units);
    };

    const pairUnits = new Map();
    for (const assignment of plan.environment_assignments || []) {
        if (assignment.partner) {
            const key = `${assignment.building}|${assignment.partner[0]}`;
            const seen = pairUnits.get(key);
            pairUnits.set(key, { units: Math.max(seen ? seen.units : 0, assignment.units), modes: assignment.pair_modes || [assignment.mode, assignment.mode] });
            continue;
        }
        addEnvironmentWorker(assignment.building, assignment.units, `${assignment.building} (${assignment.mode})`);
    }
    for (const [key, { units, modes }] of pairUnits) {
        const [building, partner] = key.split('|');
        addEnvironmentWorker(building, units, `${building} (${modes[0]})`);
        addEnvironmentWorker(partner, units, `${partner} (${modes[1]})`);
    }
    return groups;
}

export function assignAniimoGroups(groups, opposedPersonality) {
    const rows = [...groups.values()]
        .map(group => ({ ...group, where: new Map(group.where), jobs: new Map([...group.jobs].map(([job, facilities]) => [job, new Set(facilities)])) }))
        .sort((a, b) => b.level - a.level || Number(b.bonus) - Number(a.bonus) || a.label.localeCompare(b.label));
    const kept = [];
    const holds = (host, group) => host.ability === group.ability
        && host.level >= group.level
        && host.spare >= group.busy - 1e-6
        && (!group.personality || !host.personalities.has(opposedPersonality(group.personality)));
    for (const group of rows) {
        const host = (group.environment || group.specificWorker) ? null : kept.find(candidate => !candidate.specificWorker && holds(candidate, group));
        if (host) {
            host.spare -= group.busy;
            host.busy += group.busy;
            if (group.personality) host.personalities.add(group.personality);
            group.where.forEach((count, place) => host.where.set(place, (host.where.get(place) || 0) + count));
            group.jobs.forEach((facilities, job) => {
                if (!host.jobs.has(job)) host.jobs.set(job, new Set());
                facilities.forEach(facility => host.jobs.get(job).add(facility));
            });
            continue;
        }
        group.count = Math.max(1, Math.ceil(group.busy - 1e-6));
        group.spare = group.count - group.busy;
        group.personalities = new Set(group.personality ? [group.personality] : []);
        kept.push(group);
    }
    return { kept, total: kept.reduce((sum, group) => sum + group.count, 1) };
}
