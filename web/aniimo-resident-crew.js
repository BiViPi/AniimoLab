export const ANIIMO_RESIDENT_FACILITIES = new Set([
    'Tidewhisper Sandcastle',
    'Dewy House',
    'Nimbus Bed',
    'Starfall Hammock',
    'Floral Windmill'
]);

export function buildAniimoResidentMembers(plan, options) {
    const members = [];
    for (const step of plan.coin_items || []) {
        const baseFacility = (step.facility || '').replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (step.status !== 'producing' || !ANIIMO_RESIDENT_FACILITIES.has(baseFacility)) continue;
        const count = step.facility_count || 1;
        if (count <= 0) continue;

        const specificWorker = options.getFacilitySpecificWorker(baseFacility, step.item_name, step.facility_level);
        const ability = step.aniimo ? step.aniimo.ability : (options.facilities.find(facility => facility.name === baseFacility)?.ability || 'Leisure');
        const level = step.aniimo ? step.aniimo.level : 4;
        members.push({
            facility: options.getFacilityDisplayName(baseFacility),
            worker: specificWorker || `${ability} Lv.${level}`,
            count,
            ability,
            level,
            desc: `${options.prettyItem(step.item_name)} (${options.isVi ? 'Túc trực 24/7' : 'Resident 24/7'})`,
            specific: specificWorker || ''
        });
    }
    return { members, total: members.reduce((sum, member) => sum + member.count, 0) };
}
