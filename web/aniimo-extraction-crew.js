export function buildAniimoExtractionMembers(plan, options) {
    const members = [];
    for (const step of plan.coin_items || []) {
        const baseFacility = (step.facility || '').replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (step.status !== 'producing') continue;
        const count = step.facility_count || 0;
        if (count <= 0) continue;

        const mode = options.resolveStepMode(step, baseFacility);
        if (mode === 'electric') continue;
        if (baseFacility === 'Mine') {
            const isPrismana = mode === 'prismana';
            members.push({
                facility: `${options.getFacilityDisplayName('Mine')} (${options.prettyItem(step.item_name)})`,
                worker: isPrismana ? 'Waleetle' : 'Shrubclaw',
                count,
                ability: 'Earth',
                level: isPrismana ? 4 : 3,
                desc: isPrismana
                    ? (options.isVi ? 'Khai thác quặng (Prismana Thổ Lv.4)' : 'Mining (Prismana Earth Lv.4)')
                    : (options.isVi ? 'Khai thác quặng (Thủ công Thổ Lv.3)' : 'Mining (Manual Earth Lv.3)'),
                specific: isPrismana ? 'Waleetle' : 'Shrubclaw'
            });
        } else if (baseFacility === 'Well') {
            const isPrismana = mode === 'prismana';
            members.push({
                facility: `${options.getFacilityDisplayName('Well')} (${options.prettyItem(step.item_name)})`,
                worker: isPrismana ? (options.isVi ? 'Thủy Prismana Lv.4' : 'Water Prismana Lv.4') : 'Aquata',
                count,
                ability: 'Water',
                level: isPrismana ? 4 : 3,
                desc: isPrismana
                    ? (options.isVi ? 'Bơm nước (Prismana Thủy Lv.4)' : 'Pumping (Prismana Water Lv.4)')
                    : (options.isVi ? 'Bơm nước (Thủ công Thủy Lv.3)' : 'Pumping (Manual Water Lv.3)'),
                specific: isPrismana ? '' : 'Aquata'
            });
        }
    }
    return { members, total: members.reduce((sum, member) => sum + member.count, 0) };
}
