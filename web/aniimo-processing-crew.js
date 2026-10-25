export function buildAniimoProcessingMembers(plan, options) {
    const members = [];
    for (const step of plan.coin_items || []) {
        const baseFacility = (step.facility || '').replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (step.status !== 'producing') continue;
        const count = step.facility_count || 0;
        if (count <= 0) continue;

        const mode = options.resolveStepMode(step, baseFacility);
        if (mode === 'electric') continue;
        if (baseFacility === 'Woodworking Bench') {
            const isPrismana = mode === 'prismana';
            members.push({
                facility: options.getFacilityDisplayName(baseFacility),
                worker: isPrismana ? 'Fulmintis' : (options.isVi ? 'Thợ Mộc (Kỹ nghệ Lv.3)' : 'Carpenter (Artisanship Lv.3)'),
                count,
                ability: 'Artisanship',
                level: isPrismana ? 4 : 3,
                desc: isPrismana
                    ? (options.isVi ? 'Cưa xẻ gỗ (Prismana Kỹ nghệ Lv.4)' : 'Woodworking (Prismana Lv.4)')
                    : (options.isVi ? 'Cưa xẻ gỗ (Thủ công Kỹ nghệ Lv.3)' : 'Woodworking (Manual Lv.3)'),
                specific: isPrismana ? 'Fulmintis' : ''
            });
        } else if (baseFacility === 'Chimney Kiln') {
            const isPrismana = mode === 'prismana';
            members.push({
                facility: options.getFacilityDisplayName(baseFacility),
                worker: isPrismana ? 'Scorchhowl' : 'Ignis',
                count,
                ability: 'Fire',
                level: isPrismana ? 4 : 3,
                desc: isPrismana
                    ? (options.isVi ? 'Nung gạch quặng (Prismana Hỏa Lv.4)' : 'Smelting (Prismana Fire Lv.4)')
                    : (options.isVi ? 'Nung gạch quặng (Thủ công Hỏa Lv.3)' : 'Smelting (Manual Fire Lv.3)'),
                specific: isPrismana ? 'Scorchhowl' : 'Ignis'
            });
        }
    }
    return { members, total: members.reduce((sum, member) => sum + member.count, 0) };
}
