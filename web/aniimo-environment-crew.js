export function buildAniimoEnvironmentMembers(plan, options) {
    const members = [];
    const pushEnvironmentWorker = (building, count, mode) => {
        if (!count || count <= 0) return;
        if (building === 'Heat Furnace') {
            members.push({
                facility: `${options.getFacilityDisplayName(building)} (${mode || 'Nhiệt'})`,
                worker: 'Ignis',
                count,
                ability: 'Fire',
                level: 3,
                desc: options.isVi ? `Trực Lò Sưởi (${mode || 'Nhiệt'}) 24/7` : `Maintains Heat Furnace (${mode || 'Heat'}) 24/7`,
                specific: 'Ignis'
            });
        } else if (building === 'Cooling Unit') {
            members.push({
                facility: `${options.getFacilityDisplayName(building)} (${mode || 'Lạnh'})`,
                worker: options.isVi ? 'Băng Lv.3' : 'Ice Lv.3',
                count,
                ability: 'Ice',
                level: 3,
                desc: options.isVi ? `Trực Máy Làm Mát (${mode || 'Lạnh'}) 24/7` : `Maintains Cooling Unit (${mode || 'Cold'}) 24/7`,
                specific: ''
            });
        } else if (building === 'Sunlamp') {
            members.push({
                facility: `${options.getFacilityDisplayName(building)}`,
                worker: 'Lumik',
                count,
                ability: 'Light',
                level: 3,
                desc: options.isVi ? 'Trực Đèn Mặt Trời chiếu sáng 24/7' : 'Maintains Sunlamp lighting 24/7',
                specific: 'Lumik'
            });
        }
    };

    const pairUnits = new Map();
    for (const assignment of plan.environment_assignments || []) {
        if (assignment.partner) {
            const key = `${assignment.building}|${assignment.partner[0]}`;
            const seen = pairUnits.get(key);
            pairUnits.set(key, {
                units: Math.max(seen ? seen.units : 0, assignment.units || 0),
                modes: assignment.pair_modes || [assignment.mode, assignment.mode]
            });
            continue;
        }
        pushEnvironmentWorker(assignment.building, assignment.units || 0, assignment.mode);
    }
    pairUnits.forEach(({ units, modes }, key) => {
        const [building, partner] = key.split('|');
        pushEnvironmentWorker(building, units, modes[0]);
        pushEnvironmentWorker(partner, units, modes[1]);
    });

    return { members, total: members.reduce((sum, member) => sum + member.count, 0) };
}
