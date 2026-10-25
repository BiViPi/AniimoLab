const EXCLUDED_FROM_CRAFTING = new Set([
    'Farmland', 'Woodland', 'Mine', 'Well', 'Woodworking Bench', 'Chimney Kiln'
]);

export function buildAniimoCraftingMembers(plan, options) {
    const poolsByAbility = new Map();
    for (const step of plan.coin_items || []) {
        const baseFacility = (step.facility || '').replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (step.status !== 'producing' || EXCLUDED_FROM_CRAFTING.has(baseFacility) || options.residentFacilities.has(baseFacility)) continue;
        const count = step.facility_count || 0;
        if (count <= 0) continue;
        const mode = options.resolveStepMode(step, baseFacility);
        if (mode === 'electric') continue;

        const facilityDefinition = options.facilities.find(facility => facility.name === baseFacility);
        const ability = facilityDefinition?.ability || step.aniimo?.ability || 'Artisanship';
        if (!poolsByAbility.has(ability)) poolsByAbility.set(ability, []);
        poolsByAbility.get(ability).push({
            facility: baseFacility,
            item_name: step.item_name,
            count,
            isPrismana: mode === 'prismana'
        });
    }

    const members = [];
    poolsByAbility.forEach((machines, ability) => {
        const totalMachines = machines.reduce((sum, machine) => sum + machine.count, 0);
        if (totalMachines <= 0) return;

        const neededWorkers = Math.ceil(totalMachines / 2);
        const hasPrismana = machines.some(machine => machine.isPrismana);
        const level = hasPrismana ? 4 : 3;
        let workerName = `${ability} Lv.${level}`;
        let specific = '';
        if (ability === 'Fire') {
            workerName = hasPrismana ? 'Scorchhowl' : 'Ignis';
            specific = workerName;
        } else if (ability === 'Water') {
            workerName = hasPrismana ? 'Piopiota (Đêm)' : 'Aquata';
            specific = workerName;
        } else if (ability === 'Artisanship') {
            workerName = hasPrismana ? 'Fulmintis' : (options.isVi ? 'Thợ Thủ Công' : 'Artisan');
            specific = hasPrismana ? 'Fulmintis' : '';
        } else if (ability === 'Dark') {
            workerName = hasPrismana ? 'Pawney' : 'Rookey';
            specific = workerName;
        }

        const uniqueFacilities = [...new Set(machines.map(machine => options.getFacilityDisplayName(machine.facility)))];
        const facilitySummary = uniqueFacilities.join(' + ');
        const desc = totalMachines > 1
            ? (options.isVi ? `Kiêm nhiệm ${totalMachines} máy chế biến Hệ ${ability}` : `Handles ${totalMachines} ${ability} crafting units`)
            : (options.isVi ? `Chế biến ${options.prettyItem(machines[0].item_name)}` : `Crafts ${options.prettyItem(machines[0].item_name)}`);

        members.push({
            facility: `${facilitySummary} (${totalMachines} ${options.isVi ? 'máy' : 'units'})`,
            worker: workerName,
            count: neededWorkers,
            ability,
            level,
            desc,
            specific
        });
    });
    return { members, total: members.reduce((sum, member) => sum + member.count, 0) };
}
