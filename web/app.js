// AniimoLab Web Application

import {
    FACILITIES, FACILITY_CATEGORIES, FACILITY_CATEGORY_BY_NAME, FACILITY_FOOTPRINTS, HOMELAND_PLOTS, HOMELAND_PLOT_SIZE,
    MAX_HOME_LEVEL, ANIIMO_MAX, simpleSetup,
    LEVEL_UP_COSTS, LEVEL_UP_CHAINS, SPECIAL_RECIPES, SEASON, SEASON_RECIPES, ANIIPOD_TIERS, PERSONALITY_PAIRS, personalityLetter, opposedPersonality,
    FACILITY_POWER_WATTS, FACILITY_BASE_WATTS, getFacilityUnitWatts, DEFAULT_GENERATOR_WATTS, GENERATOR_WATTS_BY_HOME_LEVEL, GENERATOR_CAPACITY_OPTIONS,
    POWER_PROFILES_BY_RV, getPowerProfile,
    LAYOUT_DISTRICTS, getFacilityDistrict,
    CROP_HARVEST_ABILITY, getCropHarvestAbility,
} from './facility-config.js?v=aniimolab_v53';
import { renderAniimoWorkerCard, renderAniimoTasksCluster, renderRosterWorkerBadge, getWorkerForLevel, getFacilitySpecificWorker, ABILITY_THEMES } from './aniimo-data.js?v=aniimolab_v53';
import { renderFacilityIcon, renderItemIcon, renderHomelandSvgFacility, getFacilityIconUrl, HOMELAND_ASSET_MANIFEST } from './asset-map.js?v=aniimolab_v53';
import {
    EMODE_PRIORITY,
    actualEmodeCounts as countActualEmodeUnits,
    allocateDynamicEmode as allocateDynamicEmodePolicy,
    autoAllocateEmode as autoAllocateEmodePolicy,
    calculatePowerWatts as sumPowerWatts,
    estimateFacilityMarginalValue as estimateFacilityMarginalValuePolicy,
    getTargetEmodeWatts as calculateTargetEmodeWatts,
    isFacilityEligibleForEmode,
    createWorksheetModeQuotaTracker,
    getWorksheetStepMode as worksheetStepMode,
    adjustFacilityPartitionCounts,
    getFacilityPartitionCounts,
} from './emode-policy.js?v=aniimolab_v63';
import { createEmodeSettingsController, createPowerGaugeController, createWorksheetModeController, worksheetFixedPlanLines, worksheetOverridesFromLines as buildWorksheetOverridesFromLines } from './emode-controller.js?v=aniimolab_v66';
import { createSolverClient } from './solver-client.js?v=aniimolab_v59';
import { executePlanSolve } from './plan-solve-runner.js?v=aniimolab_v1';
import { createFastResolveController } from './fast-resolve-controller.js?v=aniimolab_v1';
import { createTimeToGoalController } from './time-to-goal-controller.js?v=aniimolab_v1';
import { buildImprovementRankingMarkup } from './improvement-ranking-renderer.js?v=aniimolab_v1';
import { createRecipeSearchController } from './recipe-search-controller.js?v=aniimolab_v1';
import { createInsightsRenderer } from './insights-renderer.js?v=aniimolab_v1';
import { tipAttrs, createTooltipController } from './tooltip-controller.js?v=aniimolab_v1';
import { createFacilitiesModalController } from './facilities-modal-controller.js?v=aniimolab_v1';
import { createFacilityPartitionDialogController } from './facility-partition-dialog.js?v=aniimolab_v1';
import { createAniimoSummaryController } from './aniimo-summary-controller.js?v=aniimolab_v1';
import { createAniimoSetupUIController } from './aniimo-setup-ui.js?v=aniimolab_v1';
import { createStrategyUIController } from './strategy-ui-controller.js?v=aniimolab_v1';
import { createSeasonPlotsAdvisoryController } from './season-plots-advisory.js?v=aniimolab_v1';
import { createPlanSolveController } from './plan-solve-controller.js?v=aniimolab_v1';
import { createPlanDisplayController } from './plan-display-controller.js?v=aniimolab_v1';
import { createGoalDisplayController } from './goal-display-controller.js?v=aniimolab_v1';
import { madeBy as calculateMadeBy, timeToMake as calculateTimeToMake } from './goal-production.js?v=aniimolab_v1';
import { createRateDisplayController } from './rate-display-controller.js?v=aniimolab_v1';
import { buildGoalAlsoViewModel } from './goal-also-renderer.js?v=aniimolab_v1';
import { createAniimoSetupController } from './plan-controller.js?v=aniimolab_v53';
import { runPlanPruning } from './plan-pruning.js?v=aniimolab_v2';
import { solvePlanWithEmode } from './emode-solve-pipeline.js?v=aniimolab_v1';
import { normalizePlanFacilityCounts as normalizePlanFacilityCountsModule } from './plan-normalization.js?v=aniimolab_v2';
import { buildStrategyPlanInput as buildStrategyPlanInputModule } from './plan-strategy.js?v=aniimolab_v1';
import { createPlanInputBuilder } from './plan-input.js?v=aniimolab_v1';
import {
    selectOptimalSeasonDishes as selectOptimalSeasonDishesPolicy,
    getSeasonFacilityUsage as summarizeSeasonFacilityUsage,
    calculateOptimalSeasonPlots as calculateOptimalSeasonPlotsPolicy,
} from './season-planner.js?v=aniimolab_v1';
import { integrateSeasonPlan as integrateSeasonPlanModule } from './season-plan-integration.js?v=aniimolab_v1';
import { createSeasonController } from './season-controller.js?v=aniimolab_v1';
import { createRecipeTableRenderer } from './recipe-table-renderer.js?v=aniimolab_v1';
import { splitEnvironmentRowsByUnit as splitEnvironmentRowsByUnitPolicy } from './homeland-layout-view.js?v=aniimolab_v2';
import { createHomelandUIController } from './homeland-ui-controller.js?v=aniimolab_v1';
import { renderGoalTargetOptions } from './goal-details-renderer.js?v=aniimolab_v1';
import { createProductionSummaryViewController } from './production-summary-view.js?v=aniimolab_v1';
import { createEnvironmentRenderer } from './environment-renderer.js?v=aniimolab_v1';
import { buildLevelUpViewModel } from './level-up-renderer.js?v=aniimolab_v1';
import { buildSimpleSummaryViewModel } from './simple-summary-renderer.js?v=aniimolab_v1';
import { createProgressController, trialCountToPercent, searchNote } from './progress-controller.js?v=aniimolab_v1';
import { buildSolverResultViewModel } from './solver-result-renderer.js?v=aniimolab_v1';
import { buildSpecialRecipeViewModel } from './special-recipe-renderer.js?v=aniimolab_v1';
import { createFacilitySetupController } from './facility-setup-controller.js?v=aniimolab_v1';
import { createRosterUIController } from './roster-ui-controller.js?v=aniimolab_v1';
import { buildProfitInsight } from './profit-insight.js?v=aniimolab_v1';
import { buildFarmSupplyInsight } from './farm-supply-insight.js?v=aniimolab_v1';
import { buildWoodlandInsight } from './woodland-insight.js?v=aniimolab_v1';
import { buildRejectedInsight } from './rejected-insight.js?v=aniimolab_v1';
import { buildLogisticsInsight } from './logistics-insight.js?v=aniimolab_v1';
import { STORAGE_KEY, applySavedFields, attachPersistedFieldAutosave, buildSavedConfig, persistSavedConfig, readSavedConfig, removeSavedConfig, restoreSavedState } from './config-storage.js?v=aniimolab_v1';
import { createRecipeFilterController } from './recipe-filter-controller.js?v=aniimolab_v1';
import { createPriorityController } from './priority-controller.js?v=aniimolab_v1';
import { createStrategyFormController } from './strategy-form-controller.js?v=aniimolab_v1';
import { createSpecialRecipeController } from './special-recipe-controller.js?v=aniimolab_v1';
import { createHomeLevelController } from './home-level-controller.js?v=aniimolab_v1';
import { buildPriorityListMarkup } from './priority-renderer.js?v=aniimolab_v1';
import { buildLevelUpStrategyViewModel, getLevelUpStockAmount, getLevelUpStockNames } from './level-up-strategy-renderer.js?v=aniimolab_v1';
import { createInfeasibleViewController } from './infeasible-view.js?v=aniimolab_v1';
import { createFacilityPlanViewController } from './facility-plan-view.js?v=aniimolab_v1';
import {
    ITEM_NAMES,
    numberOrDefault,
    floatOrDefault,
    formatNumber,
    formatRate,
    getFacilityDisplayName,
    getModeDisplayName,
    getModuleDisplayName,
    getItemDisplayName,
    prettyItem,
    prettyReason,
    goalName,
} from './display-formatters.js?v=aniimolab_v1';
import { createImprovementCandidateBuilder, createImprovementRankingController, calculateImprovementGain, buildImprovementRankingViewModel } from './improvement-ranking.js?v=aniimolab_v3';
export { EMODE_PRIORITY };

// Every Aniimo ability in the game's own order, with its in-game color and what it's for.
// `dark` marks colors light enough to need dark text.
const ABILITIES = [
    { name: 'Fire', color: '#e5484d', about: 'Cooking, smelting and heat' },
    { name: 'Grass', color: '#3fa36b', about: 'Planting seeds and gathering' },
    { name: 'Water', color: '#2b8fe8', about: 'Brewing, fetching water and watering' },
    { name: 'Earth', color: '#b39a74', about: 'Reclaiming land and mining' },
    { name: 'Lightning', color: '#e6c317', about: 'Electricity', dark: true },
    { name: 'Ice', color: '#45c4de', about: 'Cooling the homeland' },
    { name: 'Wind', color: '#2fbfa5', about: 'Processing with wind' },
    { name: 'Dark', color: '#7d4bb3', about: 'Harvesting, cutting, pickling and drying' },
    { name: 'Light', color: '#f5a524', about: 'Lighting the homeland', dark: true },
    { name: 'Hauling', color: '#5f7fd1', about: 'Carrying produce to storage' },
    { name: 'Artisanship', color: '#5fb14f', about: 'Handcrafted goods' },
    { name: 'Leisure', color: '#e8678a', about: 'Making things while playing' },
    { name: 'Perfumery', color: '#b877d9', about: 'Perfumes and incense' },
];
const ABILITY_BY_NAME = new Map(ABILITIES.map(a => [a.name, a]));

// The ability each environment building's Aniimo needs (confirmed in game).
const ENVIRONMENT_BUILDING_ABILITY = {
    'Heat Furnace': 'Fire',
    'Cooling Unit': 'Ice',
    'Sunlamp': 'Light',
};

const escapeText = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let wasmReady = false;

// The wasm optimizer runs in a Web Worker (see worker.js), not on the main thread: `find_plan`
// can take long enough on a complex facility setup that running it here would freeze the page's
// own rendering, which is what makes the browser offer to kill the tab. Every call site below
// goes through `callWorker` instead of calling a wasm-bindgen function directly.
// Tags this page load's worker (and, through it, the wasm solver; see worker.js) so the browser
// never runs a cached older solver next to newer page code.
const WORKER_URL = `./worker.js?v=aniimolab_v57&load=${Date.now()}`;
const solverClient = createSolverClient(WORKER_URL);
const { initWorker, restartWorker, callWorker } = solverClient;

// Converts the solver's real, running trial-solve count (from `find_plan`'s progress callback;
// see worker.js) into a progress-bar fill percentage. The algorithm's exact total trial count
// isn't knowable in advance: several of its exclusion passes stop once they converge rather than
// running a fixed number of times (see `find_production_plan`'s doc comments in optimizer.rs), so
// there's no true denominator to divide by. Every tick this responds to is a genuinely completed
// trial solve, so unlike a purely decorative animation, a faster machine or a simpler facility
// setup visibly reaches each milestone sooner. Capped at 96% (not 100%) while still running, so
// the bar never visually claims "done" before `find_plan` actually returns; `runFindPlan` sets it
// to a literal 100% only once the result is actually back.
//
// Two phases, not one asymptotic curve for the whole run: the solver's own shape is bimodal, not
// smoothly decaying. The first `EARLY_PHASE_TRIALS` or so cover just the initial candidate
// solve (fast, and roughly the ENTIRE cost for a simple facility setup with nothing contested).
// Everything past that is the environment-coverage-CHOICE exclusion pass (see its doc comment in
// optimizer.rs), which reruns the full packing pipeline per trial and, for a facility setup with
// real contested resources, routinely runs into the hundreds of trials across its rounds of
// per-processor, per-ingredient, and pairs searches. A single asymptotic curve tuned to feel right
// for the fast, simple case (a low halfway trial count) makes that expensive long tail nearly
// invisible -- it's already past 90% by trial 100, then creeps for the remaining several hundred,
// which is exactly the "gets exponentially slower towards the end" complaint this two-phase
// version fixes: the SECOND phase gets its own, much larger halfway trial count, so the visual
// progress keeps moving noticeably through that long tail instead of flatlining near the cap.
// The most recently computed plan (the full JS object returned by find_plan, including
// `success`/`error`); held in memory so changing the goal amount can call time_to_reach directly
// without re-running the facility-allocation solve. Cleared whenever facilities/currency/modules
// change, since those invalidate the plan.
let lastPlan = null;

// Plans for both Aniimo setups from the latest Calculate: `{ best, minimum }`. Best is solved and
// shown first; Minimum follows in the background (see `runFindPlan`). `planRunId` lets a newer
// Calculate click discard an older run's late Minimum result.
let plansBySetup = {};
let planRunId = 0;

// A name for the setup on screen, spelling out what was said so each distinct one is worked out
// and kept apart; the levels themselves travel in `aniimo_levels`, the roster in `roster`.
function selectedAniimoSetup() {
    const tab = selectedSetupTab();
    if (tab === 'minimum') return 'minimum';
    if (tab === 'custom') return `roster:${JSON.stringify(rosterUIController.getRoster().map(({ name, ...aniimo }) => aniimo))}`;
    return bestAniimoSetup();
}

function bestAniimoSetup() {
    return `best:${levelledAbilities().map(a => `${a}${bestAniimoLevel(a)}`).join(',')}`;
}

// What the last plan was solved from, so switching setup can work out another one without the
// player filling the form in again.
let lastPlanInput = null;

const aniimoSetupController = createAniimoSetupController({
    WorkerImpl: Worker,
    workerUrl: WORKER_URL,
    getPlans: () => plansBySetup,
    getLastPlanInput: () => lastPlanInput,
    getRunId: () => planRunId,
    getSelectedSetup: selectedAniimoSetup,
    getAniimoInput: aniimoInput,
    normalizePlan: normalizePlanFacilityCounts,
    showSelectedPlan,
});

function ensurePlanFor(setup) {
    aniimoSetupController.ensurePlanFor(setup);
}

function stopSetupSolve() {
    aniimoSetupController.stopSetupSolve();
}

function switchAniimoSetup() {
    aniimoSetupController.switchAniimoSetup();
}

// Shows the plan for the selected Aniimo setup, or a "still working" note if it isn't ready.
function showSelectedPlan() {
    const setup = selectedAniimoSetup();
    const plan = plansBySetup[setup];
    const pending = document.getElementById('aniimo-pending');
    const content = document.getElementById('results-content');
    content.classList.toggle('stale', !plan);
    if (!plan) {
        pending.style.display = 'block';
        return;
    }
    pending.style.display = 'none';
    normalizePlanFacilityCounts(plan);
    lastPlan = plan;
    if (plan.success) {
        lastEmodeCounts = actualEmodeCounts(plan);
        updatePowerGauge(lastEmodeCounts);
    }
    displayPlan(plan);
    renderSpecialRecipes();
    const planViable = plan.success;
    if (planViable) {
        runTimeToGoal();
        rankImprovementsFor(setup);
    } else {
        stopRanking();
        ranking = null;
        renderImprovements();
    }
}

// The most recently computed goal result, held the same way as `lastPlan` so switching the rate
// unit can re-render the Product Breakdown table's Profit column without recomputing the goal.
let lastGoalResult = null;

// Display name for each optimizable currency. Coins are the only one since the full release
// removed Bud Tickets; kept as a map so a plan's `currency` still resolves to its label.
const CURRENCY_LABELS = {
    coins: 'Home Coins',
    aniimo_exp: 'Aniimo EXP',
    aniipods: 'Aniipods',
};

// Multiplier from the solver's native per-second rate to each display unit, and the short suffix
// shown next to the currency label (e.g. "Coins/hour"). "Your Rate" is stored and computed
// per-second throughout; this only affects how that one number is displayed.
const RATE_UNIT_SECONDS = {
    second: { multiplier: 1, suffix: '/sec' },
    minute: { multiplier: 60, suffix: '/min' },
    hour: { multiplier: 3600, suffix: '/hour' },
    day: { multiplier: 86400, suffix: '/day' },
};

// Per-facility owned tiers: `{ 'Farmland': [{count: 5, level: 3}, {count: 4, level: 5}], ... }`.
// The single source of truth for what's owned; rendering reads FROM this, input edits write
// BACK into it, and `getPlanInputValues()` sends it straight to the solver as-is. A player
// commonly upgrades some but not all of their plots of one facility type (e.g. 5 Farmland at
// level 3 and 4 more upgraded to level 5), so a facility can own more than one tier; facilities
// that don't level up at all (`hasLevels: false`) only ever have exactly one.
let facilityTiers = {};
let emodeFacilities = new Set();

export function getProductionAniimoCap() {
    const el = document.getElementById('production-aniimo-cap');
    if (!el) return 26;
    const val = parseInt(el.value, 10);
    return isNaN(val) ? 26 : Math.max(1, val);
}

export function updateProductionAniimoCap(homeLevel = selectedHomeLevel()) {
    const max = ANIIMO_MAX[homeLevel - 1] || 36;
    const capInput = document.getElementById('production-aniimo-cap');
    const capMaxLabel = document.getElementById('production-aniimo-cap-max');
    if (capMaxLabel) {
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        capMaxLabel.textContent = isVi ? `/ ${max} tối đa` : `/ ${max} max`;
    }
    if (capInput) {
        capInput.max = String(max);
        const saved = localStorage.getItem('aniimax_production_aniimo_cap');
        if (saved !== null) {
            const parsed = parseInt(saved, 10);
            if (!isNaN(parsed) && parsed > 0) {
                capInput.value = String(Math.min(parsed, max));
                return;
            }
        }
        const defaultCap = Math.min(26, max);
        capInput.value = String(defaultCap);
    }
}

export function attachProductionAniimoCapHandlers() {
    const capInput = document.getElementById('production-aniimo-cap');
    if (capInput) {
        capInput.addEventListener('change', () => {
            const homeLevel = selectedHomeLevel();
            const max = ANIIMO_MAX[homeLevel - 1] || 36;
            let val = parseInt(capInput.value, 10);
            if (isNaN(val) || val < 1) val = 1;
            if (val > max) val = max;
            capInput.value = String(val);
            localStorage.setItem('aniimax_production_aniimo_cap', String(val));
            if (lastPlan) renderAniimoSummary(lastPlan);
        });
        capInput.addEventListener('input', () => {
            const val = parseInt(capInput.value, 10);
            if (!isNaN(val) && val > 0) {
                localStorage.setItem('aniimax_production_aniimo_cap', String(val));
            }
        });
    }
}

export function getGeneratorCapacity() {
    const homeLevel = selectedHomeLevel();
    const el = document.getElementById('simple-generator-capacity');
    const val = el ? parseInt(el.value, 10) : 0;
    if (!isNaN(val) && val > 0) return val;
    return GENERATOR_WATTS_BY_HOME_LEVEL[homeLevel] || DEFAULT_GENERATOR_WATTS;
}

export function getTargetEmodeWatts(generatorCapacity = getGeneratorCapacity(), powerRate = getPowerGridRate()) {
    return calculateTargetEmodeWatts(generatorCapacity, powerRate);
}

// Canonical power pole count: reads from canonical power profile according to RV / module
// RV 12-14: 1 pole (600W / 800W)
// RV 15: 2 poles (1600W) - confirmed by anh Phú
// RV 16-17: 2 poles (2000W)
// RV 18-20: 3 poles (3600W / 4500W provisional)
export function getPowerPoleCount(homeLevelOrCapacity = null) {
    const homeLevel = selectedHomeLevel();
    if (homeLevel < 12) return 0;

    if (typeof homeLevelOrCapacity === 'number') {
        if (homeLevelOrCapacity <= 20) {
            return getPowerProfile(homeLevelOrCapacity).poleCount;
        }
        if (homeLevelOrCapacity >= 3600) return 3;
        if (homeLevelOrCapacity >= 1600) return 2;
        return 1;
    }

    const el = document.getElementById('simple-generator-capacity');
    const val = el ? parseInt(el.value, 10) : 0;
    if (!isNaN(val) && val > 0) {
        if (val >= 3600) return 3;
        if (val >= 1600) return 2;
        return 1;
    }
    return getPowerProfile(homeLevel).poleCount;
}


// =========================================================================
// TWO-TIER SOLVER: INTERACTIVE WORKSHEET STATE & INVARIANT GUARDS
// =========================================================================
let facilityOverrides = [];
let fastResolveDebounceTimer = null;

export function getFacilityOverrides() {
    return facilityOverrides;
}

export function resetFacilityOverrides() {
    facilityOverrides = [];
}

export function getOwnedFacilityCounts() {
    const counts = {};
    if (!isSimpleMode() && typeof facilityTiers === 'object' && facilityTiers && Object.keys(facilityTiers).length > 0) {
        for (const [fac, tiers] of Object.entries(facilityTiers)) {
            counts[fac] = (tiers || []).reduce((sum, t) => sum + (t.count || 0), 0);
        }
    } else {
        const homeLevel = selectedHomeLevel();
        const { facilities } = simpleSetup(homeLevel);
        for (const [fac, tiers] of Object.entries(facilities)) {
            counts[fac] = (tiers || []).reduce((sum, t) => sum + (t.count || 0), 0);
        }
    }
    return counts;
}

window.resetWorksheetOverrides = function() {
    facilityOverrides = [];
    lastEmodeCounts = {};
    const badge = document.getElementById('fast-resolve-benchmark-badge');
    if (badge) badge.style.display = 'none';
    const resetBtn = document.getElementById('btn-reset-overrides');
    if (resetBtn) resetBtn.style.display = 'none';
    runFindPlan();
};

export function getSpecialistQuotas() {
    return emodeSettingsController.getSpecialistQuotas();
}

export function validateInvariants(facility, targetMode, stepCount) {
    const generatorCapacity = getGeneratorCapacity();
    const chosenRate = getPowerGridRate();
    const maxWatts = getTargetEmodeWatts(generatorCapacity, chosenRate);

    if (targetMode === 'electric') {
        const singleUnitWatts = FACILITY_POWER_WATTS[facility] || 0;
        if (singleUnitWatts * stepCount > maxWatts) {
            return {
                valid: false,
                reason: `Cơ sở này cần ${singleUnitWatts * stepCount}W, vượt quá toàn bộ công suất lưới điện (${maxWatts}W)!`
            };
        }
    }

    return { valid: true };
}

export function getFacilityLevel(baseFac) {
    const inputFacs = lastPlanInput?.facilities || (typeof getPlanInputValues === 'function' ? getPlanInputValues()?.facilities : null);
    if (inputFacs && inputFacs[baseFac]) {
        const activeTiers = inputFacs[baseFac].filter(t => (t.count || 0) > 0);
        if (activeTiers.length > 0) {
            return Math.max(...activeTiers.map(t => t.level || 0));
        }
    }
    if (typeof facilityTiers === 'object' && facilityTiers && facilityTiers[baseFac]) {
        const tiers = facilityTiers[baseFac].filter(t => (t.count || 0) > 0);
        if (tiers.length > 0) {
            return Math.max(...tiers.map(t => t.level || 0));
        }
    }
    const homeLevel = selectedHomeLevel();
    const { facilities } = simpleSetup(homeLevel);
    if (facilities && facilities[baseFac] && facilities[baseFac].length > 0) {
        return Math.max(...facilities[baseFac].map(t => t.level || 0));
    }
    return 1;
}

export function defaultEmodeBaseTime(workload) {
    if (workload <= 45) return 27;
    if (workload <= 90) return 54;
    if (workload <= 180) return 108;
    if (workload <= 250) return 162;
    if (workload <= 350) return 216;
    if (workload <= 450) return 270;
    if (workload <= 600) return 378;
    return Math.round(workload / 1.5 / 27) * 27;
}

export function calculateWorkerSpeed(workerLevel, reqLevel = 1, isGathering = false, hasPersonality = true) {
    const required = Math.max(1, reqLevel);
    const level = Math.max(required, workerLevel);
    const above = level - required;
    let baseSpeed = 1.0;
    if (isGathering) {
        const baseWorkRate = required === 1 ? 1.0 : (required === 2 ? 1.25 : 1.5);
        baseSpeed = 1.0 + (0.5 * above) / baseWorkRate;
    } else {
        baseSpeed = above === 0 ? 1.0 : (2.0 + above);
    }
    if (hasPersonality) {
        baseSpeed *= 1.2;
    }
    return baseSpeed;
}

const worksheetModeController = createWorksheetModeController({
    facilities: FACILITIES,
    residentFacilities: { has: name => RESIDENT_FACILITIES.has(name) },
    getPlan: () => lastPlan,
    setPlan: value => {
        lastPlan = value;
        const setup = selectedAniimoSetup();
        if (plansBySetup[setup]) plansBySetup[setup] = value;
    },
    getEmodeCounts: () => lastEmodeCounts,
    setEmodeCounts: value => { lastEmodeCounts = value; },
    getOverrides: () => facilityOverrides,
    setOverrides: value => { facilityOverrides = value; },
    getHomeLevel: selectedHomeLevel,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    getSpecialistQuotas,
    getFacilityLevel,
    calculatePowerWatts,
    updatePowerGauge,
    getRecipeMap: () => (window.ALL_RECIPES_MAP || null),
    showSelectedPlan,
    showInvariantWarning,
    setButtonMode: (button, mode) => {
        if (!button?.parentElement) return;
        button.parentElement.querySelectorAll('.mode-pill').forEach(pill => pill.classList.remove('active'));
        const selector = mode === 'prismana' || mode === 'specialist' ? '.pill-specialist'
            : (mode === 'electric' ? '.pill-electric' : '.pill-manual');
        const target = button.parentElement.querySelector(selector);
        if (target) target.classList.add('active');
    },
    setResetButtonVisible: visible => {
        const button = document.getElementById('btn-reset-overrides');
        if (button) button.style.display = visible ? 'inline-flex' : 'none';
    },
    isVietnamese: () => window.i18n && window.i18n.getLang() === 'vi',
    alert: message => window.alert(message),
    logError: (...args) => console.warn(...args),
});
window.onWorksheetModeClick = worksheetModeController.onWorksheetModeClick;

function worksheetOverridesFromLines(lines) {
    return buildWorksheetOverridesFromLines(lines, {
        facilities: FACILITIES,
        residentFacilities: RESIDENT_FACILITIES,
        getFacilityLevel
    });
}

const fastResolveController = createFastResolveController({
    buildInput: buildStrategyPlanInput,
    getLastPlanInput: () => lastPlanInput,
    getEmodeCounts: () => lastEmodeCounts,
    getLastPlan: () => lastPlan,
    getFacilityOverrides,
    getSelectedSetup: selectedAniimoSetup,
    getBestSetup: bestAniimoSetup,
    getWorksheetLines: worksheetFixedPlanLines,
    buildWorksheetOverrides: worksheetOverridesFromLines,
    getFacilityLevel,
    getAniimoInput: aniimoInput,
    solveWorker: callWorker,
    now: () => performance.now(),
    integrateSeasonPlan,
    normalizePlanFacilityCounts,
    setPlanForSetup: (setup, plan) => { plansBySetup[setup] = plan; },
    setLastPlan: plan => { lastPlan = plan; },
    setEmodeCounts: counts => { lastEmodeCounts = counts; },
    actualEmodeCounts,
    showSelectedPlan,
    updatePowerGauge,
    document,
    setLastError: error => { window.__lastFastResolveError = error; },
    warn: (...args) => console.warn(...args),
    logError: (...args) => console.error(...args),
});

export async function runFastReSolve(fixedLayout = false) {
    return fastResolveController.runFastReSolve(fixedLayout);
}

function showInvariantWarning(facility, reason) {
    const alertId = `invariant-warn-${facility}`;
    let el = document.getElementById(alertId);
    if (!el) {
        const row = document.querySelector(`.mode-selector-pills[data-fac="${facility}"]`);
        if (row) {
            el = document.createElement('span');
            el.id = alertId;
            el.className = 'invariant-warning-badge';
            row.parentNode.appendChild(el);
        }
    }
    if (el) {
        el.textContent = `⚠ ${reason}`;
        el.style.display = 'inline-block';
        setTimeout(() => {
            el.style.display = 'none';
        }, 3000);
    }
}

// --- Facility Partitioning Modal Logic ---
const facilityPartitionDialogController = createFacilityPartitionDialogController({
    document,
    window,
    getPlan: () => lastPlan,
    getEmodeCounts: () => lastEmodeCounts,
    getOverrides: () => facilityOverrides,
    setEmodeCounts: counts => { lastEmodeCounts = counts; },
    setOverrides: overrides => { facilityOverrides = overrides; },
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
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
    facilities: FACILITIES,
    facilityPowerWatts: FACILITY_POWER_WATTS,
});
facilityPartitionDialogController.attachGlobal();

export function updateSpecialistQuotasLimits(homeLevel = selectedHomeLevel()) {
    return emodeSettingsController.updateSpecialistQuotasLimits(homeLevel);
}

function attachSpecialistQuotaHandlers() {
    return emodeSettingsController.attachSpecialistQuotaHandlers();
}

export function estimateFacilityMarginalValue(facility, level, basePlan, options = {}) {
    return estimateFacilityMarginalValuePolicy(facility, level, basePlan, {
        ...options,
        powerGridRate: options.powerGridRate ?? getPowerGridRate(),
        facilities: options.facilities || facilityTiers,
    });
}

export function allocateDynamicEmode(basePlan, homeLevel, maxWatts = getTargetEmodeWatts(), options = {}) {
    const facilities = options.facilities || (
        isSimpleMode()
            ? simpleSetup(homeLevel).facilities
            : (Object.keys(facilityTiers).length > 0 ? facilityTiers : simpleSetup(homeLevel).facilities)
    );
    return allocateDynamicEmodePolicy(basePlan, homeLevel, maxWatts, {
        ...options,
        facilities,
        overrides: options.overrides ?? facilityOverrides,
        specialist_quotas: options.specialist_quotas ?? getSpecialistQuotas(),
        powerGridRate: options.powerGridRate ?? getPowerGridRate(),
    });
}

export function autoAllocateEmode(homeLevel, maxWatts = getTargetEmodeWatts(), activeProducingCounts = null) {
    return autoAllocateEmodePolicy(homeLevel, maxWatts, activeProducingCounts, {
        facilities: simpleSetup(homeLevel).facilities,
        specialist_quotas: getSpecialistQuotas(),
    });
}

let lastEmodeCounts = {};

function activeEmodeFacilityCounts(activeProducingCounts = null) {
    return emodeSettingsController.getActiveEmodeFacilityCounts(activeProducingCounts);
}

function activeEmodeFacilities(activeProducingCounts = null) {
    return emodeSettingsController.getActiveEmodeFacilities(activeProducingCounts);
}

export function calculatePowerWatts(counts, homeLevel = null) {
    const rv = homeLevel || (typeof selectedHomeLevel === 'function' ? selectedHomeLevel() : 16);
    return sumPowerWatts(counts, rv, getFacilityUnitWatts);
}

// The allocator may reserve watts for owned machines the final plan never runs in E-mode
// (leftover-budget loop, pruning, or the re-solve keeping them manual). The gauge must show
// only machines the final plan actually shows as E-mode.
export function actualEmodeCounts(plan) {
    return countActualEmodeUnits(plan, selectedHomeLevel());
}

const powerGaugeController = createPowerGaugeController({
    document,
    facilityPowerWatts: FACILITY_POWER_WATTS,
    getGeneratorCapacity,
    getTargetEmodeWatts,
    calculatePowerWatts,
});

function updatePowerGauge(customCounts = null) {
    return powerGaugeController.updatePowerGauge(customCounts, lastEmodeCounts);
}

export function getPowerGridRate() {
    return powerGaugeController.getPowerGridRate();
}

const facilitySetupController = createFacilitySetupController({
    document,
    window,
    facilities: FACILITIES,
    categories: FACILITY_CATEGORIES,
    emodeFacilities,
    getFacilityTiers: () => facilityTiers,
    setFacilityTiers: val => { facilityTiers = val; },
    getFacilityDisplayName,
    saveInputsToStorage,
    runFindPlan,
    numberOrDefault,
});

function defaultFacilityTiers() {
    return facilitySetupController.defaultFacilityTiers();
}

function renderTierRows(name) {
    return facilitySetupController.renderTierRows(name);
}

function renderFacilityCards() {
    return facilitySetupController.renderFacilityCards();
}

function initFacilityTiers(data) {
    return facilitySetupController.initFacilityTiers(data);
}

function attachFacilityTierHandlers() {
    return facilitySetupController.attachFacilityTierHandlers();
}

const emodeSettingsController = createEmodeSettingsController({
    document,
    facilities: FACILITIES,
    priority: EMODE_PRIORITY,
    facilityPowerWatts: FACILITY_POWER_WATTS,
    getFacilityTiers: () => facilityTiers,
    emodeFacilities,
    getTargetEmodeWatts,
    updatePowerGauge,
    saveInputsToStorage,
    getHomeLevel: selectedHomeLevel,
    getDefaultGeneratorWatts: level => GENERATOR_WATTS_BY_HOME_LEVEL[level] || DEFAULT_GENERATOR_WATTS,
    getEmodeCounts: () => lastEmodeCounts,
    setEmodeCounts: value => { lastEmodeCounts = value; },
    getFacilityOverrides: () => facilityOverrides,
    setFacilityOverrides: value => { facilityOverrides = value; },
    getSimpleSetup: simpleSetup,
    autoAllocateEmode,
});

function attachEmodeHandlers() {
    emodeSettingsController.attachEmodeHandlers();
}

function updateSimpleEmodeState() {
    emodeSettingsController.updateSimpleEmodeState();
}

// --- Local persistence -----------------------------------------------------------------
// Saves/restores form inputs via localStorage so values survive a page reload. Purely
// client-side (no account, no server); works identically on localhost and once this is
// hosted on GitHub Pages, since localStorage is scoped to the page's own origin.
// True once the player has picked a rate unit themselves this visit. Until then a fresh plan
// picks the unit it reads best at; after it, their choice stands.
let rateUnitChosen = false;

function readStorage() {
    return readSavedConfig({
        storage: localStorage,
        onError: error => console.warn('Could not load saved inputs from localStorage:', error),
    });
}

function saveInputsToStorage() {
    const state = {
        facilityTiers,
        levelUpStock,
        skippedRecipes: [...recipeFilterController.getSkippedRecipes()],
        unlockedSpecial: [...unlockedSpecial],
        priorities: priorityOrder,
        aniimoLevels: aniimoSetupUIController.getAniimoLevels(),
        roster: rosterUIController.getRoster(),
        emodeFacilities: [...emodeFacilities],
        seasonRadishPlots,
        seasonPepperPlots,
        selectedSeasonDishes: [...selectedSeasonDishes],
    };
    const data = buildSavedConfig(state, { document, seasonExpired: isSeasonExpired() });
    persistSavedConfig({
        storage: localStorage,
        key: STORAGE_KEY,
        data,
        onError: error => console.warn('Could not save inputs to localStorage:', error),
    });
}

function loadInputsFromStorage(data) {
    if (!data) return;
    const restored = restoreSavedState(data, {
        abilityNames: ABILITY_BY_NAME,
        priorityTargets: RV20_PRIORITY_TARGETS,
        personalityPairs: PERSONALITY_PAIRS,
    });
    if ('seasonRadishPlots' in restored) seasonRadishPlots = restored.seasonRadishPlots;
    if ('seasonPepperPlots' in restored) seasonPepperPlots = restored.seasonPepperPlots;
    if ('selectedSeasonDishes' in restored) selectedSeasonDishes = new Set(restored.selectedSeasonDishes);
    if ('emodeFacilities' in restored) {
        emodeFacilities = new Set(restored.emodeFacilities);
        document.querySelectorAll('.facility-emode-checkbox').forEach(cb => {
            cb.checked = emodeFacilities.has(cb.dataset.facility);
        });
    }
    if ('levelUpStock' in restored) levelUpStock = restored.levelUpStock;
    if ('skippedRecipes' in restored) recipeFilterController.setSkippedRecipes(restored.skippedRecipes);
    if ('unlockedSpecial' in restored) unlockedSpecial = new Set(restored.unlockedSpecial);
    if (isSeasonExpired()) {
        data['season-on'] = false;
        const seasonToggle = document.getElementById('season-on');
        if (seasonToggle) seasonToggle.checked = false;
    }
    priorityOrder = restored.priorities;
    if ('aniimoLevels' in restored) aniimoSetupUIController.setAniimoLevels(restored.aniimoLevels);
    if ('roster' in restored) rosterUIController.setRoster(restored.roster);
    applySavedFields(data, { document });
    if (isSeasonExpired()) {
        const seasonToggle = document.getElementById('season-on');
        if (seasonToggle) seasonToggle.checked = false;
    }
    levelUpTargetChosen = 'level-up-target' in data;
    updatePowerGauge();
}
// Auto-save on every change to a persisted static field (facility tier inputs save themselves;
// see `attachFacilityTierHandlers`).
function attachAutoSave() {
    attachPersistedFieldAutosave({ document, save: saveInputsToStorage });
}

function clearSavedInputs() {
    const confirmMsg = window.i18n ? window.i18n.t('clear_saved_confirm') : 'Are you sure you want to reset all saved inputs to default?';
    if (!confirm(confirmMsg)) return;
    removeSavedConfig({
        storage: localStorage,
        key: STORAGE_KEY,
        onError: error => console.warn('Could not clear saved inputs from localStorage:', error),
    });
    window.location.reload();
}

// Initialize the worker and its wasm module.
async function initWasm() {
    try {
        initWorker();
        const version = await callWorker('get_version');
        wasmReady = true;
        window.wasmReady = true;

        const verEl = document.getElementById('version'); if (verEl) { verEl.textContent = version; }
        loadRecipeIndex();

        console.log(`AniimoLab v${version} loaded successfully`);
    } catch (error) {
        console.error('Failed to initialize WASM:', error);
        showError('Failed to load the optimizer. Please refresh the page.');
    }
}

// --- Simple / advanced mode -----------------------------------------------------------
// Simple mode takes just the RV (Homeland) level and assumes everything that level allows is built
// and upgraded (see `simpleSetup` in facility-config.js). Advanced mode is the full per-facility
// input. Switching modes never overwrites the advanced inputs; "Fill from RV level" copies a
// simple setup into them on purpose.

function isSimpleMode() {
    return true;
}

function selectedHomeLevel() {
    return numberOrDefault(document.getElementById('home-level')?.value, MAX_HOME_LEVEL);
}
if (typeof window !== 'undefined') {
    window.selectedHomeLevel = selectedHomeLevel;
}

function populateHomeLevels() {
    const options = [];
    for (let level = 1; level <= MAX_HOME_LEVEL; level++) {
        options.push(`<option value="${level}">${level}${level === MAX_HOME_LEVEL ? ' (everything unlocked)' : ''}</option>`);
    }
    const select = document.getElementById('home-level');
    if (select) {
        select.innerHTML = options.join('');
        select.value = String(MAX_HOME_LEVEL);
    }
}

// One entry per built facility, e.g. "10 Farmland Lv.2".
function renderSimpleSummary() {
    const homeLevel = selectedHomeLevel();
    const { facilities, modules } = simpleSetup(homeLevel);
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const view = buildSimpleSummaryViewModel({
        facilityDefinitions: FACILITIES,
        facilities,
        modules,
        moduleUnlocks: {
        power_module: [12, 14, 16, 18, 20],
        plant_research_module: [6, 9, 12, 15],
        incubation_reaction_module: [9],
        signal_emitter: [6, 11, 16],
        },
        moduleNames: ['Ecological Module', 'Kitchen Module', 'Resource Detector', 'Crafting Module', 'power_module', 'plant_research_module', 'incubation_reaction_module', 'signal_emitter'],
        homeLevel,
        isVietnamese: isVi,
        getFacilityDisplayName,
        getModuleDisplayName,
    });
    const titleEl = document.getElementById('simple-summary-title');
    if (titleEl) titleEl.textContent = view.title;
    const sumEl = document.getElementById('simple-summary');
    if (sumEl) sumEl.innerHTML = view.html;
}

// Whether the player has picked Advanced mode's level-up target; until then it follows the RV
// level the facilities came from.
let levelUpTargetChosen = false;

function followLevelUpTarget(homeLevel) {
    const select = document.getElementById('level-up-target');
    if (select && [...select.options].some(o => o.value === String(homeLevel + 1))) select.value = String(homeLevel + 1);
}

function applyConfigMode() {
    renderSimpleSummary();
    renderStrategy();
    updatePowerGauge();
}

function attachModeHandlers() {
    createHomeLevelController({
        document,
        getHomeLevel: selectedHomeLevel,
        renderSimpleSummary,
        renderStrategy,
        updateProductionAniimoCap,
        updateSimpleEmodeState,
        updateSpecialistQuotasLimits,
        renderSpecialRecipes,
        updatePowerGauge,
        getLastPlan: () => lastPlan,
        displayPlan,
    }).attach();
}

// --- Special recipes -------------------------------------------------------------------
// Recipes unlocked with a rare currency (see `SPECIAL_RECIPES`): left out of plans unless ticked.

let unlockedSpecial = new Set();
const SPECIAL_NAMES = new Set(SPECIAL_RECIPES.map(r => r.name));

function renderSpecialRecipes() {
    const grid = document.getElementById('special-grid');
    if (!grid) return;
    const options = {
        recipes: SPECIAL_RECIPES,
        selectedNames: unlockedSpecial,
        currentRv: selectedHomeLevel(),
        selectedPlanNames: lastPlan?.selected_special_recipes || [],
        planSucceeded: Boolean(lastPlan && lastPlan.success),
        isVietnamese: window.i18n && window.i18n.getLang() === 'vi',
        getItemDisplayName,
        getFacilityDisplayName,
        renderItemIcon,
        renderFacilityIcon,
    };
    const view = buildSpecialRecipeViewModel(options);
    for (const name of view.lockedSelections) unlockedSpecial.delete(name);
    grid.innerHTML = view.lockedSelections.length ? buildSpecialRecipeViewModel(options).html : view.html;
    renderRecipeCount();
}

function attachSpecialHandlers() {
    createSpecialRecipeController({
        grid: document.getElementById('special-grid'),
        selectedNames: unlockedSpecial,
        renderRecipeCount,
        save: saveInputsToStorage,
    }).attach();
}

// --- Opportunities ---------------------------------------------------------------------
// After each plan, what the player could change to do better, best first: a locked recipe, an
// Aniimo a level higher, and in Advanced mode a module level or one more facility or facility
// level. Only changes within reach: Simple mode already has everything its RV level allows, and
// Advanced mode goes up to the lowest RV level that allows everything entered. Each change is
// solved in full in a worker of its own (see `rankImprovements` in worker.js), so planning never
// waits on it, and it's measured by what the plan leads with (see `rankMeasure`).

// Finished rankings by Aniimo setup, for the plan they were worked out from.
let rankingsBySetup = {};
// The ranking on screen: `{ setup, measure, homeLevel, candidates, base, results, done }`.
let ranking = null;

const MODULE_NAMES = {
    ecological_module: 'Ecological Module',
    kitchen_module: 'Kitchen Module',
    resource_detector: 'Resource Detector',
    crafting_module: 'Crafting Module',
};

function stopRanking() {
    rankingWorkerController.stop();
}

// How many workers share the ranking: up to six, leaving cores for the page, the plan's own worker
// and the layout's.
const RANK_WORKERS = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 2) - 3));
const rankingWorkerController = createImprovementRankingController({
    WorkerImpl: Worker,
    workerUrl: WORKER_URL,
    workerCount: RANK_WORKERS,
});

// What a change is measured by: level-up time for a level-up plan that can be worked toward,
// else the first ranked priority, else Home Coins.
function rankMeasure() {
    if (planContext?.levelUp && !planContext.unavailable && !planContext.ready) return 'level_up';
    return (lastPlanInput?.priorities || [])[0] || 'coins';
}

// How many of a facility `tiers` hold, and the highest level among them.
const tierCount = tiers => (tiers || []).reduce((sum, t) => sum + t.count, 0);
const tierLevel = tiers => Math.max(0, ...(tiers || []).filter(t => t.count > 0).map(t => t.level));

// The lowest RV level whose facilities and modules cover everything in `input`, for Advanced
// mode, where the player enters what they have rather than their RV level.
const improvementCandidateBuilder = createImprovementCandidateBuilder({
    maxHomeLevel: MAX_HOME_LEVEL,
    facilities: FACILITIES,
    specialRecipes: SPECIAL_RECIPES,
    seasonRecipeNotes: SEASON.recipeNotes,
    moduleNames: MODULE_NAMES,
    simpleSetup,
    getPlanContext: () => planContext,
    getSkippedRecipes: () => recipeFilterController.getSkippedRecipes(),
    getRoster: () => rosterUIController.getRoster(),
    getRosterLabel: (...args) => rosterLabel(...args),
    getLevelledAbilities: levelledAbilities,
    defaultLevelFor: ability => defaultLevelFor(ability),
    prettyItem,
    escapeText: value => escapeText(value),
});
const { homeLevelCovering, improvementCandidates } = improvementCandidateBuilder;
function rankImprovementsFor(setup) {
    stopRanking();
    if (!document.getElementById('improve-card')) return;
    if (!lastPlanInput) return;
    if (rankingsBySetup[setup]) {
        ranking = rankingsBySetup[setup];
        renderImprovements();
        setStep('improve', 'done', `${ranking.candidates.length} changes`);
        return;
    }
    setStep('improve', 'start');
    const base = { ...lastPlanInput, ...aniimoInput(setup) };
    const measure = rankMeasure();
    const candidates = improvementCandidates(base, setup);
    ranking = {
        setup, measure, candidates, base: null, results: [], done: false,
        homeLevel: planContext?.simple ? null : homeLevelCovering(base),
    };
    renderImprovements();
    if (candidates.length === 0) {
        ranking.done = true;
        rankingsBySetup[setup] = ranking;
        renderImprovements();
        setStep('improve', 'done', 'nothing to check');
        return;
    }
    const current = ranking;
    rankingWorkerController.start({
        measure,
        base,
        candidates,
        baseTop: plansBySetup[setup]?.measure_top,
        onProgress: (result, candidateIndex) => {
            if (candidateIndex == null) current.base ||= result;
            else current.results[candidateIndex] = result;
            setStep('improve', 'start', `${current.results.filter(Boolean).length} of ${candidates.length}`);
            if (ranking === current) renderImprovements();
        },
        onError: error => console.warn('Ranking changes failed:', typeof error === 'string' ? error : error?.message || error),
        onComplete: failed => {
            current.done = true;
            if (!failed) rankingsBySetup[setup] = current;
            setStep('improve', failed ? 'fail' : 'done', `${candidates.length} changes`);
            if (ranking === current) renderImprovements();
        },
    });
}

// The smallest gain worth showing (see `RANK_MIN_GAIN` in worker.js).
const RANK_MIN_GAIN = 1e-3;

// How a change compares with the plan, or null if it doesn't help: `{ score, text }`, with
// `score` ordering changes that move the measure ahead of those that only earn more Home Coins.
function improvementGain(result) {
    return calculateImprovementGain({
        result,
        base: ranking?.base,
        measure: ranking?.measure,
        aniipod: planContext?.aniipod,
        unit: RATE_UNIT_SECONDS[document.getElementById('rate-unit').value] || RATE_UNIT_SECONDS.second,
        rankMinGain: RANK_MIN_GAIN,
        paceUnitSeconds: PACE_UNIT_SECONDS,
        formatters: { formatDuration, formatRate, formatPercent, priorityLabel },
    });
}

const PACE_UNIT_SECONDS = 86400;

function formatPercent(share) {
    const percent = share * 100;
    return `${percent >= 10 ? Math.round(percent) : percent.toFixed(1)}%`;
}

function renderImprovements() {
    const card = document.getElementById('improve-card');
    if (!card) return;
    if (!ranking || !lastPlan?.success) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'block';
    const model = buildImprovementRankingViewModel({
        ranking,
        getGain: improvementGain,
        rankMinGain: RANK_MIN_GAIN,
        priorityLabel: measure => priorityLabel(measure, planContext?.aniipod),
    });
    const open = !!document.querySelector('#improve-list .improve-checked')?.open;
    document.getElementById('improve-list').innerHTML = buildImprovementRankingMarkup({ model, open });
}
// --- Homeland layout & Environment constants -----------------------------------------
const ENVIRONMENT_FACILITY_COLORS = {
    'Farmland': '#8b5e34',
    'Woodland': '#4caf50',
    'Starfall Hammock': '#42a5f5',
    'Tidewhisper Sandcastle': '#26c6da',
    'Floral Windmill': '#ab47bc',
    'Dewy House': '#ef8a80',
};
const ENVIRONMENT_BUILDING_SIZES = { 'Heat Furnace': 1.0, 'Cooling Unit': 2.0, 'Sunlamp': 1.0 };
const DEFAULT_ENVIRONMENT_BUILDING_SIZE = 2.0;
const environmentBuildingSize = name => ENVIRONMENT_BUILDING_SIZES[name] ?? DEFAULT_ENVIRONMENT_BUILDING_SIZE;
const ENVIRONMENT_COVERAGE_RADIUS = 4.5;
const ENVIRONMENT_MODE_SHADE = { Adequate: 0.55 };
const ENVIRONMENT_MODE_COLORS = {
    Warm: '#f59e0b',
    Scorching: '#ef4444',
    Cool: '#67e8f9',
    Freeze: '#2563eb',
    Adequate: '#facc15',
};
const ENVIRONMENT_MODE_ORDER = ['Warm', 'Scorching', 'Cool', 'Freeze', 'Adequate'];

const homelandUIController = createHomelandUIController({
    document,
    window,
    IntersectionObserver: typeof IntersectionObserver !== 'undefined' ? IntersectionObserver : class { observe() {} disconnect() {} },
    requestAnimationFrame: typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame : (cb => setTimeout(cb, 16)),
    cancelAnimationFrame: typeof cancelAnimationFrame !== 'undefined' ? cancelAnimationFrame : (id => clearTimeout(id)),
    createWorker: url => new Worker(url, { type: 'module' }),
    workerUrl: WORKER_URL,
    homelandPlots: HOMELAND_PLOTS,
    homelandPlotSize: HOMELAND_PLOT_SIZE,
    facilityFootprints: FACILITY_FOOTPRINTS,
    facilityPowerWatts: FACILITY_POWER_WATTS,
    environmentModeOrder: ENVIRONMENT_MODE_ORDER,
    environmentModeColors: ENVIRONMENT_MODE_COLORS,
    environmentModeShade: ENVIRONMENT_MODE_SHADE,
    environmentCoverageRadius: ENVIRONMENT_COVERAGE_RADIUS,
    layoutDistricts: LAYOUT_DISTRICTS,
    getLastPlan: () => lastPlan,
    getLastPlanInput: () => lastPlanInput,
    isSimpleMode,
    selectedHomeLevel,
    homeLevelCovering: input => homeLevelCovering(input),
    getPowerPoleCount,
    isEmodeActive: () => (document.getElementById('emode-simple-on')?.checked ?? true) || !!document.getElementById('emode-on')?.checked,
    getRecipes: () => recipeFilterController.getRecipeIndex(),
    environmentBuildingSize: name => environmentBuildingSize(name),
    simpleSetup,
    getFacilityDistrict,
    getFacilityDisplayName,
    getModeDisplayName,
    prettyItem,
    formatRate,
    formatNumber,
    tipAttrs,
    renderHomelandSvgFacility,
    getFacilityIconUrl,
    setStep: (step, status) => setStep(step, status),
});

function renderHomelandLayout(plan) { return homelandUIController.renderHomelandLayout(plan); }
function stopLayout() { homelandUIController.stopLayout(); }
function homelandPieces(plan, input) { return homelandUIController.homelandPieces(plan, input); }
function homelandPlots() { return homelandUIController.homelandPlots(); }
// --- Progress card ---------------------------------------------------------------------
// Under the button, every step of working out a plan in the order it runs, each with a spinner
// while it runs and its time once done: the solves in the worker (see `exactPlanJson` in
// worker.js), then the layout, the opportunities and the Minimum team.

const progressController = createProgressController({
    document,
    window,
    getPlanRunId: () => planRunId,
    getPlanContext: () => planContext,
    priorityLabel: (target, aniipod) => priorityLabel(target, aniipod),
});

function startProgress(input, runId) {
    return progressController.startProgress(input, runId);
}

function setStep(key, state, detail, proven) {
    return progressController.setStep(key, state, detail, proven);
}

function finishSolveSteps() {
    return progressController.finishSolveSteps();
}

function renderProgress() {
    return progressController.renderProgress();
}

// --- My Aniimo -------------------------------------------------------------------------
// The Aniimo the player actually has, card by card (see `Crew` in models.rs): each card's homeland
// abilities with their levels, its four personalities (one from each pair) and how many are alike.
// The plan shares their hours out, so one level-4 Earth Aniimo covers what it can and no more.

const rosterUIController = createRosterUIController({
    document,
    window,
    facilities: FACILITIES,
    abilities: ABILITIES,
    personalityPairs: PERSONALITY_PAIRS,
    environmentBuildingAbility: ENVIRONMENT_BUILDING_ABILITY,
    personalityLetter,
    abilityTag,
    escapeText,
    prettyItem,
    getRecipeIndex: () => recipeFilterController.getRecipeIndex(),
    saveInputsToStorage: () => saveInputsToStorage(),
    switchAniimoSetup: () => switchAniimoSetup(),
    setTimeoutFn: setTimeout,
    clearTimeoutFn: clearTimeout,
});

function newRosterAniimo(abilities = {}, personalities = null) { return rosterUIController.newRosterAniimo(abilities, personalities); }
function rosterPayload() { return rosterUIController.rosterPayload(); }
function rosterLabel(aniimo, i) { return rosterUIController.rosterLabel(aniimo, i); }
function renderRoster() { rosterUIController.renderRoster(); }
function showRosterShortfall() { rosterUIController.showRosterShortfall(); }
function showSetupOnly() { rosterUIController.showSetupOnly(); }
function rosterChanged(rerender = true) { rosterUIController.rosterChanged(rerender); }
function attachRosterHandlers() { rosterUIController.attachRosterHandlers(); }
export function renderRosterSummary(plan, options = {}) { return rosterUIController.renderRosterSummary(plan, options); }

// --- Season (Lễ hội Trung Thu / Harvest Moon Festival) -------------------------------------
// Mốc kết thúc sự kiện Trăng Mùa Gặt: 03:00 28/10/2026 GMT+7 (20:00 UTC 27/10/2026)
export const HARVEST_MOON_END = new Date('2026-10-27T20:00:00Z').getTime();

export function isSeasonExpired() {
    return Date.now() >= HARVEST_MOON_END;
}

export function getSeasonRemaining() {
    const diff = HARVEST_MOON_END - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return { days, hours, minutes, totalMs: diff };
}

export function updateSeasonTitleCountdown() {
    const titleEl = document.getElementById('season-title-text') || document.querySelector('.season-title');
    if (!titleEl) return;
    if (isSeasonExpired()) {
        renderSeason();
        return;
    }

    const rem = getSeasonRemaining();
    if (!rem) return;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const deadline = isVi ? '03:00 28/10/2026' : '03:00 Oct 28, 2026';
    let timeStr = '';
    if (rem.days > 0) {
        timeStr = isVi ? `còn ${rem.days} ngày ${rem.hours} giờ` : `${rem.days}d ${rem.hours}h left`;
    } else if (rem.hours > 0) {
        timeStr = isVi ? `còn ${rem.hours} giờ ${rem.minutes} phút` : `${rem.hours}h ${rem.minutes}m left`;
    } else {
        timeStr = isVi ? `còn ${rem.minutes} phút` : `${rem.minutes}m left`;
    }
    const baseTitle = isVi ? 'Sự kiện Trăng Mùa Gặt' : 'Harvest Moon Festival';
    titleEl.textContent = `${baseTitle} (Kết thúc: ${deadline} · ${timeStr})`;
}

let seasonRadishPlots = 2;
let seasonPepperPlots = 2;
let selectedSeasonDishes = new Set(SEASON_RECIPES.map(r => r.name));

function seasonAvailable() {
    if (isSeasonExpired()) return false;
    return !isSimpleMode() || selectedHomeLevel() >= SEASON.minHomeLevel;
}

function seasonActive() {
    return seasonAvailable() && document.getElementById('season-on')?.checked;
}

const seasonController = createSeasonController({
    document,
    recipes: SEASON_RECIPES,
    getPlots: () => ({ radish: seasonRadishPlots, pepper: seasonPepperPlots }),
    setPlot: (crop, value) => {
        if (crop === 'radish') seasonRadishPlots = value;
        else seasonPepperPlots = value;
    },
    getSelectedDishes: () => selectedSeasonDishes,
    setDishSelected: (name, selected) => selected ? selectedSeasonDishes.add(name) : selectedSeasonDishes.delete(name),
    isSeasonAvailable: seasonAvailable,
    isSeasonActive: seasonActive,
    getHomeLevel: selectedHomeLevel,
    simpleSetup,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
    updateTitleCountdown: updateSeasonTitleCountdown,
    renderItemIcon,
    getItemDisplayName,
    getFacilityDisplayName,
    renderStrategy,
    saveInputsToStorage,
});

function updateSeasonPlotsSummary() { seasonController.updatePlotsSummary(); }
function renderSeason() { seasonController.render(); }
function attachSeasonHandlers() { seasonController.attachHandlers(); }

const recipeFilterController = createRecipeFilterController({
    document,
    window,
    callWorker,
    specialRecipes: SPECIAL_RECIPES,
    seasonRecipes: SEASON_RECIPES,
    aniipodTiers: ANIIPOD_TIERS,
    getUnlockedSpecial: () => unlockedSpecial,
    getSpecialNames: () => SPECIAL_NAMES,
    isSeasonActive: seasonActive,
    getSelectedSeasonDishes: () => selectedSeasonDishes,
    wantsAniipods,
    bestAniipod,
    prettyItem,
    escapeText,
    saveInputsToStorage: () => saveInputsToStorage(),
    runFindPlan: () => runFindPlan(),
});

function excludedRecipes() { return recipeFilterController.excludedRecipes(); }
function recipeLabel(recipe) { return recipeFilterController.recipeLabel(recipe); }
function loadRecipeIndex() { return recipeFilterController.loadRecipeIndex(); }
function renderRecipeCount() { recipeFilterController.renderRecipeCount(); }
function renderSkippedRecipes() { recipeFilterController.renderSkippedRecipes(); }
function setSkipped(name, skipped) { recipeFilterController.setSkipped(name, skipped); }
function attachSkipHandlers() { recipeFilterController.attachSkipHandlers(); }

// --- Strategy ----------------------------------------------------------------------------
// "Level up" plans the soonest next RV level-up (its coins plus Wood Blocks and Mineral Sand, or
// from RV 7 a Woodworking Bench item and a Chimney Kiln item, less what's already in stock);
// "Priorities" makes as much of each ticked priority as the ones above it allow.

// What the player has toward a level-up, by item name ('coins' for coins).
let levelUpStock = {};

const MAX_ANIIMO_LEVEL = 4;

const aniimoSetupUIController = createAniimoSetupUIController({
    document,
    window,
    facilities: FACILITIES,
    abilities: () => ABILITIES,
    maxAniimoLevel: MAX_ANIIMO_LEVEL,
    getWorkerForLevel,
    abilityTag,
    rosterPayload,
    saveInputsToStorage: () => saveInputsToStorage(),
    switchAniimoSetup: () => switchAniimoSetup(),
});

function levelledAbilities() {
    return aniimoSetupUIController.levelledAbilities();
}

function aniimoInput(setup) {
    return aniimoSetupUIController.aniimoInput(setup);
}

function bestAniimoLevel(ability) {
    return aniimoSetupUIController.bestAniimoLevel(ability);
}

function selectedSetupTab() {
    return aniimoSetupUIController.selectedSetupTab();
}

function levelPicker(group, chosen, ability, label) {
    return aniimoSetupUIController.levelPicker(group, chosen, ability, label);
}

function renderAbilityLevels() {
    return aniimoSetupUIController.renderAbilityLevels();
}

function showAniimoSetup() {
    return aniimoSetupUIController.showAniimoSetup();
}

function isLevelUpStrategy() {
    return !isRV20Endgame();
}

// End-game Strategy: Priorities for RV 20 in Simple Mode (Aniimax Style)
export const RV20_PRIORITY_TARGETS = [
    {
        id: 'aniipod_mega',
        icon: '🔮',
        item: 'aniipod_mega',
        labelVi: 'Aniipod Mega',
        labelEn: 'Aniipod Mega',
        subVi: 'Sản xuất tại 1 máy Aniipod Maker Lv.3',
        subEn: 'Produced at 1x Aniipod Maker Lv.3'
    },
    {
        id: 'aniimo_exp',
        icon: '🌟',
        item: 'growth_fruit',
        labelVi: 'Aniimo EXP (Trái tăng trưởng)',
        labelEn: 'Aniimo EXP (Growth Fruit)',
        subVi: 'Sản xuất Growth Fruit tại 1 máy Dance Pad Polisher Lv.3',
        subEn: 'Produce Growth Fruit at 1x Dance Pad Polisher Lv.3'
    },
    {
        id: 'coins',
        icon: '🪙',
        item: 'coins',
        labelVi: 'Xu Gia Viên (Home Coins)',
        labelEn: 'Home Coins',
        subVi: 'Tối đa hóa doanh thu Xu Gia Viên từ năng lực còn lại',
        subEn: 'Maximize Home Coins from remaining capacity'
    },
    {
        id: 'aniimo_food',
        icon: '🍱',
        item: null,
        labelVi: 'Món ăn cho Aniimo',
        labelEn: 'Aniimo Food',
        subVi: 'Nuôi dưỡng định mức tổ đội 45 Aniimo',
        subEn: 'Sustain quota for a team of 45 Aniimo'
    }
];

export function isRV20Endgame() {
    return isSimpleMode() && selectedHomeLevel() === 20;
}


const ARROW_UP = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5 L10 7 H2 Z" fill="currentColor"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 9.5 L10 5 H2 Z" fill="currentColor"/></svg>';

let priorityOrder = RV20_PRIORITY_TARGETS.map(t => ({ target: t.id, on: false }));

function isPriorityStrategy() {
    return isRV20Endgame();
}

function shownPriorities() {
    if (!isRV20Endgame()) return [];
    return priorityOrder.filter(p => RV20_PRIORITY_TARGETS.some(t => t.id === p.target));
}

function activePriorities() {
    if (!isRV20Endgame()) return [];
    return priorityOrder.filter(p => p.on).map(p => p.target);
}

function wantsAniipods() {
    return isRV20Endgame() && priorityOrder.some(p => p.target === 'aniipod_mega' && p.on);
}

function priorityLabel(target) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const found = RV20_PRIORITY_TARGETS.find(t => t.id === target);
    if (found) return isVi ? found.labelVi : found.labelEn;
    return CURRENCY_LABELS[target] || target;
}

function renderPriorities() {
    const list = document.getElementById('priority-list');
    if (!list) return;
    list.innerHTML = buildPriorityListMarkup({
        shown: shownPriorities(),
        priorityOrder,
        priorityTargets: RV20_PRIORITY_TARGETS,
        isVietnamese: window.i18n && window.i18n.getLang() === 'vi',
        arrowUp: ARROW_UP,
        arrowDown: ARROW_DOWN,
    });
}
function attachPriorityHandlers() {
    createPriorityController({
        list: document.getElementById('priority-list'),
        getPriorityOrder: () => priorityOrder,
        render: renderPriorities,
        save: saveInputsToStorage,
    }).attach();
}
// The best Aniipod the owned Aniipod Maker can make, or null without one. A better Aniipod
// catches better, so the strategy makes only this one.
function bestAniipod() {
    const tiers = isSimpleMode()
        ? simpleSetup(selectedHomeLevel()).facilities['Aniipod Maker']
        : facilityTiers['Aniipod Maker'];
    const level = Math.max(0, ...(tiers || []).filter(t => t.count > 0).map(t => t.level));
    return level > 0 ? ANIIPOD_TIERS[Math.min(level, ANIIPOD_TIERS.length) - 1] : null;
}

// What the plans on screen were asked for, so they're described against the right target even
// after the inputs change.
let planContext = null;

const strategyUIController = createStrategyUIController({
    document,
    window,
    isSimpleMode,
    selectedHomeLevel,
    isRV20Endgame,
    isLevelUpStrategy,
    levelUpCosts: LEVEL_UP_COSTS,
    levelUpChains: LEVEL_UP_CHAINS,
    maxHomeLevel: MAX_HOME_LEVEL,
    rateUnitSeconds: RATE_UNIT_SECONDS,
    renderSeason,
    renderPriorities,
    getLevelUpStock: () => levelUpStock,
    setLevelUpStock: (name, amount) => { levelUpStock[name] = amount; },
    setLevelUpTargetChosen: value => { levelUpTargetChosen = value; },
    formatNumber,
    formatRate,
    getItemDisplayName,
    saveInputsToStorage,
    runFindPlan,
    getPlanContext: () => planContext,
    buildLevelUpStrategyViewModel,
    buildLevelUpViewModel,
    createStrategyFormController,
    getLevelUpStockNames,
    getLevelUpStockAmount,
    numberOrDefault,
    floatOrDefault,
});

function levelUpTarget() {
    return strategyUIController.levelUpTarget();
}

function levelUpCost() {
    return strategyUIController.levelUpCost();
}

function levelUpUnavailable() {
    return strategyUIController.levelUpUnavailable();
}

function populateLevelUpTargets() {
    return strategyUIController.populateLevelUpTargets();
}

function renderStrategy() {
    return strategyUIController.renderStrategy();
}

function attachStrategyHandlers() {
    return strategyUIController.attachStrategyHandlers();
}

function levelUpInput() {
    return strategyUIController.levelUpInput();
}

function perHour(perSecond) {
    return strategyUIController.perHour(perSecond);
}

function formatDuration(seconds) {
    return strategyUIController.formatDuration(seconds);
}

function renderLevelUp(plan) {
    return strategyUIController.renderLevelUp(plan);
}
const productionSummaryViewController = createProductionSummaryViewController({
    document,
    window,
    rateUnitSeconds: RATE_UNIT_SECONDS,
    getPlanContext: () => planContext,
    getRecipeIndex: () => recipeFilterController.getRecipeIndex(),
    seasonCurrency: SEASON.currency,
    isVietnamese: () => window.i18n && window.i18n.getLang() === 'vi',
    prettyItem,
    formatRate,
    formatNumber,
    perHour,
    getFacilityDisplayName,
    renderItemIcon,
    renderFacilityIcon,
    getLastPlan: () => lastPlan,
});

function renderSeedTable(plan) {
    return productionSummaryViewController.renderSeedTable(plan);
}

function renderProfitBreakdown(plan) {
    return productionSummaryViewController.renderProfitBreakdown(plan);
}
// Metadata for Harvest Moon festival dishes
export const SEASON_DISH_DATA = {
    harvest_platter: {
        name: 'harvest_platter',
        facility: 'Crafting Table',
        radish: 8,
        pepper: 8,
        sellValue: 5290,
        points: 8,
        cycleTime: 203,
        // Chuỗi cơ sở bắt buộc trong game:
        // 1. Nồi hầm làm Kẹo đá (Mía + Nước ngọt)
        // 2. Bếp lửa lớn làm Củ cải sấy lát (Củ cải + Kẹo đá)
        // 3. Lâu đài cát làm Muối biển nhanh
        // 4. Bếp gắp thú nướng Ớt trăng (Ớt + Muối biển)
        // 5. Bàn chế tạo ghép thành Mâm cỗ trung thu (Củ cải lát + Ớt nướng)
        facilityUsage: {
            'Crafting Table': 1,
            'Blazing Stove': 1,
            'Claw Game Cooker': 1,
            'Simmering Pot': 1,
            'Tidewhisper Sandcastle': 1,
            'Well': 1
        },
        prepChain: [
            {
                facility: 'Simmering Pot',
                item_name: 'rock_candy',
                cycleTime: 108,
                reasonVi: 'Sơ chế Kẹo đá cho Củ cải sấy lát (Mâm cỗ trung thu)',
                reasonEn: 'Prep Rock Candy for Radish Slices (Harvest Platter)'
            },
            {
                facility: 'Blazing Stove',
                item_name: 'moondew_radish_slices',
                cycleTime: 203,
                reasonVi: 'Sơ chế Củ cải sấy lát cho Mâm cỗ trung thu',
                reasonEn: 'Prep Radish Slices for Harvest Platter'
            },
            {
                facility: 'Claw Game Cooker',
                item_name: 'roasted_waxing_moon_pepper',
                cycleTime: 162,
                reasonVi: 'Sơ chế Ớt nướng trăng cho Mâm cỗ trung thu',
                reasonEn: 'Prep Roasted Pepper for Harvest Platter'
            }
        ]
    },
    umbral_sweet_and_spicy_sauce: {
        name: 'umbral_sweet_and_spicy_sauce',
        facility: 'Simmering Pot',
        radish: 8,
        pepper: 8,
        sellValue: 2390,
        points: 8,
        cycleTime: 203,
        facilityUsage: {
            'Simmering Pot': 1,
            'Tidewhisper Sandcastle': 1
        }
    },
    umbral_pickle: {
        name: 'umbral_pickle',
        facility: 'Pickling Jar',
        radish: 8,
        pepper: 8,
        sellValue: 2290,
        points: 8,
        cycleTime: 203,
        facilityUsage: {
            'Pickling Jar': 1,
            'Bouncy Brew Keg': 1
        },
        prepChain: [
            {
                facility: 'Bouncy Brew Keg',
                item_name: 'cider_vinegar',
                cycleTime: 162,
                reasonVi: 'Sơ chế Giấm táo cho Dưa muối chua hắc ám',
                reasonEn: 'Prep Cider Vinegar for Umbral Pickle'
            }
        ]
    },
    umbral_hot_pot: {
        name: 'umbral_hot_pot',
        facility: 'Blazing Stove',
        radish: 8,
        pepper: 8,
        sellValue: 2150,
        points: 8,
        cycleTime: 203,
        facilityUsage: {
            'Blazing Stove': 1,
            'Well': 1
        }
    },
    moondew_radish_slices: {
        name: 'moondew_radish_slices',
        facility: 'Blazing Stove',
        radish: 8,
        pepper: 0,
        sellValue: 2370,
        points: 4,
        cycleTime: 203,
        facilityUsage: {
            'Blazing Stove': 1,
            'Simmering Pot': 1,
            'Well': 1
        },
        prepChain: [
            {
                facility: 'Simmering Pot',
                item_name: 'rock_candy',
                cycleTime: 108,
                is_emode: true,
                reasonVi: 'Sơ chế Kẹo đá cho Củ cải sấy lát',
                reasonEn: 'Prep Rock Candy for Dried Radish Slices'
            }
        ]
    },
    roasted_waxing_moon_pepper: {
        name: 'roasted_waxing_moon_pepper',
        facility: 'Claw Game Cooker',
        radish: 0,
        pepper: 8,
        sellValue: 1520,
        points: 4,
        cycleTime: 162,
        facilityUsage: {
            'Claw Game Cooker': 1,
            'Tidewhisper Sandcastle': 1
        }
    }
};

/**
 * Lựa chọn các món ăn sự kiện tối ưu theo các quy tắc:
 * 1. Không món ăn nào giúp tăng doanh thu hoặc share < 2% -> bỏ qua, không chọn tất cả.
 * 2. Chỉ 1 món ăn giúp tăng nhiều nhất, còn lại không đáng kể / tốn nhiều cơ sở / trùng cơ sở / share < 2% -> chỉ chọn 1 để sản xuất.
 * 3. 2 món ăn giúp tăng nhiều nhất, còn lại không đáng kể / tốn nhiều cơ sở / trùng cơ sở / share < 2% -> chọn 2 để sản xuất.
 * 4. Luôn ưu tiên cơ sở chế biến cho món ăn sự kiện (phải sở hữu đủ cơ sở trong chuỗi).
 */
export function selectOptimalSeasonDishes(planRateEstimate = 40) {
    return selectOptimalSeasonDishesPolicy({
        seasonActive: seasonActive(),
        radishPlots: seasonRadishPlots,
        pepperPlots: seasonPepperPlots,
        selectedRecipes: SEASON_RECIPES.filter(recipe => selectedSeasonDishes.has(recipe.name)),
        dishData: SEASON_DISH_DATA,
        getCurrentSetup: () => simpleSetup(selectedHomeLevel()).facilities,
        planRateEstimate,
    });
}

/** Return facility reservations for the currently selected season dishes. */
export function getSeasonFacilityUsage(planRateEstimate = 40) {
    return summarizeSeasonFacilityUsage(selectOptimalSeasonDishes(planRateEstimate));
}
// Bảng tra cứu điều kiện mở khóa công thức siêu tốc (quick_):
// Cần đạt cấp tối thiểu của cơ sở và cấp tối thiểu của mô-đun tương ứng
export const QUICK_RECIPE_UNLOCKS = {
    sea_salt: { quick: 'quick_sea_salt', facility: 'Tidewhisper Sandcastle', minFacilityLevel: 2, module: 'resource_detector', minModuleLevel: 2 },
    rice: { quick: 'quick_rice', facility: 'Farmland', minFacilityLevel: 6, module: 'ecological_module', minModuleLevel: 5 },
    strawberry: { quick: 'quick_strawberry', facility: 'Farmland', minFacilityLevel: 7, module: 'ecological_module', minModuleLevel: 7 },
    wheat: { quick: 'quick_wheat', facility: 'Farmland', minFacilityLevel: 2, module: 'ecological_module', minModuleLevel: 1 },
    potato: { quick: 'quick_potato', facility: 'Farmland', minFacilityLevel: 4, module: 'ecological_module', minModuleLevel: 3 },
    bamboo: { quick: 'quick_bamboo', facility: 'Woodland', minFacilityLevel: 3, module: 'ecological_module', minModuleLevel: 2 },
    lemon: { quick: 'quick_lemon', facility: 'Woodland', minFacilityLevel: 4, module: 'ecological_module', minModuleLevel: 4 },
    maple_syrup: { quick: 'quick_maple_syrup', facility: 'Woodland', minFacilityLevel: 5, module: 'ecological_module', minModuleLevel: 6 },
    coconut: { quick: 'quick_coconut', facility: 'Woodland', minFacilityLevel: 6, module: 'ecological_module', minModuleLevel: 8 },
    well_water: { quick: 'quick_well_water', facility: 'Well', minFacilityLevel: 1, module: 'resource_detector', minModuleLevel: 1 },
    fresh_water: { quick: 'quick_fresh_water', facility: 'Well', minFacilityLevel: 3, module: 'resource_detector', minModuleLevel: 4 },
    deep_rock_spring_water: { quick: 'quick_deep_rock_spring_water', facility: 'Well', minFacilityLevel: 4, module: 'resource_detector', minModuleLevel: 6 },
    natural_mineral_spring_water: { quick: 'quick_natural_mineral_spring_water', facility: 'Well', minFacilityLevel: 5, module: 'resource_detector', minModuleLevel: 7 },
    wool: { quick: 'quick_wool', facility: 'Nimbus Bed', minFacilityLevel: 2, module: 'resource_detector', minModuleLevel: 5 },
    aromathyst: { quick: 'quick_aromathyst', facility: 'Dewy House', minFacilityLevel: 2, module: 'resource_detector', minModuleLevel: 3 },
    scales: { quick: 'quick_scales', facility: 'Floral Windmill', minFacilityLevel: 1, module: 'resource_detector', minModuleLevel: 8 },
};

export function isQuickRecipeUnlocked(rawItem, facilities, modules) {
    const info = QUICK_RECIPE_UNLOCKS[rawItem];
    if (!info) return false;
    const facLevel = facilities[info.facility]?.[0]?.level || 0;
    const facCount = facilities[info.facility]?.[0]?.count || 0;
    if (facCount <= 0 || facLevel < info.minFacilityLevel) return false;
    if (info.module && info.minModuleLevel) {
        const modLevel = modules[info.module] || 0;
        if (modLevel < info.minModuleLevel) return false;
    }
    return true;
}

// Get plan-level input values from the form (facilities/modules/prioritize-byproducts, nothing
// goal-related, since find_plan doesn't need a target). Currency is always coins: the full
// release removed Bud Tickets, the only other sellable currency.
const buildPlanInputValuesFromPage = createPlanInputBuilder({
    getHomeLevel: selectedHomeLevel,
    simpleSetup,
    getExcludedRecipes: excludedRecipes,
    isSeasonActive: seasonActive,
    selectedSeasonDishes,
    getSeasonRadishPlots: () => seasonRadishPlots,
    getSeasonPepperPlots: () => seasonPepperPlots,
    quickRecipeUnlocks: QUICK_RECIPE_UNLOCKS,
    isQuickRecipeUnlocked,
    selectOptimalSeasonDishes,
    getSeasonFacilityUsage,
    getActivePriorities: activePriorities,
    getLevelUpInput: levelUpInput,
    getPowerGridRate,
    getProductionAniimoCap,
    getPowerPoleCount,
    getSpecialistQuotas,
    getFacilityOverrides,
});

function getPlanInputValues() {
    return buildPlanInputValuesFromPage();
}


export function buildStrategyPlanInput(commonInput = getPlanInputValues()) {
    return buildStrategyPlanInputModule({
        commonInput,
        isEndgame: isRV20Endgame(),
        getPriorities: activePriorities,
        getLevelUp: levelUpInput,
    });
}

// Integrates dedicated festival crops and chosen festival dishes into the solved plan
function integrateSeasonPlan(plan) {
    return integrateSeasonPlanModule(plan, {
        isSeasonActive: seasonActive,
        getRadishPlots: () => seasonRadishPlots,
        getPepperPlots: () => seasonPepperPlots,
        isVietnamese: () => window.i18n && window.i18n.getLang() === 'vi',
        selectOptimalSeasonDishes,
        facilityOverrides,
        lastEmodeCounts,
        simpleSetup,
        selectedHomeLevel,
        isQuickRecipeUnlocked,
    });
}


/**
 * Chuẩn hóa các cơ sở chế biến / phi canh tác:
 * Nếu một cơ sở chế biến có số lượng > 1 (ví dụ Máy Sấy Hộp Nhạc có 2 máy cùng làm 1 món),
 * tách thành từng hàng riêng biệt với số lượng luôn là 1.
 * Nhờ đó người dùng có thể tùy chỉnh thủ công chế độ (Điện / Aniimo / Thường) cho từng máy một cách độc lập.
 */
export function normalizePlanFacilityCounts(plan) {
    return normalizePlanFacilityCountsModule(plan, {
        selectedHomeLevel,
        facilityOverrides,
        facilities: FACILITIES,
        categoryByName: FACILITY_CATEGORY_BY_NAME,
        lastEmodeCounts,
        createWorksheetModeQuotaTracker,
        getOwnedFacilityCounts,
        getRecipeMap: () => (window.ALL_RECIPES_MAP || null),
        getPowerGridRate,
    });
}

/**
 * Tính toán số lượng ô đất Củ cải và Ớt tối ưu (Sweet Spot) để đạt năng suất cao nhất:
 * Cân bằng chính xác giữa năng lực tiêu thụ của cơ sở chế biến và diện tích đất Farmland dành cho cây trồng giá trị cao (Nhân sâm).
 */
export function calculateOptimalSeasonPlots(dishes, homeLevel) {
    return calculateOptimalSeasonPlotsPolicy(dishes, prettyItem);
}

const seasonPlotsAdvisoryController = createSeasonPlotsAdvisoryController({
    document,
    window,
    seasonActive: () => seasonActive(),
    getRadishPlots: () => seasonRadishPlots,
    getPepperPlots: () => seasonPepperPlots,
    setRadishPlots: v => { seasonRadishPlots = v; },
    setPepperPlots: v => { seasonPepperPlots = v; },
    selectOptimalSeasonDishes: rate => selectOptimalSeasonDishes(rate),
    calculateOptimalSeasonPlots: (dishes, level) => calculateOptimalSeasonPlots(dishes, level),
    selectedHomeLevel: () => selectedHomeLevel(),
    saveInputsToStorage,
    runFindPlan,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
});
seasonPlotsAdvisoryController.attachGlobal();

/**
 * Đánh giá và hiển thị Banner Đề xuất Tối ưu hóa Ô đất (Plots Optimization Advisory Banner)
 */
export function evaluatePlotsOptimization(plan) {
    return seasonPlotsAdvisoryController.evaluate(plan);
}

// Keys ("Facility|item") of the shown plan's rows that rely on recipes not yet checked in game;
// set by `displayPlan` so the facility tables can tag those rows.
let unverifiedRowKeys = new Set();

const infeasibleViewController = createInfeasibleViewController({
    document,
    window,
    selectedHomeLevel,
    simpleSetup,
    seasonActive,
    isLevelUpStrategy,
    levelUpTarget,
    getSelectedSeasonDishes: () => selectedSeasonDishes,
    getUnlockedSpecial: () => unlockedSpecial,
    getSeasonRadishPlots: () => seasonRadishPlots,
    getSeasonPepperPlots: () => seasonPepperPlots,
    getProductionAniimoCap,
    aniimoMax: ANIIMO_MAX,
    renderFacilityIcon,
    renderItemIcon,
});

// Renders comprehensive explanation why a plan is infeasible according to Rule 5
export function renderInfeasibleExplanation(plan = null) {
    return infeasibleViewController.renderInfeasibleExplanation(plan);
}

// Show an error in the results section
function showError(message) {
    return infeasibleViewController.showError(message);
}

// The goal card's choices: coins and every priority that's on, in the player's order. Keeps the
// current choice when the new plan still has it.
function renderGoalTargets(plan) {
    const select = document.getElementById('goal-target');
    const previous = select.value;
    const rows = priorityRows(plan);
    select.innerHTML = renderGoalTargetOptions(rows, goalName);
    if (rows.some(r => r.target === previous)) select.value = previous;
}

function renderProductBreakdown(goalResult) {
    return productionSummaryViewController.renderProductBreakdown(goalResult);
}

function renderSeedsNeeded(goalResult) {
    return productionSummaryViewController.renderSeedsNeeded(goalResult);
}

// A colored ability tag, like the game's.
function abilityTag(name) {
    const a = ABILITY_BY_NAME.get(name);
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const displayName = (isVi && window.VI_ABILITIES && window.VI_ABILITIES[name]) ? window.VI_ABILITIES[name] : name;
    if (!a) return displayName;
    return `<span class="ability${a.dark ? ' dark' : ''}" style="--ability:${a.color}" title="${a.about}">${displayName}</span>`;
}

// A colored circle with the Aniimo level in it, for the facility plan's Aniimo column; the
// tooltip has the ability, level and personality.
function abilityDot(name, level, note) {
    const a = ABILITY_BY_NAME.get(name);
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const displayName = (isVi && window.VI_ABILITIES && window.VI_ABILITIES[name]) ? window.VI_ABILITIES[name] : name;
    const color = a ? a.color : '#888888';
    const tip = `${displayName} Lv.${level}${note ? ` · ${note}` : ''}`;
    return `<span class="ability-dot${a && a.dark ? ' dark' : ''}${note ? ' bonus' : ''}" style="--ability:${color}" title="${tip}" aria-label="${tip}">${level}</span>`;
}

function renderCropHarvestBadge(step, tasks, baseFac, preferPrismana = true) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const cropAbility = getCropHarvestAbility(step?.item_name, baseFac);
    let harvestTask = (tasks || []).find(t => t.jobs && t.jobs.some(j => j === 'Reaping' || j === 'Logging' || j === 'Collecting'));
    if (!harvestTask) {
        harvestTask = (tasks || []).find(t => t.ability === cropAbility) || { ability: cropAbility, level: preferPrismana ? 4 : 3 };
    }
    const ability = harvestTask.ability || cropAbility;
    const level = preferPrismana ? 4 : 3;
    const workerName = preferPrismana
        ? (ability === 'Dark' ? 'Pawney' : 'Irisal')
        : (ability === 'Dark' ? 'Celestis' : 'Leaffy');
    const workerCard = renderAniimoWorkerCard(ability, level, '', true, workerName, preferPrismana);
    const roleTitle = isVi ? (preferPrismana ? 'Thu hoạch' : 'Thu hoạch (T)') : (preferPrismana ? 'Harvest' : 'Harvest (M)');
    const actionLabel = ability === 'Dark'
        ? (baseFac === 'Woodland' ? (isVi ? 'Đốn/Nhựa' : 'Log/Tap') : (isVi ? 'Gặt/Cắt' : 'Reap'))
        : (isVi ? 'Thu hái' : 'Collect');
    const tip = isVi
        ? `Thu hoạch (${actionLabel}): Hệ ${ability} Lv.${level} · ${preferPrismana ? 'Prismana Lv.4' : 'Thường Lv.3'} (${workerName})`
        : `Harvest (${actionLabel}): ${ability} Lv.${level} · ${preferPrismana ? 'Prismana Lv.4' : 'Normal Lv.3'} (${workerName})`;

    return `<div class="farm-harvest-single-cell" title="${tip}">
        ${workerCard}
        <span class="farm-role-tag">${roleTitle}</span>
    </div>`;
}

function aniimoLabel(step) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const emodeAvailable = selectedHomeLevel() >= 12;
    const rawFac = step.facility || '';
    const baseFac = rawFac.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '').replace(/ \(Prismana\)$/, '');

    // Xác định chế độ hiện tại của step
    const ovr = facilityOverrides.find(o => o.facility === baseFac);
    let mode = step.mode;
    if (mode === 'specialist') mode = 'prismana';
    if (!mode) {
        if (emodeAvailable && (step.is_emode || rawFac.includes('(Electric)'))) {
            mode = 'electric';
        } else if (step.is_manual || rawFac.includes('(Manual)') || (step.item_name && step.item_name.includes('__manual'))) {
            mode = 'manual';
        } else if (step.is_specialist || rawFac.includes('(Prismana)') || (step.item_name && step.item_name.includes('__specialist'))) {
            mode = 'prismana';
        } else if (ovr) {
            if (emodeAvailable && ovr.electric_count > 0 && ovr.specialist_count === 0 && ovr.manual_count === 0) mode = 'electric';
            else if (ovr.specialist_count > 0 && ovr.electric_count === 0 && ovr.manual_count === 0) mode = 'prismana';
            else if (ovr.manual_count > 0 && ovr.electric_count === 0 && ovr.specialist_count === 0) mode = 'manual';
            else mode = ovr.target_mode || 'manual';
        } else {
            const facDef = FACILITIES.find(f => f.name === baseFac);
            const supportsEmode = emodeAvailable && (facDef?.supportsEmode ?? false);
            mode = (emodeAvailable && step.is_emode !== false && supportsEmode && (lastEmodeCounts[baseFac] || 0) > 0 && baseFac !== 'Mine' && baseFac !== 'Well')
                ? 'electric'
                : 'prismana';
        }
    }
    step.mode = mode;

    if (mode === 'electric' && emodeAvailable) {
        const title = isVi ? 'Chế độ điện (tự động, không cần công nhân Aniimo)' : 'Operating in Electric Mode (automatic, no Aniimo worker needed)';
        const label = isVi ? '⚡ Chế độ điện' : '⚡ E-mode';
        return `<span class="tag emode-tag" title="${title}">${label}</span>`;
    }

    const preferPrismana = (mode === 'prismana' || mode === 'specialist');
    const workerLevel = preferPrismana ? 4 : 3;

    // Crops and trees: check if it's Farmland or Woodland
    if (baseFac === 'Farmland' || baseFac === 'Woodland') {
        const tasks = step.aniimo_tasks || [];
        return renderCropHarvestBadge(step, tasks, baseFac, preferPrismana);
    }

    // Các cơ sở sản xuất và chế biến khác
    const facDef = FACILITIES.find(f => f.name === baseFac);
    const personality = facDef?.personality;
    let note = '';
    if (personality) {
        const persName = (isVi && window.VI_PERSONALITIES && window.VI_PERSONALITIES[personality]) ? window.VI_PERSONALITIES[personality] : personality;
        note = isVi
            ? `Tính cách ${persName} (+20% tốc độ)`
            : `${personality} personality (+20% speed)`;
    } else {
        note = isVi ? 'Tính cách tương thích (+20% tốc độ)' : 'Matching personality (+20% speed)';
    }

    const ability = facDef?.ability || step.aniimo?.ability || 'Artisanship';
    const specificWorker = getFacilitySpecificWorker(baseFac, step.item_name, step.facility_level, preferPrismana);

    return renderAniimoWorkerCard(ability, workerLevel, note, false, specificWorker, preferPrismana);
}

// "Fire Lv.4 · Practical": one kind of Aniimo, with the facility's personality when the plan
// counts on its bonus. `tagged` shows the ability as a colored tag.
function taskLabel(task, facility, tagged = false) {
    const ability = tagged ? abilityTag(task.ability) : task.ability;
    if (!task.personality_bonus) return `${ability} Lv.${task.level}`;
    const personality = FACILITIES.find(f => f.name === facility)?.personality;
    if (!personality) return `${ability} Lv.${task.level} · matching personality`;
    // The letter the game shows over an Aniimo's portrait, so a player can read a team off the
    // four it carries.
    const letter = personalityLetter(personality);
    return `${ability} Lv.${task.level} · ${personality}${letter ? ` (${letter})` : ''}`;
}



// A growing environment named in its own colour.
function modeTag(mode) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const displayMode = (isVi && window.VI_ENV_MODES && window.VI_ENV_MODES[mode]) ? window.VI_ENV_MODES[mode] : mode;
    const tint = ENVIRONMENT_MODE_COLORS[mode] || '#9aa0a8';
    return `<span class="env-mode-tag" style="--tint:${tint}">${displayMode}</span>`;
}

// What a row's Aniimo work on: each growing job ("Sowing crops" when it covers both Farmland and
// Woodland, "Reaping farmland" when it's one facility's), then the facilities.
function whereText(g) {
    return [...g.jobs]
        .map(([job, at]) => `${job} ${at.size > 1 ? 'crops' : listOf([...at].map(facility => facility.toLowerCase()))}`)
        .concat([...g.where.entries()].map(([place, n]) => `${n > 1 ? n + '× ' : ''}${place}`))
        .join(', ');
}

const aniimoSummaryController = createAniimoSummaryController({
    document,
    window,
    abilities: ABILITIES,
    facilities: FACILITIES,
    environmentBuildingAbility: ENVIRONMENT_BUILDING_ABILITY,
    abilityThemes: ABILITY_THEMES,
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
    getLastEmodeCounts: () => lastEmodeCounts,
    getFacilityOverrides: () => facilityOverrides,
    getFacilityDisplayName,
    prettyItem,
    getFacilitySpecificWorker,
    taskLabel,
    opposedPersonality,
    setLastBestTeam: team => rosterUIController.setLastBestTeam(team),
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
});
aniimoSummaryController.attachGlobal();

// The Aniimo team the shown plan needs, one row per distinct ability / level / personality.
// A row asks for enough Aniimo to cover its work on average (a facility waiting on ingredients
// frees its Aniimo), rounded up; facilities with a resident Aniimo (Sandcastle and the like) are
// always busy, so they count one each.
export function renderAniimoSummary(plan, options = {}) {
    return aniimoSummaryController.render(plan, options);
}

const environmentRenderer = createEnvironmentRenderer({
    environmentBuildingSize,
    coverageRadius: ENVIRONMENT_COVERAGE_RADIUS,
    modeColors: ENVIRONMENT_MODE_COLORS,
    modeShade: ENVIRONMENT_MODE_SHADE,
    facilityColors: ENVIRONMENT_FACILITY_COLORS,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
    tipAttrs,
    getFacilityDisplayName,
    getModeDisplayName,
    prettyItem,
});

const facilityPlanViewController = createFacilityPlanViewController({
    document,
    window,
    environmentModeOrder: ENVIRONMENT_MODE_ORDER,
    environmentRenderer,
    facilityCategories: FACILITY_CATEGORIES,
    facilityCategoryByName: FACILITY_CATEGORY_BY_NAME,
    facilities: FACILITIES,
    facilityPowerWatts: FACILITY_POWER_WATTS,
    selectedHomeLevel,
    getFacilityOverrides: () => facilityOverrides,
    getLastEmodeCounts: () => lastEmodeCounts,
    getOwnedFacilityCounts,
    getLastPlan: () => lastPlan,
    renderFacilityIcon,
    renderItemIcon,
    getFacilityDisplayName,
    prettyItem,
    prettyReason,
    formatNumber,
    aniimoLabel,
    isVietnamese: () => window.i18n && window.i18n.getLang() === 'vi',
    splitEnvironmentRowsByUnit: (rows, assignmentsForMode) => splitEnvironmentRowsByUnitPolicy(rows, assignmentsForMode),
    environmentModeColors: ENVIRONMENT_MODE_COLORS,
});

function renderFacilityPlan(plan) {
    return facilityPlanViewController.renderFacilityPlan(plan);
}
// Re-renders "Your Rate" from `lastPlan` at whichever unit is currently selected in the
const rateDisplayController = createRateDisplayController({
    document,
    window,
    getLastPlan: () => lastPlan,
    getPlanContext: () => planContext,
    getLastGoalResult: () => lastGoalResult,
    rateUnitSeconds: RATE_UNIT_SECONDS,
    currencyLabels: CURRENCY_LABELS,
    seasonPointsLabel: SEASON.points,
    formatRate,
    prettyItem,
    priorityLabel,
    renderImprovements,
    renderSeedTable,
    renderLevelUp,
    renderProductBreakdown,
});

// Adapts current locale and strategy context to the pure priority-rate projection.
function priorityRows(plan) {
    return rateDisplayController.priorityRows(plan);
}

// Re-renders "Your Rate" from `lastPlan` at whichever unit is currently selected in the
// `#rate-unit` dropdown; called after a fresh plan and again whenever the user switches units.
function updateRateDisplay(pickUnit = false) {
    return rateDisplayController.updateRateDisplay(pickUnit);
}

// Re-renders every rate-unit-dependent display from the already-computed `lastPlan`/`lastGoalResult`.
function updateRateUnitDisplays() {
    return rateDisplayController.updateRateUnitDisplays();
}

const tooltipController = createTooltipController({ document, window });
tooltipController.attach();

const insightsRenderer = createInsightsRenderer({
    document,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
    selectedHomeLevel,
    simpleSetup,
    planContext: () => planContext,
    levelUpCosts: LEVEL_UP_COSTS,
    lastPlanInput: () => lastPlanInput,
    lastEmodeCounts: () => lastEmodeCounts,
    prettyItem,
    perHour,
    formatDuration,
    formatRate,
    getFacilityDisplayName,
    getGeneratorCapacity,
    calculatePowerWatts,
    seasonActive: () => seasonActive(),
    selectedSeasonDishes: () => selectedSeasonDishes,
    buildWoodlandInsight,
    buildProfitInsight,
    buildFarmSupplyInsight,
    buildRejectedInsight,
    buildLogisticsInsight,
});

function renderInsights(plan) {
    insightsRenderer.render(plan);
}

const planDisplayController = createPlanDisplayController({
    document,
    isVietnamese: () => !!(window.i18n && window.i18n.getLang() === 'vi'),
    getRateUnitChosen: () => rateUnitChosen,
    getPlanContext: () => planContext,
    setUnverifiedRowKeys: value => { unverifiedRowKeys = value; },
    renderInfeasibleExplanation,
    updateRateDisplay,
    renderGoalTargets,
    renderInsights,
    evaluatePlotsOptimization,
    buildSolverResultViewModel,
    prettyItem,
    renderSeedTable,
    renderLevelUp,
    renderProfitBreakdown,
    renderFacilityPlan,
    renderHomelandLayout,
    renderAniimoSummary,
});

export function displayPlan(plan) {
    return planDisplayController.displayPlan(plan);
}

const goalDisplayController = createGoalDisplayController({
    document,
    setLastGoalResult: value => { lastGoalResult = value; },
    formatDuration,
    formatNumber,
    renderProductBreakdown,
    renderSeedsNeeded,
    warn: (...args) => console.warn(...args),
});

function displayGoal(goalResult) {
    return goalDisplayController.displayGoal(goalResult);
}

const planSolveController = createPlanSolveController({
    document,
    isWasmReady: () => wasmReady,
    showError,
    getPlanRunId: () => planRunId,
    nextPlanRunId: () => ++planRunId,
    resetPlansBySetup: () => { plansBySetup = {}; },
    resetRankingsBySetup: () => { rankingsBySetup = {}; },
    stopRanking,
    stopSetupSolve,
    stopLayout,
    solverClient,
    restartWorker,
    buildStrategyPlanInput,
    isLevelUpStrategy,
    levelUpTarget,
    levelUpUnavailable,
    getLevelUpStock: () => levelUpStock,
    getLevelUpStockAmount,
    wantsAniipods,
    bestAniipod,
    getSkippedRecipes: () => recipeFilterController.getSkippedRecipes(),
    prettyItem,
    isSimpleMode,
    startProgress,
    setStep,
    renderProgress,
    getProgress: () => progressController.getProgress(),
    selectedAniimoSetup,
    bestAniimoSetup,
    aniimoInput,
    selectedHomeLevel,
    getUnlockedSpecial: () => unlockedSpecial,
    getSelectedSeasonDishes: () => selectedSeasonDishes,
    activePriorities,
    seasonActive,
    isRV20Endgame,
    executePlanSolve,
    callWorker,
    solvePlanWithEmode,
    allocateDynamicEmode,
    getGeneratorCapacity,
    getPowerGridRate,
    getTargetEmodeWatts,
    trialCountToPercent,
    runPlanPruning,
    integrateSeasonPlan,
    normalizePlanFacilityCounts,
    actualEmodeCounts,
    setLastEmodeCounts: val => { lastEmodeCounts = val; },
    setLastPlanInput: val => { lastPlanInput = val; },
    setPlanContext: val => { planContext = val; },
    setLastPlan: val => { lastPlan = val; },
    finishSolveSteps,
    setPlanForSetup: (setup, plan) => { plansBySetup[setup] = plan; },
    getPlanForSetup: setup => plansBySetup[setup],
    showSelectedPlan,
    updatePowerGauge,
});

// Solve for the best achievable plan (facilities + currency + modules); the heavier computation,
// triggered explicitly by the Calculate button or Enter in a facility/module field.
function runFindPlan() {
    return planSolveController.runFindPlan();
}

const timeToGoalController = createTimeToGoalController({
    document,
    getLastPlan: () => lastPlan,
    getPlanContext: () => planContext,
    getPriorityRows: priorityRows,
    goalName,
    parseNumber: floatOrDefault,
    solveWorker: callWorker,
    displayGoal,
    renderGoalAlso,
    timeToMake,
    setLastGoalResult: value => { lastGoalResult = value; },
    formatNumber,
    logError: (...args) => console.error(...args),
});

async function runTimeToGoal() {
    return timeToGoalController.runTimeToGoal();
}

function madeBy(row, seconds) {
    return calculateMadeBy(row, seconds, lastPlan);
}

function timeToMake(row, needed) {
    return calculateTimeToMake(row, needed, lastPlan);
}
// What else the plan makes by the time the goal is met, e.g. "4.6M Home Coins, 39 Aniipod Mega",
// each counted from its first batch as the goal itself is.
function renderGoalAlso(rows, chosen, seconds, result) {
    const el = document.getElementById('goal-also');
    const view = buildGoalAlsoViewModel({ rows, chosen, seconds, result, madeBy, goalName, formatNumber });
    el.style.display = view.display;
    el.innerHTML = view.html;
}

// --- Facility recipe reference modal ----------------------------------------------------
// A static reference table of every recipe in the game data, grouped by facility. Unlike the
// facility input cards, this isn't tied to owned facility counts or levels; it just lists what's
// possible to unlock. Recipe data comes from `get_all_items()` (see wasm.rs), which dumps every
// `ProductionItem` unfiltered.

const recipeTableRenderer = createRecipeTableRenderer({
    facilities: FACILITIES,
    facilityCategories: FACILITY_CATEGORIES,
    specialNames: SPECIAL_NAMES,
    seasonName: SEASON.name,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
    getI18n: () => window.i18n,
    prettyItem,
    escapeText,
    getFacilityDisplayName,
    formatNumber,
    abilityTag,
    bestAniimoLevel,
});

const recipeSearchController = createRecipeSearchController({
    document,
    getLanguage: () => window.i18n && window.i18n.getLang() === 'vi' ? 'vi' : 'en',
});

const facilitiesModalController = createFacilitiesModalController({
    document,
    window,
    callWorker,
    isWasmReady: () => wasmReady,
    recipeTableRenderer,
    recipeSearchController,
});
facilitiesModalController.attachGlobal();

function renderRecipeTables(recipes) {
    facilitiesModalController.renderRecipeTables(recipes);
}

// --- Application Bootstrap & Event Wiring ------------------------------------------------
export function bootstrapApp() {
    if (!document.getElementById('optimize-btn') && !document.getElementById('home-level')) {
        return; // Running in headless context or benchmark.html
    }
    recipeSearchController.attach();
    const savedData = readStorage();
    initFacilityTiers(savedData);
    renderFacilityCards();
    populateHomeLevels();
    populateLevelUpTargets();
    loadInputsFromStorage(savedData);
    attachAutoSave();
    attachFacilityTierHandlers();
    attachEmodeHandlers();
    attachModeHandlers();
    updateProductionAniimoCap();
    attachProductionAniimoCapHandlers();
    attachStrategyHandlers();
    attachSkipHandlers();
    renderSkippedRecipes();
    attachSpecialHandlers();
    renderSpecialRecipes();
    attachSeasonHandlers();
    attachRosterHandlers();
    homelandUIController.attachHandlers();
    attachPriorityHandlers();
    showAniimoSetup();
    applyConfigMode();
    updateSimpleEmodeState();
    attachSpecialistQuotaHandlers();
    updateSpecialistQuotasLimits(selectedHomeLevel());
    initWasm();

    setInterval(updateSeasonTitleCountdown, 30000);
    document.getElementById('optimize-btn')?.addEventListener('click', runFindPlan);
    document.getElementById('clear-saved-btn')?.addEventListener('click', clearSavedInputs);
    document.getElementById('rate-unit')?.addEventListener('change', () => {
        rateUnitChosen = true;
        updateRateUnitDisplays();
    });
    ['aniimo-best', 'aniimo-minimum', 'aniimo-custom'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', showAniimoSetup);
    });
    document.getElementById('aniimo-toggle')?.addEventListener('click', () => {
        const toggle = document.getElementById('aniimo-toggle');
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        document.getElementById('aniimo-body').hidden = !expanded;
    });
    document.getElementById('insights-toggle')?.addEventListener('click', () => {
        const toggle = document.getElementById('insights-toggle');
        const expanded = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(expanded));
        document.getElementById('insights-content').hidden = !expanded;
    });
    aniimoSetupUIController.attachAniimoSetupHandlers();

    // Goal fields update live; no need to re-run the facility-allocation solve just because the
    // goal amount changed.
    document.getElementById('target-amount')?.addEventListener('input', runTimeToGoal);
    document.getElementById('current-amount')?.addEventListener('input', runTimeToGoal);
    document.getElementById('goal-target')?.addEventListener('change', runTimeToGoal);

    // Allow Enter key to trigger a full plan recalculation; but not in the goal fields, which
    // already update live on every keystroke via the listeners above. Facility tier inputs are
    // excluded here since they're already covered by the delegated listener in
    // `attachFacilityTierHandlers` (their rows come and go, so a per-element listener attached
    // once at startup wouldn't reach a tier added later).
    document.querySelectorAll('input').forEach(input => {
        if (input.id === 'target-amount' || input.id === 'current-amount') return;
        if (input.closest('#facilities-grid') || input.closest('#level-up-stock-grid') || input.id === 'skip-input') return;
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                runFindPlan();
            }
        });
    });
}

export function handleLanguageChanged() {
    facilitiesModalController.reset();
    if (typeof renderFacilityCards === 'function') {
        renderFacilityCards();
    }
    if (typeof renderStrategy === 'function') {
        renderStrategy();
    }
    if (typeof renderSimpleSummary === 'function') {
        renderSimpleSummary();
    }
    if (lastPlan && typeof displayPlan === 'function') {
        displayPlan(lastPlan);
        if (typeof lastGoalResult !== 'undefined' && lastGoalResult && typeof displayGoal === 'function') {
            displayGoal(lastGoalResult);
        }
    }
}

document.addEventListener('DOMContentLoaded', bootstrapApp);
window.addEventListener('languageChanged', handleLanguageChanged);
