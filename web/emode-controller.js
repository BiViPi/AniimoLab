import { allocateConfiguredEmodeFacilities, getWorksheetStepMode, setWorksheetStepMode } from './emode-policy.js?v=aniimolab_v64';
import { updateStepTimingAndCapacity } from './step-timing.js?v=aniimolab_v125';

export function createEmodeSettingsController(deps) {
    const document = deps.document;

    function updateSimpleEmodeState() {
        const homeLevel = deps.getHomeLevel();
        const emodeSection = document.getElementById('emode-simple-section');
        const navPill = document.querySelector('.nav-pill.pill-emode');
        const hint = document.getElementById('emode-simple-hint');
        const toggle = document.getElementById('emode-simple-on');
        const rateField = document.getElementById('emode-simple-rate-field');
        const genField = document.getElementById('emode-simple-generator-field');
        const gauge = document.getElementById('simple-power-gauge-container');

        if (navPill) navPill.style.display = homeLevel < 12 ? 'none' : '';
        const defaultWatts = deps.getDefaultGeneratorWatts(homeLevel);
        const simpleGen = document.getElementById('simple-generator-capacity');
        const genSelect = document.getElementById('generator-capacity');
        if (simpleGen) simpleGen.value = String(defaultWatts);
        if (genSelect) genSelect.value = String(defaultWatts);

        if (homeLevel < 12) {
            if (emodeSection) emodeSection.style.display = 'none';
            if (toggle) toggle.disabled = true;
            if (rateField) rateField.style.opacity = '0.5';
            if (genField) genField.style.opacity = '0.5';
            if (gauge) gauge.style.opacity = '0.5';
            if (hint) { hint.style.display = 'none'; hint.innerHTML = ''; }
            deps.setEmodeCounts({});
            deps.setFacilityOverrides((deps.getFacilityOverrides() || []).filter(override => !override.electric_count || override.electric_count === 0));
        } else {
            if (emodeSection) emodeSection.style.display = '';
            if (toggle) toggle.disabled = false;
            if (rateField) rateField.style.opacity = '1';
            if (genField) genField.style.opacity = '1';
            if (gauge) gauge.style.opacity = '1';
            if (hint) { hint.style.display = 'none'; hint.innerHTML = ''; }
        }
        deps.updatePowerGauge();
    }

    function attachEmodeHandlers() {
        const grid = document.getElementById('facilities-grid');
        if (grid) {
            grid.addEventListener('change', event => {
                if (!event.target.classList.contains('facility-emode-checkbox')) return;
                const facility = event.target.dataset.facility;
                if (event.target.checked) deps.emodeFacilities.add(facility);
                else deps.emodeFacilities.delete(facility);
                deps.updatePowerGauge();
                deps.saveInputsToStorage();
            });
        }

        const autoButton = document.getElementById('emode-auto-btn');
        if (autoButton) autoButton.addEventListener('click', () => {
            deps.emodeFacilities.clear();
            const facilityTiers = typeof deps.getFacilityTiers === 'function' ? deps.getFacilityTiers() : deps.facilityTiers;
            const selected = allocateConfiguredEmodeFacilities({
                facilities: deps.facilities,
                priority: deps.priority,
                facilityTiers,
                facilityPowerWatts: deps.facilityPowerWatts,
                maxWatts: deps.getTargetEmodeWatts(),
            });
            selected.forEach(name => deps.emodeFacilities.add(name));
            document.querySelectorAll('.facility-emode-checkbox').forEach(checkbox => {
                checkbox.checked = deps.emodeFacilities.has(checkbox.dataset.facility);
            });
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });

        const allButton = document.getElementById('emode-all-btn');
        if (allButton) allButton.addEventListener('click', () => {
            deps.facilities.filter(facility => facility.supportsEmode).forEach(facility => deps.emodeFacilities.add(facility.name));
            document.querySelectorAll('.facility-emode-checkbox').forEach(checkbox => { checkbox.checked = true; });
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });

        const noneButton = document.getElementById('emode-none-btn');
        if (noneButton) noneButton.addEventListener('click', () => {
            deps.emodeFacilities.clear();
            document.querySelectorAll('.facility-emode-checkbox').forEach(checkbox => { checkbox.checked = false; });
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });

        const rateSelect = document.getElementById('power-grid-rate');
        const simpleRate = document.getElementById('simple-power-grid-rate');
        if (rateSelect) rateSelect.addEventListener('change', () => {
            if (simpleRate) simpleRate.value = rateSelect.value;
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });
        if (simpleRate) simpleRate.addEventListener('change', () => {
            if (rateSelect) rateSelect.value = simpleRate.value;
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });

        const generatorSelect = document.getElementById('generator-capacity');
        const simpleGenerator = document.getElementById('simple-generator-capacity');
        if (generatorSelect) generatorSelect.addEventListener('change', () => {
            if (simpleGenerator) simpleGenerator.value = generatorSelect.value;
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });
        if (simpleGenerator) simpleGenerator.addEventListener('change', () => {
            if (generatorSelect) generatorSelect.value = simpleGenerator.value;
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });

        const simpleToggle = document.getElementById('emode-simple-on');
        if (simpleToggle) simpleToggle.addEventListener('change', () => {
            deps.updatePowerGauge();
            deps.saveInputsToStorage();
        });
        const homeSelect = document.getElementById('home-level');
        if (homeSelect) homeSelect.addEventListener('change', updateSimpleEmodeState);
    }

    function getSpecialistQuotas() {
        const earth = document.getElementById('quota-earth-4p');
        const water = document.getElementById('quota-water-4f');
        return {
            earth_4p_mines: earth ? Math.max(0, parseInt(earth.value, 10) || 0) : 3,
            water_4f_wells: water ? Math.max(0, parseInt(water.value, 10) || 0) : 0,
        };
    }

    function getActiveEmodeFacilityCounts(activeProducingCounts = null) {
        const currentCounts = deps.getEmodeCounts() || {};
        if (Object.keys(currentCounts).length > 0) return currentCounts;
        const homeLevel = deps.getHomeLevel();
        const emodeOn = document.getElementById('emode-simple-on')?.checked ?? true;
        if (!emodeOn || homeLevel < 12) return {};
        return deps.autoAllocateEmode(homeLevel, deps.getTargetEmodeWatts(), activeProducingCounts);
    }

    function getActiveEmodeFacilities(activeProducingCounts = null) {
        return Object.keys(getActiveEmodeFacilityCounts(activeProducingCounts));
    }

    function updateSpecialistQuotasLimits(homeLevel = deps.getHomeLevel()) {
        const { facilities } = deps.getSimpleSetup(homeLevel);
        const definitions = [
            { facility: 'Mine', inputId: 'quota-earth-4p', step: 'earth_4p' },
            { facility: 'Well', inputId: 'quota-water-4f', step: 'water_4f' },
        ];
        for (const definition of definitions) {
            const max = facilities[definition.facility]?.[0]?.count || 0;
            const input = document.getElementById(definition.inputId);
            if (input) {
                input.max = String(max);
                const current = parseInt(input.value, 10) || 0;
                if (current > max) input.value = String(max);
                input.disabled = max === 0;
            }
            document.querySelectorAll(`.stepper-btn[data-step-specialist="${definition.step}"]`)
                .forEach(button => { button.disabled = max === 0; });
        }
    }

    function attachSpecialistQuotaHandlers() {
        document.querySelectorAll('.stepper-btn[data-step-specialist]').forEach(button => {
            button.addEventListener('click', () => {
                const key = button.dataset.stepSpecialist;
                const inputId = key === 'earth_4p' ? 'quota-earth-4p' : 'quota-water-4f';
                const input = document.getElementById(inputId);
                if (!input || input.disabled) return;
                const min = parseInt(input.min, 10) || 0;
                const max = parseInt(input.max, 10) || 8;
                const direction = parseInt(button.dataset.stepDir, 10) || 0;
                input.value = Math.max(min, Math.min(max, (parseInt(input.value, 10) || 0) + direction));
                deps.saveInputsToStorage();
            });
        });
        ['quota-earth-4p', 'quota-water-4f'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => {
                const input = document.getElementById(id);
                if (!input || input.disabled) return;
                const min = parseInt(input.min, 10) || 0;
                const max = parseInt(input.max, 10) || 8;
                input.value = Math.max(min, Math.min(max, parseInt(input.value, 10) || 0));
                deps.saveInputsToStorage();
            });
        });
    }

    return {
        attachEmodeHandlers,
        updateSimpleEmodeState,
        getSpecialistQuotas,
        updateSpecialistQuotasLimits,
        attachSpecialistQuotaHandlers,
        getActiveEmodeFacilityCounts,
        getActiveEmodeFacilities,
    };
}

export function createPowerGaugeController({ document, facilityPowerWatts, getGeneratorCapacity, getTargetEmodeWatts, calculatePowerWatts }) {
    function getPowerGridRate() {
        const element = document.getElementById('simple-power-grid-rate');
        const value = element ? parseFloat(element.value) : 100;
        return value >= 115 ? 1.2 : 1.0;
    }

    function updatePowerGauge(customCounts = null, defaultCounts = {}) {
        const maxWatts = getGeneratorCapacity();
        const rate = getPowerGridRate();
        const targetWatts = getTargetEmodeWatts(maxWatts, rate);
        const counts = customCounts !== null ? customCounts : defaultCounts;
        const totalWatts = calculatePowerWatts(counts);
        const pct = Math.min(100, Math.round((totalWatts / maxWatts) * 100));

        const simpleVal = document.getElementById('simple-power-gauge-value');
        const simpleFill = document.getElementById('simple-power-gauge-fill');
        if (simpleVal && simpleFill) {
            const targetLabel = rate >= 1.15 ? ` (120% cap: ${targetWatts}W)` : '';
            simpleVal.textContent = `${totalWatts}W / ${maxWatts}W (${pct}%)${targetLabel}`;
            simpleFill.style.width = `${Math.min(100, (totalWatts / maxWatts) * 100)}%`;
            simpleFill.classList.toggle('overload', totalWatts > targetWatts);
        }

        const breakdown = document.getElementById('power-breakdown');
        if (breakdown) {
            const rows = Object.entries(counts || {})
                .filter(([name, count]) => count > 0 && facilityPowerWatts[name])
                .map(([name, count]) => ({ name, count, watts: facilityPowerWatts[name] }))
                .sort((a, b) => b.count * b.watts - a.count * a.watts);
            breakdown.innerHTML = rows.length === 0 ? '' : rows.map(row =>
                `<div class="power-breakdown-row"><span>${row.name}</span><span>${row.count} × ${row.watts}W</span><strong>${row.count * row.watts}W</strong></div>`
            ).join('') + `<div class="power-breakdown-row power-breakdown-total"><span>${rows.map(row => row.count * row.watts).join(' + ')}</span><span></span><strong>= ${totalWatts}W</strong></div>`;
        }
        return { counts, totalWatts, maxWatts, targetWatts, percent: pct, overloaded: totalWatts > targetWatts };
    }

    return { getPowerGridRate, updatePowerGauge };
}

export function createFacilityPartitionController(deps) {
    async function apply({ facility, electric, prismana, manual }) {
        const capacity = deps.getGeneratorCapacity();
        const maxWatts = deps.getTargetEmodeWatts(capacity, deps.getPowerGridRate());
        const existingCounts = deps.getEmodeCounts() || {};
        const currentCounts = {
            ...(Object.keys(existingCounts).length > 0 ? existingCounts : deps.actualEmodeCounts(deps.getPlan())),
            [facility]: electric,
        };
        const projectedWatts = deps.calculatePowerWatts(currentCounts);
        if (projectedWatts > maxWatts) {
            deps.showPowerWarning({ facility, projectedWatts, maxWatts });
            return { accepted: false, projectedWatts, maxWatts };
        }

        deps.setEmodeCounts(currentCounts);
        const nextOverride = {
            facility,
            level: deps.getFacilityLevel(facility),
            electric_count: electric,
            specialist_count: prismana,
            manual_count: manual,
        };
        const overrides = [...(deps.getOverrides() || [])];
        const index = overrides.findIndex(item => item.facility === facility);
        if (index >= 0) overrides[index] = nextOverride;
        else overrides.push(nextOverride);
        deps.setOverrides(overrides);

        deps.closeModal();
        deps.setResetButtonVisible(true);
        deps.updatePowerGauge(currentCounts);
        const solveSucceeded = await deps.runFastReSolve();
        return { accepted: true, solveSucceeded, counts: currentCounts, overrides };
    }

    return { apply };
}

export function worksheetFixedPlanLines(plan) {
    return (plan?.coin_items || [])
        .filter(step => step.status === 'producing' && step.item_name && (step.facility_count || 0) > 0)
        .map(step => ({
            facility: (step.facility || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim(),
            item_name: step.item_name.replace(/__(manual|specialist)$/, ''),
            mode: getWorksheetStepMode(step),
            facility_count: step.facility_count,
            crew: Number.isInteger(step.crew) ? step.crew : null
        }));
}

export function worksheetOverridesFromLines(lines, { facilities, residentFacilities, getFacilityLevel }) {
    const byFacility = new Map();
    for (const line of lines) {
        let counts = byFacility.get(line.facility);
        if (!counts) {
            counts = { electric_count: 0, specialist_count: 0, manual_count: 0 };
            byFacility.set(line.facility, counts);
        }
        const facility = facilities.find(item => item.name === line.facility);
        if (line.mode === 'electric') counts.electric_count += line.facility_count;
        else if (line.mode === 'prismana' && (line.facility === 'Mine' || line.facility === 'Well' || residentFacilities.has(line.facility) || facility?.hasWorker)) {
            counts.specialist_count += line.facility_count;
        } else if (line.mode === 'manual' && (residentFacilities.has(line.facility) || facility?.hasWorker)) {
            counts.manual_count += line.facility_count;
        }
    }
    return [...byFacility.entries()]
        .filter(([name]) => {
            const facility = facilities.find(item => item.name === name);
            return name === 'Mine' || name === 'Well' || facility?.hasWorker || residentFacilities.has(name);
        })
        .map(([facility, counts]) => ({
            facility,
            level: getFacilityLevel(facility),
            target_mode: counts.electric_count > 0 ? 'electric' : (counts.specialist_count > 0 ? 'prismana' : 'manual'),
            ...counts
        }));
}

export function createWorksheetModeController(deps) {
    async function onWorksheetModeClick(facility, requestedMode, _stepCount, currentModeParam, clickedBtn, stepIndex, targetItemName) {
        const currentPlan = deps.getPlan();
        if (!currentPlan || !currentPlan.success) return;
        let targetMode = requestedMode === 'specialist' ? 'prismana' : requestedMode;
        if (!['electric', 'prismana', 'manual'].includes(targetMode)) return;
        if (targetMode === 'electric' && deps.getHomeLevel() < 12) return;

        const baseFac = (facility || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();
        const maxWatts = deps.getTargetEmodeWatts(deps.getGeneratorCapacity(), deps.getPowerGridRate());

        const originalPlan = JSON.parse(JSON.stringify(currentPlan));
        const steps = currentPlan.coin_items || [];
        let step = (typeof stepIndex === 'number' && stepIndex >= 0 && stepIndex < steps.length)
            ? steps[stepIndex]
            : null;

        const cleanTargetItem = (targetItemName || '').replace(/__(specialist|manual)$/, '');
        const matchesTargetStep = candidate => {
            if (!candidate || candidate.status !== 'producing') return false;
            const fac = (candidate.facility || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();
            if (fac !== baseFac) return false;
            if (cleanTargetItem) {
                const cleanCandidateItem = (candidate.item_name || '').replace(/__(specialist|manual)$/, '');
                if (cleanCandidateItem !== cleanTargetItem) return false;
            }
            return true;
        };

        if (!matchesTargetStep(step)) {
            step = steps.find(item =>
                matchesTargetStep(item) &&
                (!currentModeParam || getWorksheetStepMode(item) === currentModeParam)
            ) || steps.find(item => matchesTargetStep(item)) || null;
        }

        if (!step) {
            if (typeof deps.logError === 'function') {
                deps.logError('Cannot find target worksheet step for mode update:', {
                    facility,
                    baseFac,
                    requestedMode,
                    currentModeParam,
                    stepIndex,
                    targetItemName
                });
            }
            return;
        }

        const prevMode = getWorksheetStepMode(step);

        Object.assign(step, setWorksheetStepMode(step, targetMode));

        const fixedLines = worksheetFixedPlanLines(currentPlan);

        const quotas = deps.getSpecialistQuotas() || {};
        const lockedSpecialists = fixedLines.filter(line => line.facility === baseFac && line.mode === 'prismana')
            .reduce((sum, line) => sum + line.facility_count, 0);
        const requiredSpecialists = baseFac === 'Mine' ? (quotas.earth_4p_mines || 0)
            : (baseFac === 'Well' ? (quotas.water_4f_wells || 0) : 0);
        if (lockedSpecialists < requiredSpecialists) {
            deps.setPlan(originalPlan);
            deps.setButtonMode(clickedBtn, prevMode);
            deps.showInvariantWarning(baseFac, `Không thể giảm quota Prismana đã chọn: cần giữ ${requiredSpecialists} máy, hiện chỉ còn ${lockedSpecialists}.`);
            return;
        }

        const projectedCounts = {};
        for (const line of fixedLines) {
            if (line.mode === 'electric') projectedCounts[line.facility] = (projectedCounts[line.facility] || 0) + line.facility_count;
        }
        const projectedWatts = deps.calculatePowerWatts(projectedCounts);
        if (targetMode === 'electric' && projectedWatts > maxWatts) {
            deps.setPlan(originalPlan);
            deps.setButtonMode(clickedBtn, prevMode);
            const message = deps.isVietnamese && deps.isVietnamese()
                ? `Thao tác này đã vượt quá công suất cho phép của lưới điện! Cần tổng ${projectedWatts}W nhưng giới hạn an toàn hiện tại là ${maxWatts}W.`
                : `This action exceeds the allowed power grid capacity! Required ${projectedWatts}W but safe limit is ${maxWatts}W.`;
            if (typeof deps.alert === 'function') deps.alert(message);
            if (typeof deps.showInvariantWarning === 'function') deps.showInvariantWarning(baseFac, message);
            return;
        }

        deps.setEmodeCounts(projectedCounts);
        deps.updatePowerGauge(projectedCounts);
        deps.setOverrides(worksheetOverridesFromLines(fixedLines, {
            facilities: deps.facilities,
            residentFacilities: deps.residentFacilities,
            getFacilityLevel: deps.getFacilityLevel
        }));
        deps.setResetButtonVisible(true);

        try {
            updateStepTimingAndCapacity(step, targetMode, {
                recipeMap: deps.getRecipeMap?.() || (typeof window !== 'undefined' ? window.ALL_RECIPES_MAP : null),
                powerGridRate: deps.getPowerGridRate ? deps.getPowerGridRate() : 1.2,
                homeLevel: deps.getHomeLevel ? deps.getHomeLevel() : 20,
            });
            deps.setPlan(currentPlan);
            deps.setButtonMode(clickedBtn, targetMode);
        } catch (error) {
            deps.setPlan(originalPlan);
            deps.setButtonMode(clickedBtn, prevMode);
            if (typeof deps.logError === 'function') {
                deps.logError('In-place worksheet update failed:', error);
            }
            return;
        }

        try {
            deps.showSelectedPlan();
        } catch (renderError) {
            if (typeof deps.logError === 'function') {
                deps.logError('Secondary view render error after worksheet mode update:', renderError);
            }
        }

    }

    return { onWorksheetModeClick };
}
