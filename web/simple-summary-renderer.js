export function buildSimpleSummaryViewModel(options) {
    const {
        facilityDefinitions,
        facilities,
        modules,
        moduleUnlocks,
        moduleNames,
        homeLevel,
        isVietnamese,
        getFacilityDisplayName,
        getModuleDisplayName,
    } = options;
    const chip = (count, name, level, title = '') => `
        <div class="chip"${title ? ` title="${title}"` : ''}><span><span class="chip-count">${count}</span> ${name}</span>${level ? `<span class="chip-level">${level}</span>` : ''}</div>`;
    const built = facilityDefinitions
        .map(definition => ({ name: definition.name, tier: facilities[definition.name][0], hasLevels: definition.hasLevels !== false }))
        .filter(({ tier }) => tier.count > 0)
        .map(({ name, tier, hasLevels }) => chip(`${tier.count}×`, getFacilityDisplayName(name), hasLevels ? `Lv.${tier.level}` : ''))
        .join('');
    const moduleChips = moduleNames.map(name => {
        const level = modules[name];
        const unlocks = moduleUnlocks[name];
        const title = unlocks
            ? (isVietnamese ? `Mở khóa: ${unlocks.map((rv, i) => `Lv.${i + 1} tại RV ${rv}`).join(', ')}` : `Unlocks: ${unlocks.map((rv, i) => `Lv.${i + 1} at RV ${rv}`).join(', ')}`)
            : '';
        return chip('', getModuleDisplayName(name), level > 0 ? `Lv.${level}` : (isVietnamese ? 'chưa mở' : 'not yet'), title);
    }).join('');
    const kinds = facilityDefinitions.filter(definition => facilities[definition.name][0].count > 0).length;
    return {
        title: isVietnamese ? `${kinds} cơ sở và 8 mô-đun tại RV ${homeLevel}` : `${kinds} facilities and 8 modules at RV ${homeLevel}`,
        html: `<p class="assume-title">${isVietnamese ? 'Cơ sở' : 'Facilities'}</p>
        <div class="chip-grid">${built}</div>
        <p class="assume-title">${isVietnamese ? 'Mô-đun' : 'Modules'}</p>
        <div class="chip-grid">${moduleChips}</div>`,
    };
}
