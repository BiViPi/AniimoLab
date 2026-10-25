export function buildSpecialRecipeViewModel(options) {
    const activeInPlan = new Set(options.selectedPlanNames || []);
    const lockedSelections = [];
    const html = options.recipes.map(recipe => {
        const unlockRv = recipe.unlockRV || 1;
        const isLocked = options.currentRv < unlockRv;
        const selected = options.selectedNames.has(recipe.name);
        if (isLocked && selected) lockedSelections.push(recipe.name);
        const checked = selected && !isLocked;
        const isVi = options.isVietnamese;
        const rvBadgeText = isVi
            ? (isLocked ? `🔒 Mở khóa tại RV ${unlockRv}` : `Mở khóa tại RV ${unlockRv}`)
            : (isLocked ? `🔒 Unlocks at RV ${unlockRv}` : `Unlocks at RV ${unlockRv}`);
        let statusBadge = '';
        if (checked) {
            if (activeInPlan.has(recipe.name)) {
                statusBadge = `<span class="special-status-badge in-plan" title="${isVi ? 'Đang chạy trong kế hoạch' : 'Active in production plan'}">✓ ${isVi ? 'Đã dùng' : 'In Plan'}</span>`;
            } else if (options.planSucceeded) {
                statusBadge = `<span class="special-status-badge not-used" title="${isVi ? 'Ứng viên được chọn nhưng solver không phân bổ công suất' : 'Checked candidate but not selected by solver'}">${isVi ? '(Không chọn)' : '(Not selected)'}</span>`;
            }
        }
        return `
        <label class="special-recipe-card ${checked ? 'active' : ''} ${isLocked ? 'locked' : ''}">
            <input type="checkbox" class="special-card-checkbox" data-special="${recipe.name}"${checked ? ' checked' : ''}${isLocked ? ' disabled' : ''}>
            <div class="special-card-thumb">
                ${options.renderItemIcon(recipe.name)}
            </div>
            <div class="special-card-info">
                <span class="special-card-name">${options.getItemDisplayName(recipe.name)}</span>
                <span class="special-card-facility">
                    ${options.renderFacilityIcon(recipe.facility)}
                    <span>${options.getFacilityDisplayName(recipe.facility)}</span>
                </span>
                <div class="special-card-badges">
                    <span class="special-rv-badge ${isLocked ? 'rv-future' : ''}">${rvBadgeText}</span>
                    ${statusBadge}
                </div>
            </div>
        </label>`;
    }).join('');
    return { html, lockedSelections };
}
