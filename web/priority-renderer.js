export function buildPriorityListMarkup({
    shown = [], priorityOrder = [], priorityTargets = [], isVietnamese = false, arrowUp = '', arrowDown = '',
}) {
    let currentRank = 0;
    const activeList = shown.filter(priority => priority.on);
    const coinsTopNotice = activeList.length > 1 && activeList[0].target === 'coins'
        ? `<div class="coins-top-priority-notice" style="margin-bottom: 0.8rem; padding: 0.65rem 0.85rem; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); border-left: 4px solid #3b82f6; border-radius: 6px; font-size: 0.82rem; color: var(--text); line-height: 1.45;">
            💡 <strong>${isVietnamese ? 'Lưu ý thứ tự ưu tiên:' : 'Priority Notice:'}</strong> ${isVietnamese ? 'Xu Gia Viên đang ở vị trí #1 sẽ khóa 100% công suất cho tiền, khiến các mục tiêu bên dưới (Aniipod Mega / EXP) không còn dư tài nguyên (sản lượng = 0). Để sản xuất chúng, hãy kéo chúng lên TRÊN Xu Gia Viên (hoặc TẮT switch của Xu Gia Viên để hệ thống tự tối ưu phần công suất còn lại).' : 'Home Coins at #1 locks 100% capacity for coin revenue, leaving 0 spare resources for lower priorities (Aniipod Mega / EXP). To produce them, drag them ABOVE Home Coins or turn Home Coins OFF.'}
          </div>`
        : '';
    return coinsTopNotice + shown.map((priority, at) => {
        const index = priorityOrder.indexOf(priority);
        const above = at > 0 ? priorityOrder.indexOf(shown[at - 1]) : -1;
        const below = at < shown.length - 1 ? priorityOrder.indexOf(shown[at + 1]) : -1;
        const meta = priorityTargets.find(target => target.id === priority.target) || {
            icon: '🎯', labelVi: priority.target, labelEn: priority.target, subVi: '', subEn: '',
        };
        const label = isVietnamese ? meta.labelVi : meta.labelEn;
        const sub = isVietnamese ? meta.subVi : meta.subEn;
        if (priority.on) currentRank++;
        const rankDisplay = priority.on
            ? `<span class="priority-rank-badge">${currentRank}</span>`
            : `<span class="priority-rank-empty">-</span>`;
        return `
        <li class="priority ${priority.on ? 'on' : 'off'}" draggable="true" data-index="${index}">
            <span class="drag-handle" title="${isVietnamese ? 'Kéo để sắp xếp' : 'Drag to reorder'}" aria-hidden="true">⋮⋮</span>
            <span class="priority-rank">${rankDisplay}</span>
            <span class="priority-icon" aria-hidden="true">${meta.icon}</span>
            <div class="priority-info">
                <span class="priority-name">${label}</span>
                ${sub ? `<span class="priority-desc">${sub}</span>` : ''}
            </div>
            <label class="priority-switch" title="${priority.on ? (isVietnamese ? 'Đang bật: Solver sẽ ưu tiên mục tiêu này' : 'On: the plan prioritizes this') : (isVietnamese ? 'Đang tắt: Solver sẽ bỏ qua mục tiêu này' : 'Off: the plan ignores this')}">
                <input type="checkbox" role="switch" data-toggle="${index}" aria-label="${label}"${priority.on ? ' checked' : ''}>
                <span class="switch-track" aria-hidden="true"></span>
                <span class="switch-text">${priority.on ? 'On' : 'Off'}</span>
            </label>
            <span class="priority-move">
                <button type="button" data-move="${index}" data-to="${above}" data-by="-1" title="${isVietnamese ? 'Chuyển lên' : 'Move up'}" aria-label="Move ${label} up"${above < 0 ? ' disabled' : ''}>${arrowUp}</button>
                <button type="button" data-move="${index}" data-to="${below}" data-by="1" title="${isVietnamese ? 'Chuyển xuống' : 'Move down'}" aria-label="Move ${label} down"${below < 0 ? ' disabled' : ''}>${arrowDown}</button>
            </span>
        </li>`;
    }).join('');
}
