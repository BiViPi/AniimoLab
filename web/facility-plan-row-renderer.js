export function buildFacilityPlanRows(options) {
    const modeUpdates = [];
    const html = options.rows.map(step => {
        const rawFacility = step.facility || '';
        const facility = rawFacility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
        if (options.isFarm) {
            return `
                <tr class="status-${step.status}">
                    <td data-label="Facility"><div class="facility-cell">${options.renderFacilityIcon(facility)}<span class="facility-name-text">${options.getFacilityDisplayName(facility)}</span></div></td>
                    <td data-label="Count">${step.facility_count}</td>
                    <td data-label="Producing"><div class="item-cell">${step.item_name ? `${options.renderItemIcon(step.item_name)}<span class="item-name-text">${options.prettyItem(step.item_name)}</span>` : '-'}</div></td>
                    <td data-label="Why">${options.prettyReason(step.reason)}</td>
                </tr>`;
        }

        const isMine = facility === 'Mine';
        const isWell = facility === 'Well';
        const facilityDefinition = options.facilities.find(item => item.name === facility);
        const supportsEmode = options.emodeAvailable && (facilityDefinition?.supportsEmode ?? false);
        const override = options.facilityOverrides.find(item => item.facility === facility);
        let mode = step.mode;
        if (!mode) {
            if (options.emodeAvailable && (step.is_emode || rawFacility.includes('(Electric)'))) mode = 'electric';
            else if (step.is_specialist || rawFacility.includes('(Prismana)') || step.item_name?.includes('__specialist')) mode = 'prismana';
            else if (step.is_manual || rawFacility.includes('(Manual)') || step.item_name?.includes('__manual')) mode = 'manual';
            else if (override) {
                if (options.emodeAvailable && override.electric_count > 0) mode = 'electric';
                else if (override.specialist_count > 0) mode = 'prismana';
                else if (override.manual_count > 0) mode = 'manual';
                else mode = 'manual';
            } else if (options.emodeAvailable && step.is_emode !== false && supportsEmode && (options.lastEmodeCounts[facility] || 0) > 0 && !isMine && !isWell) mode = 'electric';
            else mode = 'manual';
        }
        modeUpdates.push({ step, mode });

        const wattsPerUnit = options.emodeAvailable ? (options.powerWatts[facility] || 0) : 0;
        const totalWatts = options.emodeAvailable && mode === 'electric' ? wattsPerUnit * step.facility_count : 0;
        const powerBadge = totalWatts > 0 ? `<span class="facility-power-badge">⚡ ${totalWatts}W</span>` : '';
        const stepIndex = options.stepIndex(step);
        const isVi = options.isVietnamese;
        const selected = candidate => mode === candidate || (candidate === 'prismana' && mode === 'specialist');
        const electricButton = `<button type="button" class="mode-pill pill-electric ${selected('electric') ? 'active' : ''}" onclick="window.onWorksheetModeClick('${facility}', 'electric', ${step.facility_count}, '${mode}', this, ${stepIndex})" title="${isVi ? 'Chế độ điện' : 'Electric mode'}">⚡ ${isVi ? 'Điện' : 'Electric'}</button>`;
        const prismanaButton = `<button type="button" class="mode-pill pill-specialist ${selected('prismana') ? 'active' : ''}" onclick="window.onWorksheetModeClick('${facility}', 'prismana', ${step.facility_count}, '${mode}', this, ${stepIndex})" title="${isVi ? 'Chuyên gia Prismana Lv.4' : 'Prismana Lv.4'}">🌟 Prismana</button>`;
        const manualButton = `<button type="button" class="mode-pill pill-manual ${selected('manual') ? 'active' : ''}" onclick="window.onWorksheetModeClick('${facility}', 'manual', ${step.facility_count}, '${mode}', this, ${stepIndex})" title="${isVi ? 'Thủ công Cấp 3' : 'Manual Lv.3'}">👤 ${isVi ? 'Thường' : 'Manual'}</button>`;
        const modeControls = `<div class="mode-selector-pills" data-fac="${facility}" data-step-index="${stepIndex}">${options.emodeAvailable && supportsEmode ? electricButton : ''}${prismanaButton}${manualButton}</div>`;
        const ownedCount = options.ownedFacilityCounts[facility] || 0;
        const partitionGear = ownedCount > 1 && (supportsEmode || isMine || isWell)
            ? `<button type="button" class="btn-partition-gear" onclick="window.openFacilityPartitionModal('${facility}')" title="${isVi ? 'Phân bổ số lượng theo chế độ (Điện / Prismana / Thường)' : 'Partition facility modes (Electric / Prismana / Manual)'}">⚙️</button>`
            : '';
        let productionDetails = '';
        if (step.item_name && step.cycle_time) {
            const unitsPerSecond = step.units_per_second || (step.facility_count * (step.yield_amount || 1) / step.cycle_time);
            const unitsPerHour = Math.round(unitsPerSecond * 3600);
            const coinsPerHour = Math.round((step.rate_per_second || 0) * 3600);
            productionDetails = `<div class="item-cycle-info"><span class="cycle-time-badge">⏱️ ${step.cycle_time.toFixed(1)}s</span> · <span class="rate-badge">📦 ${unitsPerHour.toLocaleString()}/h</span>${coinsPerHour > 0 ? ` · <span class="coins-badge">💰 ${options.formatNumber(coinsPerHour)}/h</span>` : ''}</div>`;
        }
        return `
            <tr class="status-${step.status}">
                <td data-label="Facility"><div class="facility-cell">${options.renderFacilityIcon(facility)}<span class="facility-name-text">${options.getFacilityDisplayName(facility)}</span>${powerBadge}</div></td>
                <td data-label="Count"><div class="facility-count-box"><span class="count-val">${step.facility_count}</span>${partitionGear}</div></td>
                <td data-label="Mode" class="mode-cell">${modeControls}</td>
                <td data-label="Producing"><div class="item-cell">${step.item_name ? `${options.renderItemIcon(step.item_name)}<span class="item-name-text">${options.prettyItem(step.item_name)}</span>` : '-'}${productionDetails}</div></td>
                <td data-label="Aniimo">${options.aniimoLabel(step)}</td>
                <td data-label="Why">${options.prettyReason(step.reason)}</td>
            </tr>`;
    }).join('');
    return { html, modeUpdates };
}
