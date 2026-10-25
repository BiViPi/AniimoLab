const PLAN_DISPLAY_CATEGORIES = [
    { titleVi: 'Sản xuất gỗ và gạch quặng', titleEn: 'Wood & Ore Processing', sourceCategories: ['Wood & Ore Processing'] },
    { titleVi: 'Sản xuất nguyên liệu', titleEn: 'Materials Production', sourceCategories: ['Materials', 'Aniimo Materials'] },
    { titleVi: 'Cơ sở chế biến', titleEn: 'Processing Facilities', sourceCategories: ['Materials Processing'] },
];

export function buildFacilityPlanMarkup(plan, options) {
    const {
        environmentModeOrder, splitByEnvironmentUnit, modeTag, environmentRenderer,
        facilityPlanTableOf, facilityPlanTable, facilityCategories, facilityCategoryByName,
        getFacilityDisplayName, isVietnamese: isVi,
    } = options;
    const steps = plan.coin_items || [];
    if (steps.length === 0) return '<p class="hint">Nothing profitable to produce with the current facilities.</p>';

    const envGroups = new Map();
    const ungatedSteps = [];
    steps.forEach(step => {
        if (step.environment) {
            if (!envGroups.has(step.environment)) envGroups.set(step.environment, []);
            envGroups.get(step.environment).push(step);
        } else {
            ungatedSteps.push(step);
        }
    });
    const assignments = plan.environment_assignments || [];
    const byMode = new Map();
    environmentModeOrder.filter(mode => envGroups.has(mode)).forEach(mode => {
        byMode.set(mode, splitByEnvironmentUnit(envGroups.get(mode), assignments.filter(assignment => assignment.mode === mode)));
    });
    const pairs = new Map();
    const singles = [];
    byMode.forEach((units, mode) => {
        units.forEach(unit => {
            if (!unit.partner) {
                singles.push({ mode, unit });
                return;
            }
            const key = `${unit.building}|${unit.partner[0]}|${unit.partner[1]},${unit.partner[2]}`;
            if (!pairs.has(key)) pairs.set(key, { unit, zones: [] });
            pairs.get(key).zones.push({ mode, layout: unit.layout, rows: unit.rows, zone: unit.zone });
        });
    });

    const pairSections = [...pairs.values()].map(({ unit, zones }) => {
        zones.sort((a, b) => a.zone - b.zone);
        const modes = unit.pairModes || [unit.mode, unit.mode];
        const middle = zones.find(zone => zone.zone === 1)?.mode;
        const overlapText = isVi ? 'Giao thoa' : 'Overlap';
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${getFacilityDisplayName(unit.building)} ${modeTag(modes[0])}<span class="env-head-sep">|</span>${getFacilityDisplayName(unit.partner[0])} ${modeTag(modes[1])}${middle ? `<span class="env-head-sep">|</span>${overlapText} ${modeTag(middle)}` : ''}</h4>
                <div class="env-unit">
                    ${environmentRenderer.renderDiagram(zones.flatMap(zone => zone.layout), zones[0].mode, unit.building, zones.flatMap(zone => zone.rows), unit, zones)}
                    <div class="env-unit-table">${facilityPlanTableOf(zones.map(zone => ({ label: modeTag(zone.mode), rows: zone.rows })), { isFarm: true })}</div>
                </div>
            </div>
        `;
    }).join('');

    const modeSections = environmentModeOrder.map(mode => {
        const units = singles.filter(single => single.mode === mode).map(single => single.unit);
        if (units.length === 0) {
            const placed = {};
            (byMode.get(mode) || []).forEach(unit => unit.rows.forEach(row => {
                placed[`${row.facility}|${row.item_name}`] = (placed[`${row.facility}|${row.item_name}`] || 0) + row.facility_count;
            }));
            const orphans = (envGroups.get(mode) || [])
                .map(step => ({ ...step, facility_count: step.facility_count - (placed[`${step.facility}|${step.item_name}`] || 0) }))
                .filter(step => step.facility_count > 0);
            return orphans.length === 0 ? '' : `
                <div class="facility-category">
                    <h4 class="facility-category-title">${modeTag(mode)}</h4>
                    ${facilityPlanTable(orphans, { isFarm: true })}
                </div>`;
        }
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${getFacilityDisplayName(units[0].building)} ${modeTag(mode)}</h4>
                ${units.map((unit, index) => `
                    ${units.length > 1 ? `<p class="hint small">${getFacilityDisplayName(unit.building)} ${index + 1}</p>` : ''}
                    <div class="env-unit">
                        ${environmentRenderer.renderDiagram(unit.layout, mode, unit.building, unit.rows, unit)}
                        <div class="env-unit-table">${facilityPlanTable(unit.rows, { isFarm: true })}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    const environmentSections = pairSections + modeSections;

    const unconditionedFarmSteps = [];
    const regularUngatedSteps = [];
    ungatedSteps.forEach(step => {
        const baseFacility = (step.facility || '').replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (baseFacility === 'Farmland' || baseFacility === 'Woodland') unconditionedFarmSteps.push(step);
        else regularUngatedSteps.push(step);
    });
    const activeFarmSteps = unconditionedFarmSteps.filter(step => step.status === 'producing' && Boolean(step.item_name));
    const unconditionedFarmSection = activeFarmSteps.length > 0 ? `
            <div class="facility-category unconditioned-farm-category">
                <h4 class="facility-category-title">🌱 ${isVi ? 'Đất trồng không thuộc bộ phận điều hòa' : 'Unconditioned Farm & Tree Plots'}</h4>
                ${facilityPlanTable(activeFarmSteps, { isFarm: true })}
            </div>
        ` : '';

    const byCategory = new Map(facilityCategories.map(category => [category, []]));
    regularUngatedSteps.forEach(step => {
        const category = facilityCategoryByName.get(step.facility) || 'Materials Processing';
        if (!byCategory.has(category)) byCategory.set(category, []);
        byCategory.get(category).push(step);
    });
    const categorySections = PLAN_DISPLAY_CATEGORIES.map(category => {
        let categorySteps = [];
        category.sourceCategories.forEach(sourceCategory => categorySteps.push(...(byCategory.get(sourceCategory) || [])));
        categorySteps = categorySteps.filter(step => step.status === 'producing' && Boolean(step.item_name));
        if (categorySteps.length === 0) return '';
        const categoryName = isVi ? category.titleVi : category.titleEn;
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${categoryName}</h4>
                ${facilityPlanTable(categorySteps)}
            </div>
        `;
    }).join('');
    return environmentSections + unconditionedFarmSection + categorySections;
}
