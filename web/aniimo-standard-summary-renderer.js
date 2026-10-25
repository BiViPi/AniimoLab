export function renderAniimoStandardSummary(options) {
    const toggleText = options.isVi
        ? (options.detailsExpanded
            ? '▲ Thu gọn danh sách chi tiết các nhóm công nhân'
            : '👉 Bấm vào đây để hiện đầy đủ thông tin các nhóm công nhân ▼')
        : (options.detailsExpanded
            ? '▲ Collapse worker group details'
            : '👉 Click here to show full worker details for all groups ▼');
    const groupTitle = options.isVi ? 'Bấm để mở / đóng bảng chi tiết các nhóm' : 'Click to toggle group detail table';
    const bannerHtml = `
        <div class="roster-groups-banner">
            <div class="roster-group-card group-farming" onclick="window.toggleRosterDetails()" style="cursor: pointer;" title="${groupTitle}">
                <div class="roster-group-top">
                    <span class="roster-group-label">🌾 ${options.isVi ? 'Nhóm 1: Đồng Áng' : 'Group 1: Farming'}</span>
                    <span class="roster-group-count">${options.farmTotal}</span>
                </div>
                <p class="roster-group-desc">${options.isVi ? `${options.totalFarmPlots} ô đất · 🛡️ Dự phòng kép chống AFK` : `${options.totalFarmPlots} plots · 🛡️ Anti-AFK backup`}</p>
            </div>
            <div class="roster-group-card group-stationary" onclick="window.toggleRosterDetails()" style="cursor: pointer;" title="${groupTitle}">
                <div class="roster-group-top">
                    <span class="roster-group-label">⛏️⚡ ${options.isVi ? 'Nhóm 2: Trông Cơ Sở & Mỏ' : 'Group 2: Stationary & Mine'}</span>
                    <span class="roster-group-count">${options.statTotal}</span>
                </div>
                <p class="roster-group-desc">${options.isVi ? `${options.effectiveGuardCount} Trụ điện · Mỏ quặng · Giếng · Thú cưng · Điều hòa` : 'Mines · Wells · Power · Residents · Climate'}</p>
            </div>
            <div class="roster-group-card group-processing" onclick="window.toggleRosterDetails()" style="cursor: pointer;" title="${groupTitle}">
                <div class="roster-group-top">
                    <span class="roster-group-label">🪵🔥 ${options.isVi ? 'Nhóm 3: Gia Công Gỗ/Quặng' : 'Group 3: Wood & Ore'}</span>
                    <span class="roster-group-count">${options.procTotal}</span>
                </div>
                <p class="roster-group-desc">${options.isVi ? 'Bàn gia công gỗ · Lò ống khói thủ công' : 'Woodworking Bench · Chimney Kiln'}</p>
            </div>
            <div class="roster-group-card group-crafting" onclick="window.toggleRosterDetails()" style="cursor: pointer;" title="${groupTitle}">
                <div class="roster-group-top">
                    <span class="roster-group-label">🍲 ${options.isVi ? 'Nhóm 4: Chế Biến Thành Phẩm' : 'Group 4: Processing & Craft'}</span>
                    <span class="roster-group-count">${options.craftTotal}</span>
                </div>
                <p class="roster-group-desc">${options.isVi ? 'Nồi hầm · Bếp lửa · Thùng ủ (Kiêm nhiệm 2 máy/con)' : 'Simmering Pot · Stove · Keg (Shared 2 facs/worker)'}</p>
            </div>
        </div>
    `;
    const toggleBarHtml = `
        <div class="roster-table-toggle-bar" id="roster-table-toggle" onclick="window.toggleRosterDetails()" role="button" tabindex="0" title="${options.isVi ? 'Bấm để mở / đóng bảng chi tiết các nhóm' : 'Click to toggle group detail table'}">
            <span class="roster-toggle-icon" id="roster-toggle-icon">${options.detailsExpanded ? '▼' : '▶'}</span>
            <span class="roster-toggle-text" id="roster-toggle-text">${toggleText}</span>
        </div>
    `;

    return `
        ${bannerHtml}
        ${toggleBarHtml}
        <div class="table-wrapper roster-details-wrapper" id="roster-details-wrapper" style="display: ${options.detailsExpanded ? 'block' : 'none'};">
            <table class="facility-plan-table roster-3col-table">
                <thead>
                    <tr>
                        <th class="col-facility">${options.isVi ? 'Tên cơ sở / Nhiệm vụ' : 'Facility / Task'}</th>
                        <th class="col-worker">${options.isVi ? 'Loại Aniimo' : 'Aniimo Worker'}</th>
                        <th class="col-count">${options.isVi ? 'Số lượng' : 'Count'}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="roster-group-header-row farming-header">
                        <td colspan="3">🌾 ${options.isVi ? 'Nhóm 1: Tổ Đội Đồng Áng Luân Phiên' : 'Group 1: Unified Farming Crew'} (${options.farmTotal} Aniimo)</td>
                    </tr>
                    ${options.farmingRowsHtml}
                    <tr class="roster-group-header-row stationary-header">
                        <td colspan="3">⛏️⚡ ${options.isVi ? 'Nhóm 2: Trông Cơ Sở 24/24 & Khai Thác Thô' : 'Group 2: Stationary & Gathering Crew'} (${options.statTotal} Aniimo)</td>
                    </tr>
                    ${options.statRowsHtml}
                    <tr class="roster-group-header-row processing-header">
                        <td colspan="3">🪵🔥 ${options.isVi ? 'Nhóm 3: Chuyên Trách Gia Công Gỗ & Quặng' : 'Group 3: Wood & Ore Processing Crew'} (${options.procTotal} Aniimo)</td>
                    </tr>
                    ${options.procRowsHtml}
                    <tr class="roster-group-header-row crafting-header">
                        <td colspan="3">🍲 ${options.isVi ? 'Nhóm 4: Sản Xuất & Chế Biến Thành Phẩm (Kiêm nhiệm theo hệ)' : 'Group 4: Processing & Crafting Crew (Worksharing)'} (${options.craftTotal} Aniimo)</td>
                    </tr>
                    ${options.craftRowsHtml}
                </tbody>
            </table>
        </div>
        ${options.capNote}
    `;
}
