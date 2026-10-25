import { getFacilityPartitionCounts, adjustFacilityPartitionCounts } from './emode-policy.js';
import { createFacilityPartitionController } from './emode-controller.js';

export function createFacilityPartitionDialogController({
    document,
    window,
    getPlan,
    getEmodeCounts,
    getOverrides,
    setEmodeCounts,
    setOverrides,
    getOwnedFacilityCounts,
    getSpecialistQuotas,
    selectedHomeLevel,
    getFacilityDisplayName,
    getFacilityLevel,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    calculatePowerWatts,
    actualEmodeCounts,
    updatePowerGauge,
    runFastReSolve,
    getLanguage,
    facilities,
    facilityPowerWatts,
}) {
    let currentPartitionFacility = null;

    const facilityPartitionController = createFacilityPartitionController({
        getEmodeCounts,
        getPlan,
        getOverrides,
        setEmodeCounts,
        setOverrides,
        actualEmodeCounts,
        getGeneratorCapacity,
        getPowerGridRate,
        getTargetEmodeWatts,
        calculatePowerWatts,
        getFacilityLevel,
        closeModal: () => close(),
        setResetButtonVisible: visible => {
            const button = document.getElementById('btn-reset-overrides');
            if (button) button.style.display = visible ? 'inline-flex' : 'none';
        },
        updatePowerGauge,
        runFastReSolve,
        showPowerWarning: ({ projectedWatts, maxWatts }) => {
            const warning = document.getElementById('part-dialog-warning');
            if (warning) {
                warning.textContent = `⚠ Vượt công suất tối đa của lưới điện: cần tổng ${projectedWatts}W (${maxWatts}W tối đa)!`;
                warning.style.display = 'block';
            }
        },
    });

    function open(baseFac) {
        const lastPlan = getPlan();
        if (!lastPlan || !lastPlan.success) return;
        const isVi = getLanguage() === 'vi';
        currentPartitionFacility = baseFac;

        const ownedCounts = getOwnedFacilityCounts();
        const totalOwned = ownedCounts[baseFac] || 1;
        const facDef = facilities.find(f => f.name === baseFac);
        const emodeAvailable = selectedHomeLevel() >= 12;
        const supportsEmode = emodeAvailable && (facDef?.supportsEmode ?? false);
        const wattsPerUnit = supportsEmode ? (facilityPowerWatts[baseFac] || 0) : 0;

        const facilityOverrides = getOverrides();
        const existingOvr = facilityOverrides.find(o => o.facility === baseFac);
        const { electric: curE, prismana: curP, manual: curM } = getFacilityPartitionCounts({
            facility: baseFac,
            plan: lastPlan,
            override: existingOvr,
            emodeCounts: getEmodeCounts(),
            totalOwned,
            specialistQuotas: getSpecialistQuotas(),
        });

        const titleEl = document.getElementById('partition-modal-title');
        if (titleEl) {
            titleEl.innerHTML = `⚙️ ${isVi ? 'Phân bổ cơ sở: ' : 'Partition: '} <span style="color: var(--color-primary-light);">${getFacilityDisplayName(baseFac)}</span>`;
        }
        const subTitleEl = document.getElementById('partition-modal-subtitle');
        if (subTitleEl) {
            subTitleEl.textContent = isVi
                ? `Tổng sở hữu: ${totalOwned} cơ sở. Hãy thiết lập số lượng cụ thể cho từng chế độ vận hành.`
                : `Total owned: ${totalOwned}. Configure the exact count for each operating mode.`;
        }

        const bodyEl = document.getElementById('partition-modal-body');
        if (!bodyEl) return;

        let electricRowHtml = '';
        if (supportsEmode) {
            electricRowHtml = `
            <div class="partition-ctrl-row">
                <div class="partition-ctrl-label">
                    <span class="ctrl-icon">⚡</span>
                    <div>
                        <div class="ctrl-title">${isVi ? 'Chế độ điện' : 'Electric Mode'}</div>
                        <div class="ctrl-desc">${wattsPerUnit}W / ${isVi ? 'cơ sở' : 'unit'} &bull; ${isVi ? 'Tự động hóa' : 'Automated'}</div>
                    </div>
                </div>
                <div class="partition-stepper">
                    <button type="button" class="part-btn" onclick="window.stepPartition('electric', -1)" aria-label="Decrease Electric">−</button>
                    <input type="text" inputmode="numeric" id="part-val-electric" class="part-input" value="${curE}" readonly>
                    <button type="button" class="part-btn" onclick="window.stepPartition('electric', 1)" aria-label="Increase Electric">+</button>
                </div>
            </div>
        `;
        }

        const prismanaRowHtml = `
        <div class="partition-ctrl-row">
            <div class="partition-ctrl-label">
                <span class="ctrl-icon">🌟</span>
                <div>
                    <div class="ctrl-title">${isVi ? 'Chuyên gia Prismana' : 'Prismana Specialist'}</div>
                    <div class="ctrl-desc">${isVi ? 'Cấp 4 + Tính cách tối ưu (0W, tốc độ cao nhất)' : 'Level 4 + Personality (0W, fastest)'}</div>
                </div>
            </div>
            <div class="partition-stepper">
                <button type="button" class="part-btn" onclick="window.stepPartition('prismana', -1)" aria-label="Decrease Prismana">−</button>
                <input type="text" inputmode="numeric" id="part-val-prismana" class="part-input" value="${curP}" readonly>
                <button type="button" class="part-btn" onclick="window.stepPartition('prismana', 1)" aria-label="Increase Prismana">+</button>
            </div>
        </div>
    `;

        const manualRowHtml = `
        <div class="partition-ctrl-row">
            <div class="partition-ctrl-label">
                <span class="ctrl-icon">👤</span>
                <div>
                    <div class="ctrl-title">${isVi ? 'Thủ công thường' : 'Standard Manual'}</div>
                    <div class="ctrl-desc">${isVi ? 'Aniimo Cấp 3 (0W)' : 'Level 3 Aniimo (0W)'}</div>
                </div>
            </div>
            <div class="partition-stepper">
                <button type="button" class="part-btn" onclick="window.stepPartition('manual', -1)" aria-label="Decrease Manual">−</button>
                <input type="text" inputmode="numeric" id="part-val-manual" class="part-input" value="${curM}" readonly>
                <button type="button" class="part-btn" onclick="window.stepPartition('manual', 1)" aria-label="Increase Manual">+</button>
            </div>
        </div>
    `;

        bodyEl.innerHTML = `
        <div class="partition-dialog-container" data-total-owned="${totalOwned}">
            ${electricRowHtml}
            ${prismanaRowHtml}
            ${manualRowHtml}
            <div class="partition-summary-bar">
                <div class="summary-item">
                    <span>${isVi ? 'Đã phân bổ:' : 'Allocated:'}</span>
                    <strong id="part-summary-total">${curE + curP + curM}</strong> / ${totalOwned}
                </div>
                ${supportsEmode ? `
                <div class="summary-item">
                    <span>${isVi ? 'Công suất cơ sở:' : 'Facility Power:'}</span>
                    <strong id="part-summary-watts">${curE * wattsPerUnit}W</strong>
                </div>` : ''}
            </div>
            <div id="part-dialog-warning" class="part-dialog-warning" style="display: none;"></div>
        </div>
    `;

        const modal = document.getElementById('facilityPartitionModal');
        if (modal) modal.classList.add('show');
    }

    function step(type, delta) {
        if (!currentPartitionFacility) return;
        const container = document.querySelector('.partition-dialog-container');
        if (!container) return;
        const totalOwned = parseInt(container.dataset.totalOwned, 10) || 1;

        const elE = document.getElementById('part-val-electric');
        const elP = document.getElementById('part-val-prismana');
        const elM = document.getElementById('part-val-manual');

        const facDef = facilities.find(f => f.name === currentPartitionFacility);
        const supportsElectric = selectedHomeLevel() >= 12 && (facDef?.supportsEmode ?? false);
        const adjusted = adjustFacilityPartitionCounts({
            counts: {
                electric: elE ? parseInt(elE.value, 10) || 0 : 0,
                prismana: elP ? parseInt(elP.value, 10) || 0 : 0,
                manual: elM ? parseInt(elM.value, 10) || 0 : 0,
            },
            totalOwned,
            type,
            delta,
            supportsElectric,
        });
        const { electric: curE, prismana: curP, manual: curM } = adjusted;

        if (elE) elE.value = curE;
        if (elP) elP.value = curP;
        if (elM) elM.value = curM;

        const sumEl = document.getElementById('part-summary-total');
        if (sumEl) sumEl.textContent = curE + curP + curM;

        const wattsPerUnit = supportsElectric ? (facilityPowerWatts[currentPartitionFacility] || 0) : 0;
        const wattsEl = document.getElementById('part-summary-watts');
        if (wattsEl) wattsEl.textContent = `${curE * wattsPerUnit}W`;
    }

    async function apply() {
        if (!currentPartitionFacility) return;
        const readCount = id => parseInt(document.getElementById(id)?.value, 10) || 0;
        return facilityPartitionController.apply({
            facility: currentPartitionFacility,
            electric: readCount('part-val-electric'),
            prismana: readCount('part-val-prismana'),
            manual: readCount('part-val-manual'),
        });
    }

    function close() {
        const modal = document.getElementById('facilityPartitionModal');
        if (modal) modal.classList.remove('show');
        currentPartitionFacility = null;
    }

    function closeOnBackdrop(event) {
        if (event?.target?.id === 'facilityPartitionModal') {
            close();
        }
    }

    function attachGlobal() {
        if (window) {
            window.openFacilityPartitionModal = open;
            window.stepPartition = step;
            window.applyFacilityPartition = apply;
            window.closeFacilityPartitionModal = close;
            window.closeFacilityPartitionOnBackdrop = closeOnBackdrop;
        }
    }

    return {
        open,
        step,
        apply,
        close,
        closeOnBackdrop,
        attachGlobal,
        get currentPartitionFacility() { return currentPartitionFacility; },
        facilityPartitionController,
    };
}
