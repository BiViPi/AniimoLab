export function buildFacilityPlanTableMarkup(options) {
    const { groups, isFarm, isVietnamese, hasOverrides, renderRows, heading } = options;
    const body = groups
        .map(group => (group.label ? `<tr class="facility-plan-group"><td colspan="${isFarm ? 4 : 6}">${group.label}</td></tr>` : '') + renderRows(group.rows))
        .join('');

    if (isFarm) {
        return `
            <div class="table-wrapper farming-plots-table-wrapper">
                <table class="facility-plan-table farming-plots-table">
                    <thead>
                        <tr>
                            <th>${heading('th_facility', 'Facility')}</th>
                            <th>${heading('th_count', 'Count')}</th>
                            <th>${heading('th_producing', 'Producing')}</th>
                            <th>${heading('th_why', 'Why')}</th>
                        </tr>
                    </thead>
                    <tbody>${body}</tbody>
                </table>
            </div>
        `;
    }

    return `
        <div class="table-wrapper worksheet-table-wrapper">
            <div class="worksheet-toolbar">
                <div class="worksheet-toolbar-left">
                    <span class="worksheet-toolbar-title">⚡ Interactive Worksheet</span>
                    <span class="worksheet-scroll-hint">${isVietnamese ? '👉 Vuốt ngang để chỉnh Chế độ & xem Aniimo' : '👉 Swipe horizontally for Modes & Aniimo'}</span>
                    <span id="fast-resolve-benchmark-badge" class="benchmark-badge" style="display: none;"></span>
                </div>
                <div class="worksheet-toolbar-actions">
                    <button type="button" id="btn-reset-overrides" class="btn-reset-overrides" style="display: ${hasOverrides ? 'inline-flex' : 'none'};" onclick="window.resetWorksheetOverrides()" title="Hoàn tác toàn bộ can thiệp thủ công về thuật toán tự động tối ưu">
                        ↺ ${isVietnamese ? 'Tự động tối ưu' : 'Auto Optimize'}
                    </button>
                </div>
            </div>
            <table class="facility-plan-table">
                <thead>
                    <tr>
                        <th>${heading('th_facility', 'Facility')}</th>
                        <th>${heading('th_count', 'Count')}</th>
                        <th>${isVietnamese ? 'Chế độ' : 'Mode'}</th>
                        <th>${heading('th_producing', 'Producing')}</th>
                        <th>${heading('th_aniimo', 'Aniimo')}</th>
                        <th>${heading('th_why', 'Why')}</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    `;
}
