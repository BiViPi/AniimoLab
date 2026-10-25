import {
    ANIIMO_MAX,
} from './facility-config.js';
import { ANIIMO_RESIDENT_FACILITIES, buildAniimoResidentMembers } from './aniimo-resident-crew.js';
import { buildAniimoWorkGroups, assignAniimoGroups } from './aniimo-standard-assignment.js';
import { resolveAniimoCrewStepMode } from './aniimo-mode.js';
import { buildAniimoFarmingCrew } from './aniimo-farming-crew.js';
import { buildAniimoExtractionMembers } from './aniimo-extraction-crew.js';
import { buildAniimoEnvironmentMembers } from './aniimo-environment-crew.js';
import { buildAniimoProcessingMembers } from './aniimo-processing-crew.js';
import { buildAniimoCraftingMembers } from './aniimo-crafting-crew.js';
import {
    mergeAniimoSummaryMembers,
    renderAniimoAbilityStrip,
    renderAniimoEmptySummaryRow,
    renderAniimoSummaryMemberRow,
} from './aniimo-summary-roster-renderer.js';
import { renderAniimoStandardSummary } from './aniimo-standard-summary-renderer.js';

export function createAniimoSummaryController({
    document,
    window,
    abilities,
    facilities,
    environmentBuildingAbility,
    abilityThemes,
    renderRosterWorkerBadge,
    renderRosterSummary,
    selectedSetupTab,
    selectedHomeLevel,
    selectedAniimoSetup,
    isSimpleMode,
    getProductionAniimoCap,
    getPowerPoleCount,
    getPowerProfile,
    calculatePowerWatts,
    getLastEmodeCounts,
    getFacilityOverrides,
    getFacilityDisplayName,
    prettyItem,
    getFacilitySpecificWorker,
    taskLabel,
    opposedPersonality,
    setLastBestTeam,
    getLanguage,
}) {
    let isRosterDetailsExpanded = false;

    function toggleDetails() {
        isRosterDetailsExpanded = !isRosterDetailsExpanded;
        const wrapper = document.getElementById('roster-details-wrapper');
        const icon = document.getElementById('roster-toggle-icon');
        const text = document.getElementById('roster-toggle-text');
        const isVi = getLanguage() === 'vi';
        if (wrapper) {
            wrapper.style.display = isRosterDetailsExpanded ? 'block' : 'none';
        }
        if (icon) {
            icon.textContent = isRosterDetailsExpanded ? '▼' : '▶';
        }
        if (text) {
            text.textContent = isVi
                ? (isRosterDetailsExpanded
                    ? '▲ Thu gọn danh sách chi tiết các nhóm công nhân'
                    : '👉 Bấm vào để hiện đầy đủ thông tin các nhóm công nhân ▼')
                : (isRosterDetailsExpanded
                    ? '▲ Collapse worker group details'
                    : '👉 Click here to show full worker details for all groups ▼');
        }
    }

    function render(plan, options = {}) {
        const isCustom = options.tab === 'custom' || (typeof selectedSetupTab === 'function' && selectedSetupTab() === 'custom');
        if (isCustom) {
            return renderRosterSummary(plan, options);
        }
        const container = document.getElementById('aniimo-summary');
        if (!container) return;

        const groups = buildAniimoWorkGroups(plan, {
            facilities,
            environmentBuildingAbility,
            getFacilitySpecificWorker,
            taskLabel,
            prettyItem,
        });
        const { kept } = assignAniimoGroups(groups, opposedPersonality);
        if (selectedSetupTab() === 'best' && typeof setLastBestTeam === 'function') {
            setLastBestTeam(kept);
        }

        const homeLevel = selectedHomeLevel();
        const isVi = getLanguage() === 'vi';
        const emodeAvailable = homeLevel >= 12;

        const resolveStepMode = (step, baseFacility) => resolveAniimoCrewStepMode({
            step,
            baseFacility,
            emodeAvailable,
            overrides: getFacilityOverrides() || [],
        });

        // 1. Nhóm 1: Đồng áng (Farming Crew)
        let totalFarmland = 0;
        let totalWoodland = 0;
        (plan.coin_items || []).forEach(step => {
            const rawFac = step.facility || '';
            const baseFac = rawFac.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');
            const count = step.facility_count || 0;
            if (baseFac === 'Farmland') totalFarmland += count;
            if (baseFac === 'Woodland') totalWoodland += count;
        });
        const totalFarmPlots = totalFarmland + totalWoodland;

        const farmingCrew = buildAniimoFarmingCrew(totalFarmPlots, isVi);
        const farmingMembers = farmingCrew.members;
        const farmingPhysicalWorkers = farmingCrew.physicalWorkers;
        const farmTotal = farmingCrew.total;

        // 2. Nhóm 2: Trông Cơ Sở 24/24 & Khai Thác Thô (`stationaryMembers`)
        const stationaryMembers = [];

        // 2.1. Trực trụ điện (tính động theo tổng phụ tải điện)
        const profile = typeof getPowerProfile === 'function' ? getPowerProfile(homeLevel) : { capacity: 0 };
        const provTag = profile.status === 'provisional' ? (isVi ? ' - Tạm thời' : ' - Provisional') : '';
        const totalActiveWatts = calculatePowerWatts(getLastEmodeCounts() || {});
        let effectiveGuardCount = 0;
        if (totalActiveWatts > 0) {
            effectiveGuardCount = typeof plan.guards === 'number' && plan.guards > 0
                ? plan.guards
                : (plan.guard_staffing ? plan.guard_staffing.reduce((sum, [, v]) => sum + v, 0) : getPowerPoleCount(homeLevel));
        }
        if (effectiveGuardCount > 0) {
            const currentAniimoSetup = typeof selectedAniimoSetup === 'function' ? selectedAniimoSetup() : 'best';
            const isPrismana = (currentAniimoSetup === 'specialist' || currentAniimoSetup === 'best');
            const guardWorker = isPrismana ? 'Luminelle' : 'Blazen';
            stationaryMembers.push({
                facility: isVi ? `Trực trụ điện (Lưới ${profile.capacity}W${provTag})` : `Power Pole Guard (${profile.capacity}W Grid${provTag})`,
                worker: guardWorker,
                count: effectiveGuardCount,
                ability: 'Lightning',
                level: isPrismana ? 4 : 3,
                desc: isVi ? `Trực lưới điện 24/7 (Phụ tải ${totalActiveWatts}W)` : `Maintains 24/7 grid (${totalActiveWatts}W load)`,
                specific: guardWorker
            });
        }

        // 2.2. Khu Mỏ & Giếng Nước (đếm chính xác 1:1 theo từng cơ sở thủ công)
        const extractionCrew = buildAniimoExtractionMembers(plan, {
            isVi,
            getFacilityDisplayName,
            prettyItem,
            resolveStepMode
        });
        stationaryMembers.push(...extractionCrew.members);

        // 2.3. Cơ sở thú cưng cố định (Resident Facilities)
        const residentCrew = buildAniimoResidentMembers(plan, {
            facilities,
            getFacilitySpecificWorker,
            getFacilityDisplayName,
            prettyItem,
            isVi
        });
        stationaryMembers.push(...residentCrew.members);

        // 2.4. Thiết bị điều hòa khí hậu & chiếu sáng
        const environmentCrew = buildAniimoEnvironmentMembers(plan, { isVi, getFacilityDisplayName });
        stationaryMembers.push(...environmentCrew.members);
        const statTotal = stationaryMembers.reduce((sum, m) => sum + m.count, 0);

        // 3. Nhóm 3: Gia Công Gỗ & Quặng (`processingMembers`)
        const processingCrew = buildAniimoProcessingMembers(plan, {
            isVi,
            getFacilityDisplayName,
            resolveStepMode
        });
        const processingMembers = processingCrew.members;
        const procTotal = processingCrew.total;

        // 4. Nhóm 4: Sản Xuất & Chế Biến Thành Phẩm (craftingMembers)
        const craftingCrew = buildAniimoCraftingMembers(plan, {
            facilities,
            residentFacilities: ANIIMO_RESIDENT_FACILITIES,
            getFacilityDisplayName,
            prettyItem,
            resolveStepMode,
            isVi
        });
        const craftingMembers = craftingCrew.members;
        const craftTotal = craftingCrew.total;

        // Tổng số công nhân đảo:
        const finalTotal = farmTotal + statTotal + procTotal + craftTotal;

        const homelandHolds = isSimpleMode() ? ANIIMO_MAX[selectedHomeLevel() - 1] : null;
        const prodCap = isSimpleMode() ? getProductionAniimoCap() : null;
        const cap = prodCap || homelandHolds;

        const capNote = cap && finalTotal > cap
            ? `<p class="hint small">${isVi
                ? `Cần ${finalTotal} Aniimo, vượt quá giới hạn ${cap} của Vùng Sản Xuất (Homeland chứa tối đa ${homelandHolds}).`
                : `That's ${finalTotal} Aniimo, more than the production zone cap of ${cap} (Homeland holds ${homelandHolds}).`}</p>`
            : '';
        const have = document.getElementById('aniimo-count-have');
        const of = document.getElementById('aniimo-count-of');
        const count = document.getElementById('aniimo-count');
        if (have && of && count) {
            have.textContent = finalTotal;
            of.textContent = cap ?? '';
            of.hidden = !cap;
            count.hidden = false;
            count.classList.toggle('over', !!cap && finalTotal > cap);
            count.title = cap
                ? (isVi
                    ? `${finalTotal} Aniimo cho kế hoạch này (Đồng áng: ${farmTotal} | Trông cơ sở: ${statTotal} | Gia công: ${procTotal} | Chế biến: ${craftTotal}); giới hạn Vùng Sản Xuất: ${cap} (tổng Homeland: ${homelandHolds})`
                    : `${finalTotal} Aniimo for this plan (Farm: ${farmTotal} | Stat: ${statTotal} | Proc: ${procTotal} | Craft: ${craftTotal}); production zone cap is ${cap} (Homeland holds ${homelandHolds})`)
                : `${finalTotal} Aniimo for this plan`;
        }
        const collapsedSummary = document.getElementById('aniimo-collapsed-summary');
        if (collapsedSummary) collapsedSummary.textContent = '';

        // Cập nhật dải kỹ năng 12 hệ phía trên dựa trên cá thể vật lý thực tế
        const physicalMembers = [...farmingPhysicalWorkers, ...stationaryMembers, ...processingMembers, ...craftingMembers];
        const abilitiesEl = document.getElementById('aniimo-abilities');
        if (abilitiesEl) {
            abilitiesEl.innerHTML = renderAniimoAbilityStrip({
                abilities: abilities || [],
                members: physicalMembers,
                isVi,
                viAbilities: (window && window.VI_ABILITIES) || {},
                renderBadge: renderRosterWorkerBadge
            });
        }

        // Render bảng phân 4 nhóm theo đúng 3 cột chuẩn
        const renderMemberRow3Col = member => renderAniimoSummaryMemberRow(member, {
            isVi,
            abilityThemes: abilityThemes || {},
            viAbilities: (window && window.VI_ABILITIES) || {},
            renderBadge: renderRosterWorkerBadge
        });
        const emptyRowHtml = renderAniimoEmptySummaryRow;
        const mergeDuplicateMembers = mergeAniimoSummaryMembers;

        const farmingRowsHtml = farmingMembers.length > 0
            ? mergeDuplicateMembers(farmingMembers).map(renderMemberRow3Col).join('')
            : emptyRowHtml(isVi ? 'Không có đất nông nghiệp và rừng cây cần vận hành.' : 'No active farm plots in this plan.');

        const statRowsHtml = stationaryMembers.length > 0
            ? mergeDuplicateMembers(stationaryMembers).map(renderMemberRow3Col).join('')
            : emptyRowHtml(isVi ? 'Không có cơ sở đứng máy cố định 24/7 (mỏ/giếng chạy điện hoặc không có).' : 'No stationary or gathering units running manually.');

        const procRowsHtml = processingMembers.length > 0
            ? mergeDuplicateMembers(processingMembers).map(renderMemberRow3Col).join('')
            : emptyRowHtml(isVi ? 'Không có bàn mộc hoặc lò nung thủ công (chạy điện hoặc không dùng).' : 'No woodworking or kilns running manually.');

        const craftRowsHtml = craftingMembers.length > 0
            ? mergeDuplicateMembers(craftingMembers).map(renderMemberRow3Col).join('')
            : emptyRowHtml(isVi ? 'Không có cơ sở chế biến chạy thủ công (chạy điện hoặc không dùng).' : 'No crafting units running manually.');

        container.innerHTML = renderAniimoStandardSummary({
            isVi,
            detailsExpanded: isRosterDetailsExpanded,
            farmTotal,
            totalFarmPlots,
            statTotal,
            effectiveGuardCount,
            procTotal,
            craftTotal,
            farmingRowsHtml,
            statRowsHtml,
            procRowsHtml,
            craftRowsHtml,
            capNote
        });
    }

    function attachGlobal() {
        if (window) {
            window.toggleRosterDetails = toggleDetails;
        }
    }

    return {
        render,
        toggleDetails,
        attachGlobal,
        get isDetailsExpanded() { return isRosterDetailsExpanded; }
    };
}
