// Pure E-mode calculations shared by the optimizer flow and worksheet controller.
import { FACILITIES, getFacilityUnitWatts, simpleSetup } from './facility-config.js?v=aniimolab_v53';

export const EMODE_PRIORITY = [
    'Jukebox Dryer',
    'Simmering Pot',
    'Claw Game Cooker',
    'Carousel Mill',
    'Crafting Table',
    'Blazing Stove',
    'Joy Wheel Loom',
    'Pickling Jar',
    'Bouncy Brew Keg',
    'Phonolfactory Table',
    'Well',
    'Chimney Kiln',
    'Woodworking Bench',
    'Dance Pad Polisher',
    'Aniipod Maker',
    'Mine'
];

export function allocateConfiguredEmodeFacilities({ facilities, priority = EMODE_PRIORITY, facilityTiers, facilityPowerWatts, maxWatts }) {
    let remainingWatts = maxWatts;
    const selected = [];
    for (const name of priority) {
        const facility = facilities.find(item => item.name === name);
        if (!facility?.supportsEmode) continue;
        const watts = facilityPowerWatts[name] || 0;
        const owned = (facilityTiers[name] || []).reduce((sum, tier) => sum + (tier.count || 0), 0);
        if (owned > 0 && remainingWatts >= watts * owned) {
            selected.push(name);
            remainingWatts -= watts * owned;
        }
    }
    return selected;
}

function emodeMineUnits(homeLevel, tiers) {
    if (homeLevel < 15) return 0;
    return (tiers || []).filter(t => t.level >= 5).reduce((sum, t) => sum + t.count, 0);
}

export function getTargetEmodeWatts(generatorCapacity, powerRate) {
    if (powerRate >= 1.15) return Math.floor(generatorCapacity / 1.2);
    return generatorCapacity;
}

export function calculatePowerWatts(counts, homeLevel, getUnitWatts = getFacilityUnitWatts) {
    let total = 0;
    for (const [name, value] of Object.entries(counts || {})) {
        if (!value) continue;
        if (typeof value === 'object' && value !== null) {
            total += getUnitWatts(name, value.level || null, homeLevel) * (value.count || 0);
        } else {
            total += getUnitWatts(name, null, homeLevel) * (typeof value === 'number' ? value : 0);
        }
    }
    return total;
}

export function actualEmodeCounts(plan, homeLevel) {
    if (homeLevel < 12) return {};
    const counts = {};
    for (const step of (plan && plan.coin_items) || []) {
        if (step.status !== 'producing' || !step.facility) continue;
        const explicitMode = ['electric', 'prismana', 'specialist', 'manual'].includes(step.mode);
        const isElectric = explicitMode
            ? step.mode === 'electric'
            : !(step.is_specialist || step.facility.includes('(Prismana)') || (step.item_name && step.item_name.includes('__specialist')))
                && !(step.is_manual || step.facility.includes('(Manual)') || (step.item_name && step.item_name.includes('__manual')))
                && (step.is_emode || step.facility.includes('(Electric)'));
        if (!isElectric) continue;
        const facility = step.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '');
        counts[facility] = (counts[facility] || 0) + (step.facility_count || 1);
    }
    return counts;
}

// Keep redundant legacy fields aligned with the selected mode so older consumers of
// facility suffixes and flags cannot reinterpret a worksheet mode change.
export function setWorksheetStepMode(step, requestedMode) {
    const mode = requestedMode === 'specialist' ? 'prismana' : requestedMode;
    if (!['electric', 'prismana', 'manual'].includes(mode)) throw new Error(`Unsupported worksheet mode: ${requestedMode}`);
    const facility = (step?.facility || '').replace(/ \((Manual|Electric|Prismana)\)$/, '');
    return {
        ...step,
        facility: `${facility} (${mode === 'electric' ? 'Electric' : mode === 'prismana' ? 'Prismana' : 'Manual'})`,
        mode,
        is_emode: mode === 'electric',
        is_specialist: mode === 'prismana',
        is_manual: mode === 'manual'
    };
}

export function getWorksheetStepMode(step) {
    if (['electric', 'prismana', 'specialist', 'manual'].includes(step?.mode)) {
        return step.mode === 'specialist' ? 'prismana' : step.mode;
    }
    if (step?.is_specialist || step?.facility?.includes('(Prismana)') || step?.item_name?.includes('__specialist')) return 'prismana';
    if (step?.is_manual || step?.facility?.includes('(Manual)') || step?.item_name?.includes('__manual')) return 'manual';
    if (step?.is_emode || step?.facility?.includes('(Electric)')) return 'electric';
    return 'manual';
}

export function getFacilityPartitionCounts({ facility, plan, override, emodeCounts, totalOwned, specialistQuotas = {} }) {
    if (override) {
        return {
            electric: Math.max(0, override.electric_count || 0),
            prismana: Math.max(0, override.specialist_count || 0),
            manual: Math.max(0, override.manual_count || 0),
        };
    }

    const planCounts = { electric: 0, prismana: 0, manual: 0 };
    for (const step of plan?.coin_items || []) {
        const baseName = (step.facility || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();
        if (baseName !== facility) continue;
        const hasModeMarker = ['electric', 'prismana', 'specialist', 'manual'].includes(step.mode)
            || step.is_emode || step.is_specialist || step.is_manual
            || / \((Manual|Electric|Prismana)\)$/.test(step.facility || '')
            || /__(manual|specialist)$/.test(step.item_name || '');
        const mode = hasModeMarker ? getWorksheetStepMode(step) : 'prismana';
        planCounts[mode] += step.facility_count || 0;
    }
    if (planCounts.electric + planCounts.prismana + planCounts.manual > 0) return planCounts;

    const electric = Math.max(0, emodeCounts?.[facility] || 0);
    const remainingOwned = Math.max(0, totalOwned - electric);
    let prismanaQuota = 0;
    if (facility === 'Mine') prismanaQuota = specialistQuotas.earth_4p_mines ?? 3;
    else if (facility === 'Well') prismanaQuota = specialistQuotas.water_4f_wells ?? 0;
    const prismana = Math.min(remainingOwned, Math.max(0, prismanaQuota));
    const manual = facility === 'Mine' || facility === 'Well'
        ? Math.max(0, remainingOwned - prismana)
        : remainingOwned;
    return { electric, prismana, manual };
}

// Move owned units between worksheet modes without changing the facility total.
export function adjustFacilityPartitionCounts({ counts, totalOwned, type, delta, supportsElectric }) {
    let electric = Math.max(0, counts?.electric || 0);
    let prismana = Math.max(0, counts?.prismana || 0);
    let manual = Math.max(0, counts?.manual || 0);
    const limit = Math.max(0, Number.parseInt(totalOwned, 10) || 0);
    const step = Number.parseInt(delta, 10) || 0;

    if (type === 'electric' && supportsElectric) {
        const next = Math.max(0, Math.min(limit, electric + step));
        const diff = next - electric;
        if (diff > 0 && manual + prismana >= diff) {
            const fromManual = Math.min(manual, diff);
            manual -= fromManual;
            prismana -= diff - fromManual;
            electric = next;
        } else if (diff < 0) {
            electric = next;
            manual += -diff;
        }
    } else if (type === 'prismana') {
        const next = Math.max(0, Math.min(limit, prismana + step));
        const diff = next - prismana;
        if (diff > 0 && manual + electric >= diff) {
            const fromManual = Math.min(manual, diff);
            manual -= fromManual;
            electric -= diff - fromManual;
            prismana = next;
        } else if (diff < 0) {
            prismana = next;
            manual += -diff;
        }
    } else if (type === 'manual') {
        const next = Math.max(0, Math.min(limit, manual + step));
        const diff = next - manual;
        if (diff > 0 && electric + prismana >= diff) {
            const fromElectric = Math.min(electric, diff);
            electric -= fromElectric;
            prismana -= diff - fromElectric;
            manual = next;
        } else if (diff < 0) {
            manual = next;
            if (supportsElectric) electric += -diff;
            else prismana += -diff;
        }
    }

    return { electric, prismana, manual };
}

// Select one mode from facility-wide override quotas. The selected row's current mode wins
// while quota remains; all other modes are consumed at most once across rows.
export function takeWorksheetModeQuota(preferredMode, remaining, emodeAvailable) {
    const preferred = preferredMode === 'specialist' ? 'prismana' : preferredMode;
    const candidates = [...new Set([preferred, 'electric', 'prismana', 'manual'])];
    const mode = candidates.find(candidate =>
        (candidate !== 'electric' || emodeAvailable) && (remaining[candidate] || 0) > 0
    );
    if (!mode) return 'manual';
    remaining[mode]--;
    return mode;
}

// Share a single facility-wide override quota across all recipe rows in a worksheet.
export function createWorksheetModeQuotaTracker(overrides = []) {
    const remainingByFacility = new Map();
    for (const override of overrides) {
        if (!override?.facility || remainingByFacility.has(override.facility)) continue;
        remainingByFacility.set(override.facility, {
            electric: Math.max(0, override.electric_count || 0),
            prismana: Math.max(0, override.specialist_count || 0),
            manual: Math.max(0, override.manual_count || 0)
        });
    }
    return (facility, preferredMode, emodeAvailable) => {
        const remaining = remainingByFacility.get(facility);
        return remaining
            ? takeWorksheetModeQuota(preferredMode, remaining, emodeAvailable)
            : preferredMode;
    };
}

// Eligibility gates for the dynamic pre-solve allocator. Unit ownership and tier unlocks
// remain separate checks, so this function only captures the documented facility/RV policy.
export function isFacilityEligibleForEmode(facility, homeLevel) {
    if (homeLevel < 12 || !FACILITIES.find(item => item.name === facility)?.supportsEmode) return false;
    if (facility === 'Mine' || facility === 'Well') return homeLevel >= 14;
    if (facility === 'Woodworking Bench' || facility === 'Chimney Kiln') return homeLevel >= 18;
    return true;
}


/**
 * Estimates the marginal economic value (coins/hr per watt) of powering one unit
 * of a facility at a specific tier (level), based strictly on basePlan metrics.
 * Separated from orchestration for independent testability and audit compliance.
 */
export function estimateFacilityMarginalValue(facility, level, basePlan, options = {}) {
    const homeLevel = options.homeLevel || 15;
    const powerGridRate = options.powerGridRate ?? 1.2;
    const unitWatts = getFacilityUnitWatts(facility, level, homeLevel);

    if (unitWatts <= 0) {
        return {
            facility,
            level,
            unitWatts: 0,
            marginalRevenuePerHr: 0,
            workforceReliefPerHr: 0,
            totalScore: 0,
            scorePerWatt: 0,
            reason: 'unpowered_facility',
            status: 'unpowered',
            diagnostics: {
                metricSource: 'power_rules',
                reason: 'Facility does not require electric power'
            }
        };
    }

    // Helper chuẩn hóa suffix Manual/Electric/Prismana
    const normFac = (name) => (name || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();

    // 1. Phân tích doanh thu trực tiếp từ basePlan.income_streams (schema canonical của Rust WASM)
    // Mỗi entry trong income_streams: { item_name, facility, rate_per_second, sell_value, units_per_second }
    // rate_per_second đã là coins/sec. Tuyệt đối không nhân lại sell_value và không lấy 1.0 làm fallback.
    let activeRevenuePerSec = 0;
    const matchedStreams = [];
    const seenItems = new Set();


    if (basePlan && Array.isArray(basePlan.income_streams)) {
        for (const stream of basePlan.income_streams) {
            if (normFac(stream.facility) === facility) {
                // Tránh cộng lặp nếu cùng một item xuất hiện nhiều lần
                if (seenItems.has(stream.item_name)) continue;
                seenItems.add(stream.item_name);

                const streamRate = typeof stream.rate_per_second === 'number' ? stream.rate_per_second : 0;
                if (streamRate > 0) {
                    activeRevenuePerSec += streamRate;
                    matchedStreams.push({
                        item_name: stream.item_name,
                        facility: stream.facility,
                        rate_per_second: streamRate,
                        sell_value: stream.sell_value,
                        units_per_second: stream.units_per_second
                    });
                }
            }
        }
    }

    // Xác định số unit sở hữu thực tế của facility để giới hạn mẫu số vật lý
    let ownedUnits = null;
    if (options.facilities) {
        if (typeof options.facilities[facility] === 'number') {
            ownedUnits = options.facilities[facility];
        } else if (Array.isArray(options.facilities[facility])) {
            ownedUnits = options.facilities[facility].reduce((sum, t) => sum + (t.count || 0), 0);
        }
    }

    // PlanStep is one row per product. Dedicated rows represent disjoint capacity,
    // while time-share rows have facility_count: 0 for secondary rows.
    let rawActiveUnits = 0;
    if (basePlan && Array.isArray(basePlan.coin_items)) {
        rawActiveUnits = basePlan.coin_items
            .filter(step => normFac(step.facility) === facility && step.status === 'producing')
            .reduce((sum, step) => sum + (step.facility_count || 0), 0);
    }
    const effectiveOwned = (typeof ownedUnits === 'number' && ownedUnits > 0)
        ? ownedUnits
        : (rawActiveUnits > 0 ? rawActiveUnits : 1);
    const activeFacilityUnits = rawActiveUnits > 0 ? Math.min(effectiveOwned, rawActiveUnits) : effectiveOwned;

    // Helper kiểm tra xem cơ sở có đang tham gia chuỗi sản xuất thượng nguồn (upstream supplier) không
    const isUpstreamSupplier = (() => {
        if (!basePlan) return false;
        if (facility === 'Woodworking Bench' || facility === 'Chimney Kiln') return false;
        if (Array.isArray(basePlan.coin_items) && basePlan.coin_items.some(item => normFac(item.facility) === facility && item.status === 'producing' && (item.facility_count || 0) > 0)) {
            return true;
        }
        return false;
    })();

    // Nếu không có income stream nào khớp hoặc doanh thu = 0:
    // Nếu là upstream supplier, phân bổ tỷ lệ đóng góp từ tổng doanh thu nông trại hạ nguồn thay vì coi là 0.
    if (activeRevenuePerSec <= 0 || matchedStreams.length === 0) {
        if (isUpstreamSupplier) {
            const totalFarmRevenuePerSec = (basePlan.income_streams || []).reduce((sum, s) => sum + (s.rate_per_second || 0), 0);
            const totalActiveFarmUnits = Math.max(1, (basePlan.coin_items || [])
                .filter(step => step.status === 'producing')
                .reduce((sum, step) => sum + (step.facility_count || 0), 0));
            const unitBaseRevenuePerSec = totalFarmRevenuePerSec / totalActiveFarmUnits;
            const speedupFactor = Math.max(1.0, powerGridRate);
            const marginalRevenuePerSec = unitBaseRevenuePerSec * (speedupFactor - 1.0);
            const marginalRevenuePerHr = Math.round(marginalRevenuePerSec * 3600 * 100) / 100;
            const totalScore = marginalRevenuePerHr;
            const scorePerWatt = unitWatts > 0 ? totalScore / unitWatts : 0;

            return {
                facility,
                level,
                primaryItem: null,
                unitWatts,
                marginalRevenuePerHr,
                workforceReliefPerHr: 0,
                totalScore,
                scorePerWatt,
                measurement_type: 'imputed_upstream_contribution',
                reason: 'upstream_supplier_intermediate_inputs',
                status: 'upstream_supplier',
                diagnostics: {
                    metricSource: 'basePlan.income_streams_imputed',
                    matchedStreamsCount: 0,
                    activeFacilityUnits,
                    ownedUnits,
                    activeRevenuePerSec: unitBaseRevenuePerSec * activeFacilityUnits,
                    isUpstreamSupplier: true,
                    reason: 'Facility active as upstream supplier; marginal score imputed proportionally from downstream farm revenue'
                }
            };
        }

        return {
            facility,
            level,
            primaryItem: null,
            unitWatts,
            marginalRevenuePerHr: 0,
            workforceReliefPerHr: 0,
            totalScore: 0,
            scorePerWatt: 0,
            measurement_type: 'direct_sold_output',
            reason: 'no_matching_income_stream_or_zero_revenue',
            status: 'unknown',
            diagnostics: {
                metricSource: 'basePlan.income_streams',
                matchedStreamsCount: matchedStreams.length,
                activeFacilityUnits,
                ownedUnits,
                activeRevenuePerSec: 0,
                isUpstreamSupplier: false,
                reason: 'Facility produces 0 revenue or has no valid income stream in base plan'
            }
        };
    }

    const unitBaseRevenuePerSec = activeRevenuePerSec / activeFacilityUnits;
    const speedupFactor = Math.max(1.0, powerGridRate);
    const marginalRevenuePerSec = unitBaseRevenuePerSec * (speedupFactor - 1.0);
    const marginalRevenuePerHr = Math.round(marginalRevenuePerSec * 3600 * 100) / 100;

    // Yêu cầu File 19 & 20: Loại bỏ workforceReliefPerHr khỏi totalScore chính
    // (score phản ánh đúng direct marginal revenue thực tế đo đạc được từ base plan)
    const totalScore = marginalRevenuePerHr;
    const scorePerWatt = unitWatts > 0 ? totalScore / unitWatts : 0;

    return {
        facility,
        level,
        primaryItem: matchedStreams[0]?.item_name || null,
        unitWatts,
        marginalRevenuePerHr,
        workforceReliefPerHr: 0,
        totalScore,
        scorePerWatt,
        measurement_type: 'direct_sold_output',
        reason: 'empirical_base_plan_income_stream',
        status: 'measured',
        diagnostics: {
            metricSource: 'basePlan.income_streams',
            matchedStreams,
            activeFacilityUnits,
            ownedUnits,
            activeRevenuePerSec,
            unitBaseRevenuePerSec,
            speedupFactor,
            marginalRevenuePerHr,
            scorePerWatt,
                tierAttribution: 'PlanStep has no facility-level field; facility-wide average is applied to each tier',
            isUpstreamSupplier: false,
            workforceReliefNote: 'Excluded from score per Audit 19 requirement'
        }
    };
}

export function allocateDynamicEmode(basePlan, homeLevel, maxWatts, options = {}) {
    if (homeLevel < 12) return {};

    const normFac = (name) => (name || '').replace(/ \((Manual|Electric|Prismana)\)$/, '').trim();
    const powerRate = options.powerGridRate ?? 1.2;

    // 1. Resolve owned counts properly per tier
    const effectiveFacilities = options.facilities || simpleSetup(homeLevel).facilities;

    const ownedCounts = {};
    for (const [fac, tiers] of Object.entries(effectiveFacilities)) {
        ownedCounts[fac] = (tiers || []).reduce((sum, t) => sum + (t.count || 0), 0);
    }
    const quotas = options.specialist_quotas || (homeLevel >= 20 ? { earth_4p_mines: 3, water_4f_wells: 1 } : {});
    ownedCounts['Mine'] = emodeMineUnits(homeLevel, effectiveFacilities['Mine']);
    if (quotas.water_4f_wells && ownedCounts['Well']) {
        ownedCounts['Well'] = Math.max(0, ownedCounts['Well'] - quotas.water_4f_wells);
    }

    const currentOverrides = options.overrides || [];
    const overrideLevel = (ovr) => {
        if (ovr.level > 0) return ovr.level;
        const tiers = effectiveFacilities[ovr.facility] || [];
        return tiers.length ? Math.max(...tiers.map(t => t.level || 1)) : 1;
    };
    const overrideForTier = (fac, level) => currentOverrides.find(ovr =>
        ovr.facility === fac && overrideLevel(ovr) === level);

    // =========================================================================
    // STEP 0: STRICT VALIDATION OF USER OVERRIDES (TIER-AWARE, NO SILENT CLAMPING!)
    // =========================================================================
    let totalFixedWatts = 0;
    const seenOverrideTiers = new Set();
    for (const ovr of currentOverrides) {
        const fac = ovr.facility;
        const eCount = ovr.electric_count || 0;
        const mCount = ovr.manual_count || 0;
        const sCount = ovr.specialist_count || 0;
        const totalLocked = eCount + mCount + sCount;

        const facTiers = effectiveFacilities[fac] || [];
        const level = overrideLevel(ovr);
        const overrideKey = `${fac}:${level}`;
        if (seenOverrideTiers.has(overrideKey)) {
            return { validation_error: true, error: `Có nhiều fixed override cho ${fac} Lv.${level}; hãy gộp thành một dòng.` };
        }
        seenOverrideTiers.add(overrideKey);
        const tierObj = facTiers.find(t => (t.level || 1) === level);
        const ownedAtLevel = tierObj ? (tierObj.count || 0) : 0;
        if (ownedAtLevel === 0) {
            return {
                validation_error: true,
                error: `Facility ${fac}: Cấp độ ${level} không có đơn vị nào được sở hữu!`
            };
        }
        if (![eCount, mCount, sCount].every(n => Number.isInteger(n) && n >= 0)) {
            return { validation_error: true, error: `Facility ${fac} Lv.${level}: số lượng override phải là số nguyên không âm.` };
        }
        if (totalLocked > ownedAtLevel) {
            return {
                validation_error: true,
                error: `Facility ${fac} Lv.${level}: Tổng số lượng gán (${totalLocked}) vượt quá số lượng sở hữu tại cấp này (${ownedAtLevel})!`
            };
        }

        if (eCount > 0) {
            const w = getFacilityUnitWatts(fac, level, homeLevel);
            totalFixedWatts += eCount * w;
        }
    }

    if (totalFixedWatts > maxWatts) {
        return {
            validation_error: true,
            error: `Các cơ sở khóa điện cố định vượt quá công suất lưới (${totalFixedWatts}W > ${maxWatts}W)!`
        };
    }

    // RV 18-20: Woodworking Bench & Chimney Kiln tham gia dùng điện linh hoạt khi còn dư tải (tối đa 2 cơ sở)

    const emodeCounts = {};
    const diagnostics = [];
    let usedWatts = 0;

    function isLockedManual(fac, level) {
        const ovr = overrideForTier(fac, level);
        if (!ovr) return false;
        if (ovr.electric_count === 0 && (ovr.manual_count > 0 || ovr.specialist_count > 0)) return true;
        if (ovr.electric_count === 0 && ovr.manual_count === 0 && ovr.specialist_count === 0) return true;
        return false;
    }

    function fixedElectricCount(fac, level) {
        const ovr = overrideForTier(fac, level);
        if (!ovr) return null;
        if (typeof ovr.electric_count === 'number' && ovr.electric_count > 0) {
            return ovr.electric_count;
        }
        return null;
    }

    const tierCountMap = new Map();

    // =========================================================================
    // STEP 1: INITIALIZE FIXED OVERRIDES (HONOR EXACT USER SELECTIONS)
    // =========================================================================
    for (const ovr of currentOverrides) {
        const fac = ovr.facility;
        const count = ovr.electric_count || 0;
        if (count > 0) {
            const lvl = overrideLevel(ovr);
            const w = getFacilityUnitWatts(fac, lvl, homeLevel);
            emodeCounts[fac] = (emodeCounts[fac] || 0) + count;
            usedWatts += count * w;
            const tierKey = `${fac}:${lvl}`;
            if (!tierCountMap.has(tierKey)) {
                tierCountMap.set(tierKey, { facility: fac, level: lvl, count: 0 });
            }
            tierCountMap.get(tierKey).count += count;

            diagnostics.push({
                facility: fac,
                level: lvl,
                units: count,
                unitWatts: w,
                scorePerWatt: 99999.0,
                marginalRevenuePerHr: 0,
                reason: 'user_fixed_override'
            });
        }
    }

    // Helper xác định priority rank của cơ sở từ basePlan.priorities:
    // Rank 0: Phục vụ Priority #1, Rank 1: Phục vụ Priority #2, ...
    // Rank 999: Phục vụ Coins hoặc khác
    const getFacilityPriorityRank = (facilityName) => {
        const priorities = basePlan?.priorities || [];
        for (let idx = 0; idx < priorities.length; idx++) {
            const p = priorities[idx];
            if (p.facilities && Array.isArray(p.facilities) && p.facilities.includes(facilityName)) {
                return idx;
            }
        }
        return 999;
    };

    // =========================================================================
    // STEP 2: GENERATE CANDIDATES BY SPECIFIC TIER AND UNIT
    // Phân luồng theo PRE-SOLVE-WORKFLOW:
    // - RV 12-13: Chỉ cơ sở chế biến / sản xuất. Tuyệt đối KHÔNG Mine và Well. Không Woodworking Bench / Chimney Kiln.
    // - RV 14-17: Cơ sở chế biến trước -> dư tải mới mở cho Mine & Well thường (sau khi trừ quota).
    // - RV 18-20: Cơ sở chế biến -> Mine & Well thường -> Dư tải mới mở cho Woodworking Bench & Chimney Kiln (tối đa 2).
    // =========================================================================
    const candidates = [];
    for (const [fac, tiers] of Object.entries(effectiveFacilities)) {
        if (!isFacilityEligibleForEmode(fac, homeLevel)) continue;

        let quotaDeduction = 0;
        if (fac === 'Mine' && quotas.earth_4p_mines) quotaDeduction = quotas.earth_4p_mines;
        if (fac === 'Well' && quotas.water_4f_wells) quotaDeduction = quotas.water_4f_wells;

        for (const tier of (tiers || [])) {
            const tLevel = tier.level || 1;
            const tCount = tier.count || 0;
            const availableInTier = Math.max(0, tCount - quotaDeduction);
            quotaDeduction = Math.max(0, quotaDeduction - tCount);

            if (availableInTier <= 0) continue;
            if (isLockedManual(fac, tLevel) || fixedElectricCount(fac, tLevel) !== null) continue;

            const priorityRank = getFacilityPriorityRank(fac);
            const isPriorityFac = priorityRank < 999;

            let isPriorityDowngrade = false;
            if (isPriorityFac && basePlan?.coin_items) {
                const producingStep = basePlan.coin_items.find(s => normFac(s.facility) === fac && s.status === 'producing');
                if (producingStep) {
                    if (fac === 'Dance Pad Polisher' || fac === 'Aniipod Maker') {
                        isPriorityDowngrade = true;
                    }
                }
            }
            if (isPriorityDowngrade) continue;

            let upstreamDepth = 999;
            const prio = isPriorityFac ? (basePlan?.priorities || [])[priorityRank] : null;
            if (prio && prio.depth_status !== 'cycle_detected' && prio.depth_status !== 'depth_truncated') {
                if (Array.isArray(prio.facility_depths)) {
                    const found = prio.facility_depths.find(([name]) => name === fac);
                    if (found) upstreamDepth = found[1];
                } else if (Array.isArray(prio.facilities)) {
                    const idx = prio.facilities.indexOf(fac);
                    if (idx !== -1) upstreamDepth = idx;
                }
            }

            const estimate = estimateFacilityMarginalValue(fac, tLevel, basePlan, {
                homeLevel,
                powerGridRate: powerRate,
                productionAniimoCap: options.productionAniimoCap,
                facilities: effectiveFacilities
            });

            const isExtractor = (fac === 'Mine' || fac === 'Well');
            const isWoodOrKiln = (fac === 'Woodworking Bench' || fac === 'Chimney Kiln');

            // Policy rank phân luồng:
            // 0: Các cơ sở chế biến / sản xuất (luôn cấp trước)
            // 1: Mine & Well thường (sau khi trừ quota) khi còn dư tải (RV >= 14)
            // 2: Woodworking Bench & Chimney Kiln khi còn dư tải (RV >= 18)
            let policyRank = 0;
            if (isExtractor) policyRank = 1;
            else if (isWoodOrKiln) policyRank = 2;

            if ((isExtractor || isWoodOrKiln || estimate.scorePerWatt > 0 || estimate.status === 'upstream_supplier' || isPriorityFac) && estimate.unitWatts > 0) {
                for (let u = 0; u < availableInTier; u++) {
                    candidates.push({
                        facility: fac,
                        level: tLevel,
                        unitIndex: u,
                        unitWatts: estimate.unitWatts,
                        marginalRevenuePerHr: estimate.marginalRevenuePerHr,
                        workforceReliefPerHr: estimate.workforceReliefPerHr,
                        score: estimate.totalScore,
                        scorePerWatt: isPriorityFac ? Math.max(estimate.scorePerWatt, 1000 - priorityRank) : estimate.scorePerWatt,
                        priorityRank: priorityRank,
                        upstreamDepth: upstreamDepth,
                        item: estimate.primaryItem,
                        measurementType: estimate.measurement_type || 'unknown',
                        estimateStatus: estimate.status,
                        tierAttribution: estimate.diagnostics?.tierAttribution || 'unknown',
                        policyRank
                    });
                }
            }
        }
    }

    // =========================================================================
    // STEP 3: DETERMINISTIC SORTING & KNAPSACK ALLOCATION
    // =========================================================================
    candidates.sort((a, b) => {
        if (a.policyRank !== b.policyRank) return a.policyRank - b.policyRank;
        if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
        }
        // Trong cùng một priority: ưu tiên cơ sở thượng nguồn (upstream) trước cơ sở hạ nguồn (downstream)
        if (a.upstreamDepth !== b.upstreamDepth) {
            return a.upstreamDepth - b.upstreamDepth;
        }
        if (Math.abs(b.scorePerWatt - a.scorePerWatt) > 1e-6) {
            return b.scorePerWatt - a.scorePerWatt;
        }
        if (Math.abs(b.score - a.score) > 1e-6) {
            return b.score - a.score;
        }
        const cmp = a.facility.localeCompare(b.facility);
        if (cmp !== 0) return cmp;
        if (b.level !== a.level) return b.level - a.level;
        return a.unitIndex - b.unitIndex;
    });

    let totalWoodKilnElectric = (emodeCounts['Woodworking Bench'] || 0) + (emodeCounts['Chimney Kiln'] || 0);

    for (const cand of candidates) {
        if (cand.policyRank === 2 && totalWoodKilnElectric >= 2) {
            // Giới hạn cứng: Woodworking Bench + Chimney Kiln tối đa 2 cơ sở chạy điện
            continue;
        }
        if (usedWatts + cand.unitWatts <= maxWatts) {
            const current = emodeCounts[cand.facility] || 0;
            const owned = ownedCounts[cand.facility] || 0;
            if (current < owned) {
                if (cand.policyRank === 2) {
                    totalWoodKilnElectric++;
                }
                emodeCounts[cand.facility] = current + 1;
                usedWatts += cand.unitWatts;
                const tierKey = `${cand.facility}:${cand.level}`;
                if (!tierCountMap.has(tierKey)) {
                    tierCountMap.set(tierKey, { facility: cand.facility, level: cand.level, count: 0 });
                }
                tierCountMap.get(tierKey).count += 1;

                diagnostics.push({
                    facility: cand.facility,
                    level: cand.level,
                    item: cand.item,
                    units: 1,
                    unitWatts: cand.unitWatts,
                    scorePerWatt: Math.round(cand.scorePerWatt * 10) / 10,
                    marginalRevenuePerHr: Math.round(cand.marginalRevenuePerHr),
                    workforceReliefPerHr: Math.round(cand.workforceReliefPerHr),
                    reason: cand.priorityRank < 999
                        ? `priority_${cand.priorityRank + 1}_upstream_depth_${cand.upstreamDepth}`
                        : (cand.estimateStatus === 'upstream_supplier'
                            ? 'upstream_supplier_unknown_value_grid_remainder'
                            : 'smart_marginal_score'),
                    measurement_type: cand.measurementType,
                    estimate_status: cand.estimateStatus,
                    tier_attribution: cand.tierAttribution
                });
            }
        }
    }

    const emodeTierCounts = Array.from(tierCountMap.values()).filter(t => t.count > 0);
    Object.defineProperty(emodeCounts, '_tier_counts', {
        value: emodeTierCounts,
        enumerable: false,
        writable: true
    });

    Object.defineProperty(emodeCounts, '_diagnostics', {
        value: diagnostics,
        enumerable: false,
        writable: true
    });

    return emodeCounts;
}

export function autoAllocateEmode(homeLevel, maxWatts, activeProducingCounts = null, options = {}) {
    if (homeLevel < 12) return {};
    const facilities = options.facilities || simpleSetup(homeLevel).facilities;
    let remainingWatts = maxWatts;
    const allocated = {};

    if (homeLevel === 18 || homeLevel === 19) {
        for (const name of ['Chimney Kiln', 'Woodworking Bench']) {
            const tiers = facilities[name] || [];
            const top = tiers.reduce((best, tier) => !best || tier.level > best.level ? tier : best, null);
            if (!top || top.count <= 0) continue;
            const watts = getFacilityUnitWatts(name, top.level, homeLevel);
            if (remainingWatts < watts) continue;
            allocated[name] = 1;
            remainingWatts -= watts;
        }
    }

    // During RV12-19 LevelUp, Mine and Well use spare wattage before optional
    // processors: at 1.2x their 25-minute electric cycle matches ordinary Lv.3.
    // RV20 keeps its own existing end-game order.
    const allocationOrder = homeLevel >= 12 && homeLevel <= 19
        ? ['Well', 'Mine', ...EMODE_PRIORITY.filter(name => name !== 'Well' && name !== 'Mine')]
        : EMODE_PRIORITY;
    for (const name of allocationOrder) {
        if (name === 'Woodworking Bench' || name === 'Chimney Kiln') continue;
        const fac = FACILITIES.find(f => f.name === name);
        if (!fac || !fac.supportsEmode) continue;
        const wattsPerUnit = getFacilityUnitWatts(name, null, homeLevel);
        if (wattsPerUnit <= 0) continue;

        let availableUnits = name === 'Mine'
            ? emodeMineUnits(homeLevel, facilities[name])
            : (facilities[name] || []).reduce((sum, t) => sum + t.count, 0);
        if (homeLevel >= 12 && homeLevel <= 19 && name === 'Mine') {
            availableUnits = Math.max(0, availableUnits - ((options.specialist_quotas?.earth_4p_mines) || 0));
        } else if (homeLevel >= 12 && homeLevel <= 19 && name === 'Well') {
            availableUnits = Math.max(0, availableUnits - ((options.specialist_quotas?.water_4f_wells) || 0));
        }
        if (activeProducingCounts && typeof activeProducingCounts[name] === 'number') {
            availableUnits = Math.min(availableUnits, activeProducingCounts[name]);
        }
        if (availableUnits <= 0) continue;

        let countForFac = 0;
        for (let u = 0; u < availableUnits; u++) {
            if (remainingWatts >= wattsPerUnit) {
                countForFac++;
                remainingWatts -= wattsPerUnit;
            } else {
                break;
            }
        }
        if (countForFac > 0) {
            allocated[name] = countForFac;
        }
    }
    return allocated;
}

