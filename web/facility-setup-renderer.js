const VI_CATEGORIES = {
    Materials: 'Nguyên Liệu',
    Environment: 'Môi Trường',
    'Aniimo Materials': 'Nguyên Liệu Aniimo',
    'Wood & Ore Processing': 'Gia Công Gỗ & Quặng',
    'Materials Processing': 'Chế Biến Nguyên Liệu',
};

export function buildTierRowsMarkup(facility, tiers) {
    const showRemove = tiers.length > 1;
    return tiers.map(tier => `
        <div class="facility-inputs tier-row">
            <div class="input-field">
                <label>Count</label>
                <input type="number" class="tier-count" value="${tier.count}" min="0" max="999">
            </div>
            ${facility.hasLevels === false ? '' : `
            <div class="input-field">
                <label>Level</label>
                <input type="number" class="tier-level" value="${tier.level}" min="1" max="10">
            </div>
            `}
            ${showRemove ? '<button type="button" class="tier-remove-btn" title="Remove this level">&times;</button>' : ''}
        </div>
    `).join('');
}

export function buildFacilityCardsMarkup(options) {
    const { categories, facilities, isVietnamese, emodeFacilities, getFacilityDisplayName } = options;
    return categories.map(category => {
        const categoryName = options.getCategoryDisplayName
            ? options.getCategoryDisplayName(category)
            : (isVietnamese && VI_CATEGORIES[category] ? VI_CATEGORIES[category] : category);
        const cards = facilities.filter(facility => facility.category === category).map(facility => `
            <div class="facility-card">
                <h4>${getFacilityDisplayName(facility.name)} <span class="info-icon" data-tooltip="${facility.tooltip}">?</span></h4>
                <div class="facility-tiers" data-facility="${facility.name}"></div>
                ${facility.hasLevels === false ? '' : '<button type="button" class="add-tier-btn" data-facility="' + facility.name + '">' + (isVietnamese ? '+ Thêm cấp' : '+ Add level') + '</button>'}
                ${facility.supportsEmode ? `<label class="facility-emode-toggle" title="${isVietnamese ? 'Chạy ở Chế độ điện (tự động, không cần nhân công Aniimo)' : 'Run in Electric Mode (automatic, no Aniimo worker needed)'}"><input type="checkbox" class="facility-emode-checkbox" data-facility="${facility.name}" ${emodeFacilities.has(facility.name) ? 'checked' : ''}> ${isVietnamese ? '⚡ Chế độ điện' : '⚡ E-mode'}</label>` : ''}
            </div>
        `).join('');
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${categoryName}</h4>
                <div class="facilities-grid">${cards}</div>
            </div>
        `;
    }).join('');
}
