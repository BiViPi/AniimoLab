export function buildRosterSummaryMarkup(options) {
    const {
        roster = [], busy = [], where = [], guardDoubleCountingViolations = [], guardMappingErrors = [],
        working = 0, have = 0, isVi = false, rosterLabel, abilityTag, personalityLetter,
        labels = {},
    } = options;
    const header = {
        aniimo: labels.aniimo || 'Aniimo',
        howMany: labels.howMany || 'How many',
        busyAverage: labels.busyAverage || 'Busy on average',
        where: labels.where || 'Where',
    };
    const rows = roster.map((aniimo, index) => {
        const places = [...(where[index] || [])]
            .map(([place, count]) => Number.isInteger(count) && count > 1 ? `${place} ×${count}` : place)
            .join(', ');
        const abilities = Object.entries(aniimo.abilities || {})
            .map(([ability, level]) => `${abilityTag ? abilityTag(ability) : ability} ${level}`).join(' ');
        const letters = (aniimo.personalities || [])
            .map(personality => typeof personalityLetter === 'function' ? personalityLetter(personality) : personality[0]).join('');
        const label = typeof rosterLabel === 'function' ? rosterLabel(aniimo, index) : (aniimo.name || `Aniimo #${index + 1}`);
        return `<tr><td data-label="Aniimo">${label}<div class="hint small">${abilities} · ${letters}</div></td><td data-label="How many">${aniimo.count}</td><td data-label="Busy on average">${busy[index].toFixed(1)}</td><td data-label="Where">${places || '<span class="hint small">idle</span>'}</td></tr>`;
    }).join('');

    let warningsHtml = '';
    if (guardDoubleCountingViolations.length > 0) {
        warningsHtml += `
            <div class="guard-invariant-warning" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; border-radius: 4px; color: #fca5a5; font-size: 0.85rem;">
                ⚠️ <strong>${isVi ? 'Vi phạm bất biến phân công Guard' : 'Guard Assignment Invariant Violation'}:</strong>
                ${guardDoubleCountingViolations.map(violation => isVi
                    ? `Thành viên <strong>${violation.name}</strong> có tổng việc và trực trụ vượt số lượng trong nhóm (${violation.existingBusy} việc + ${violation.guardCount} trụ / ${violation.memberCount} Aniimo).`
                    : `Member <strong>${violation.name}</strong> has more assigned work and guard duty than the group size (${violation.existingBusy} work + ${violation.guardCount} poles / ${violation.memberCount} Aniimo).`
                ).join('<br>')}
            </div>`;
    }
    if (guardMappingErrors.length > 0) {
        warningsHtml += `
            <div class="guard-mapping-warning" style="margin-top: 0.5rem; padding: 0.5rem; background: rgba(245, 158, 11, 0.15); border: 1px solid #f59e0b; border-radius: 4px; color: #fcd34d; font-size: 0.85rem;">
                ⚠️ <strong>${isVi ? 'Cảnh báo ánh xạ Guard' : 'Guard Mapping Warning'}:</strong>
                ${guardMappingErrors.map(error => error.message).join('<br>')}
            </div>`;
    }

    return roster.length
        ? `<table class="aniimo-table"><thead><tr><th>${header.aniimo}</th><th>${header.howMany}</th><th>${header.busyAverage}</th><th>${header.where}</th></tr></thead><tbody>${rows}</tbody></table>
               <p class="hint small">${working} of your ${have} Aniimo have work in this plan.</p>
               ${warningsHtml}`
        : `<p class="hint">Add the Aniimo you have under My Aniimo to plan with them.</p>${warningsHtml}`;
}
