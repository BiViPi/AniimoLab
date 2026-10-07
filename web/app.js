// AniimoLab Web Application

import {
    FACILITIES, FACILITY_CATEGORIES, FACILITY_CATEGORY_BY_NAME, FACILITY_FOOTPRINTS, HOMELAND_PLOTS, HOMELAND_PLOT_SIZE,
    MAX_HOME_LEVEL, ANIIMO_MAX, simpleSetup,
    LEVEL_UP_COSTS, LEVEL_UP_CHAINS, SPECIAL_RECIPES, SEASON, SEASON_RECIPES, ANIIPOD_TIERS, PERSONALITY_PAIRS, personalityLetter, opposedPersonality,
    FACILITY_POWER_WATTS, DEFAULT_GENERATOR_WATTS, GENERATOR_WATTS_BY_HOME_LEVEL, GENERATOR_CAPACITY_OPTIONS,
} from './facility-config.js?v=aniimolab_v24';
import { renderAniimoWorkerCard, renderAniimoTasksCluster, renderRosterWorkerBadge, getWorkerForLevel, getFacilitySpecificWorker } from './aniimo-data.js?v=aniimolab_v24';
import { renderFacilityIcon, renderItemIcon } from './asset-map.js?v=aniimolab_v24';

let wasmReady = false;

// The wasm optimizer runs in a Web Worker (see worker.js), not on the main thread: `find_plan`
// can take long enough on a complex facility setup that running it here would freeze the page's
// own rendering, which is what makes the browser offer to kill the tab. Every call site below
// goes through `callWorker` instead of calling a wasm-bindgen function directly.
let worker = null;
let nextRequestId = 0;
const pendingWorkerRequests = new Map();

// Tags this page load's worker (and, through it, the wasm solver; see worker.js) so the browser
// never runs a cached older solver next to newer page code.
const WORKER_URL = `./worker.js?v=aniimolab_v24&load=${Date.now()}`;

function initWorker() {
    worker = new Worker(WORKER_URL, { type: 'module' });
    worker.onmessage = (event) => {
        const { id, type, ok, result, error, count } = event.data;
        const pending = pendingWorkerRequests.get(id);
        if (!pending) return;
        // A `find_plan` request can receive several `type: 'progress'` messages (the solver's own
        // real trial-solve count; see `find_plan`'s doc comment in wasm.rs) before its one final
        // `{ ok, result }` response; only the latter resolves/removes the pending request.
        if (type === 'progress') {
            if (pending.onProgress) pending.onProgress(count);
            return;
        }
        pendingWorkerRequests.delete(id);
        if (ok) {
            pending.resolve(result);
        } else {
            pending.reject(new Error(error));
        }
    };
    worker.onerror = (event) => {
        console.error('Worker error:', event.message || event);
        pendingWorkerRequests.forEach(pending => pending.reject(new Error(event.message || 'The planner stopped')));
        pendingWorkerRequests.clear();
    };
}

// Throws away the worker and anything still running in it, e.g. a Minimum-setup solve from an
// older Calculate click that would otherwise hold up the new one, and starts a fresh worker.
function restartWorker() {
    worker.terminate();
    pendingWorkerRequests.forEach(pending => pending.reject(new Error('Cancelled by a newer calculation')));
    pendingWorkerRequests.clear();
    initWorker();
}

// Sends one request to the worker and resolves with its result (or rejects with its error);
// `type` is one of worker.js's `HANDLER_NAMES` or `'find_plan'`, and `payload` that function's
// own single string argument (omit for `get_version`/`get_all_items`, which take none).
// `onProgress(count)`, if given, gets each progress message before the result: `find_plan`
// sends every solve step and, from the backup planner, its trial count; see worker.js.
function callWorker(type, payload, onProgress) {
    return new Promise((resolve, reject) => {
        const id = ++nextRequestId;
        pendingWorkerRequests.set(id, { resolve, reject, onProgress });
        worker.postMessage({ id, type, payload });
    });
}

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
const EARLY_PHASE_TRIALS = 15;
const EARLY_PHASE_PERCENT = 25;
const LATE_PHASE_HALFWAY_TRIALS = 120;
function trialCountToPercent(count) {
    if (count <= EARLY_PHASE_TRIALS) {
        return Math.round((EARLY_PHASE_PERCENT * count) / EARLY_PHASE_TRIALS);
    }
    const trialsIntoLatePhase = count - EARLY_PHASE_TRIALS;
    const latePhasePercentRange = 96 - EARLY_PHASE_PERCENT;
    const latePhaseFraction = trialsIntoLatePhase / (trialsIntoLatePhase + LATE_PHASE_HALFWAY_TRIALS);
    return Math.min(96, Math.round(EARLY_PHASE_PERCENT + latePhasePercentRange * latePhaseFraction));
}

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
    if (tab === 'custom') return `roster:${JSON.stringify(roster.map(({ name, ...aniimo }) => aniimo))}`;
    return bestAniimoSetup();
}

function bestAniimoSetup() {
    return `best:${levelledAbilities().map(a => `${a}${bestAniimoLevel(a)}`).join(',')}`;
}

// What the last plan was solved from, so switching setup can work out another one without the
// player filling the form in again.
let lastPlanInput = null;

// Solves for `setup` if it isn't already worked out, and shows it when it lands if that's still
// what's selected. It runs in a worker of its own, which a newer pick stops, so quick roster
// edits don't queue a solve each. A run id guards against a newer Find the best plan click.
let setupSolve = null;
function ensurePlanFor(setup) {
    if (plansBySetup[setup] || !lastPlanInput || setupSolve?.setup === setup) return;
    stopSetupSolve();
    const runId = planRunId;
    const solver = new Worker(WORKER_URL, { type: 'module' });
    setupSolve = { setup, worker: solver };
    const done = (plan) => {
        solver.terminate();
        if (setupSolve?.worker === solver) setupSolve = null;
        if (runId !== planRunId) return;
        plansBySetup[setup] = plan;
        if (selectedAniimoSetup() === setup) showSelectedPlan();
    };
    solver.onmessage = (event) => {
        const { type, ok, result, error } = event.data;
        if (type === 'progress') return;
        done(ok ? JSON.parse(result) : { success: false, error });
    };
    solver.onerror = (event) => done({ success: false, error: event.message || 'The planner stopped' });
    // The levels are read afresh: the player may have changed which abilities they have since
    // the plan this input came from.
    solver.postMessage({ id: 1, type: 'find_plan', payload: JSON.stringify({ ...lastPlanInput, ...aniimoInput(setup) }) });
}

function stopSetupSolve() {
    setupSolve?.worker.terminate();
    setupSolve = null;
}

// Shows the selected setup, and works it out first if this is the first time it's been asked for.
function switchAniimoSetup() {
    showSelectedPlan();
    ensurePlanFor(selectedAniimoSetup());
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
    lastPlan = plan;
    displayPlan(plan);
    const isLevelUpRequested = planContext ? planContext.levelUp : isLevelUpStrategy();
    const planViable = plan.success && (!isLevelUpRequested || Boolean(plan.level_up));
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

export const EMODE_PRIORITY = [
    'Jukebox Dryer',
    'Simmering Pot',
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
    'Claw Game Cooker',
    'Dance Pad Polisher',
    'Aniipod Maker'
];

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
    if (powerRate >= 1.15) {
        // At 120% supply rate, total electrified load must be <= generator capacity / 1.2
        return Math.floor(generatorCapacity / 1.2);
    }
    // At 100% supply rate, total electrified load can reach 100% of generator capacity
    return generatorCapacity;
}

export function allocateDynamicEmode(basePlan, homeLevel, maxWatts = getTargetEmodeWatts()) {
    if (homeLevel < 12 || !basePlan || !basePlan.success) return {};

    const { facilities } = simpleSetup(homeLevel);
    const ownedCounts = {};
    for (const [name, tiers] of Object.entries(facilities)) {
        ownedCounts[name] = tiers.reduce((sum, t) => sum + t.count, 0);
    }

    // 1. Gather active producing facilities from basePlan (exclude Woodworking Bench and Chimney Kiln)
    const activeCounts = {};
    for (const step of basePlan.coin_items || []) {
        if (step.status === 'producing' && step.facility) {
            const fac = step.facility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '');
            const def = FACILITIES.find(f => f.name === fac);
            if (def && def.supportsEmode && fac !== 'Woodworking Bench' && fac !== 'Chimney Kiln') {
                activeCounts[fac] = (activeCounts[fac] || 0) + (step.facility_count || 1);
            }
        }
    }

    const emodeCounts = {};
    let usedWatts = 0;

    // Chiến lược 1: Cấp điện cho Nồi hầm (Simmering Pot - 75W)
    // Cấp điện ở 120% tốn 90s/cháo (so với 45s của Aniimo Lửa cấp 4), vừa giải phóng 1 Aniimo Lửa,
    // vừa khớp hoàn hảo với nhịp thu hoạch 2 vụ sâm/giờ mà không ngốn cạn nhân sâm và lúa mì.
    const potSeasonUsage = typeof getSeasonFacilityUsage === 'function' && seasonActive() ? (getSeasonFacilityUsage(basePlan.rate_per_second)['Simmering Pot'] || 0) : 0;
    const availablePots = Math.max(0, (ownedCounts['Simmering Pot'] || 0) - potSeasonUsage);
    const activePots = activeCounts['Simmering Pot'] || 0;
    const potWatts = FACILITY_POWER_WATTS['Simmering Pot'] || 75;
    if (availablePots >= 1 && activePots >= 1 && usedWatts + potWatts <= maxWatts) {
        emodeCounts['Simmering Pot'] = 1;
        usedWatts += potWatts;
    }

    // Chiến lược 2: Cấp điện cho Giếng nước (Well - 120W mỗi giếng)
    // Mỗi giếng nước cấp điện giải phóng 1 Aniimo Thủy quý giá chuyển sang tưới nước cho nông trại/lâm nghiệp (+33.3% tốc độ sinh trưởng).
    const activeWells = activeCounts['Well'] || 0;
    const wellWatts = FACILITY_POWER_WATTS['Well'] || 120;
    if (activeWells > 0) {
        for (let w = 0; w < activeWells; w++) {
            if (usedWatts + wellWatts <= maxWatts) {
                emodeCounts['Well'] = (emodeCounts['Well'] || 0) + 1;
                usedWatts += wellWatts;
            }
        }
    }

    // Rank remaining active processors by revenue from income streams
    const facRevenue = {};
    for (const s of basePlan.income_streams || []) {
        if (s.facility) {
            const fac = s.facility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '');
            facRevenue[fac] = (facRevenue[fac] || 0) + (s.rate_per_second || 0) * 3600;
        }
    }

    // Ưu tiên các cơ sở chế biến chính (Bàn chế tạo, Máy sấy, Cối xay, Khung dệt)
    // Tránh điện hóa Phonolfactory Table do bị nghẽn đầu vào aromathyst từ Dewy House
    const otherFacs = Object.keys(activeCounts)
        .filter(f => f !== 'Simmering Pot' && f !== 'Well' && f !== 'Phonolfactory Table')
        .sort((a, b) => (facRevenue[b] || 0) - (facRevenue[a] || 0));

    for (const fac of otherFacs) {
        const w = FACILITY_POWER_WATTS[fac] || 0;
        if (w <= 0) continue;
        const totalUnits = activeCounts[fac];
        for (let u = 0; u < totalUnits; u++) {
            if (usedWatts + w <= maxWatts) {
                emodeCounts[fac] = (emodeCounts[fac] || 0) + 1;
                usedWatts += w;
            } else {
                break;
            }
        }
    }

    return emodeCounts;
}

export function autoAllocateEmode(homeLevel, maxWatts = getTargetEmodeWatts(), activeProducingCounts = null) {
    if (homeLevel < 12) return {};
    const { facilities } = simpleSetup(homeLevel);
    let remainingWatts = maxWatts;
    const allocated = {};

    for (const name of EMODE_PRIORITY) {
        if (name === 'Woodworking Bench' || name === 'Chimney Kiln') continue;
        const fac = FACILITIES.find(f => f.name === name);
        if (!fac || !fac.supportsEmode) continue;
        const wattsPerUnit = FACILITY_POWER_WATTS[name] || 0;
        if (wattsPerUnit <= 0) continue;

        let availableUnits = (facilities[name] || []).reduce((sum, t) => sum + t.count, 0);
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

let lastEmodeCounts = {};

function activeEmodeFacilityCounts(activeProducingCounts = null) {
    if (Object.keys(lastEmodeCounts).length > 0) return lastEmodeCounts;
    const targetWatts = getTargetEmodeWatts();
    const homeLevel = selectedHomeLevel();
    const emodeOn = document.getElementById('emode-simple-on')?.checked ?? true;
    if (!emodeOn || homeLevel < 12) return {};
    return autoAllocateEmode(homeLevel, targetWatts, activeProducingCounts);
}

function activeEmodeFacilities(activeProducingCounts = null) {
    return Object.keys(activeEmodeFacilityCounts(activeProducingCounts));
}

function calculatePowerWatts(counts) {
    let total = 0;
    for (const [name, count] of Object.entries(counts || {})) {
        const w = FACILITY_POWER_WATTS[name] || 0;
        total += w * count;
    }
    return total;
}

function updatePowerGauge(customCounts = null) {
    const maxWatts = getGeneratorCapacity();
    const rate = getPowerGridRate();
    const targetWatts = getTargetEmodeWatts(maxWatts, rate);
    const counts = customCounts !== null ? customCounts : lastEmodeCounts;
    const totalWatts = calculatePowerWatts(counts);
    const pct = Math.min(100, Math.round((totalWatts / maxWatts) * 100));

    // Simple gauge
    const simpleVal = document.getElementById('simple-power-gauge-value');
    const simpleFill = document.getElementById('simple-power-gauge-fill');
    if (simpleVal && simpleFill) {
        const targetLabel = rate >= 1.15 ? ` (120% cap: ${targetWatts}W)` : '';
        simpleVal.textContent = `${totalWatts}W / ${maxWatts}W (${pct}%)${targetLabel}`;
        simpleFill.style.width = `${Math.min(100, (totalWatts / maxWatts) * 100)}%`;
        simpleFill.classList.toggle('overload', totalWatts > targetWatts);
    }
}

export function getPowerGridRate() {
    const el = document.getElementById('simple-power-grid-rate');
    const val = el ? parseFloat(el.value) : 100;
    return val >= 115 ? 1.2 : 1.0;
}

function defaultFacilityTiers() {
    const tiers = {};
    FACILITIES.forEach(f => {
        tiers[f.name] = [{ count: f.defaultCount, level: 1 }];
    });
    return tiers;
}

// Renders one facility's tier rows (Count + Level inputs, a remove button once there's more than
// one tier, and, only for facilities that level up, an "Add level" button) into its
// `.facility-tiers` container. Called on initial render and again, for just that one facility,
// whenever a tier is added or removed, so editing one facility never disturbs another's inputs.
function renderTierRows(name) {
    const f = FACILITIES.find(fac => fac.name === name);
    const container = document.querySelector(`.facility-tiers[data-facility="${name}"]`);
    if (!f || !container) return;
    const tiers = facilityTiers[name];
    const showRemove = tiers.length > 1;
    container.innerHTML = tiers.map((tier, i) => `
        <div class="facility-inputs tier-row" data-tier-index="${i}">
            <div class="input-field">
                <label>Count</label>
                <input type="number" class="tier-count" value="${tier.count}" min="0" max="999">
            </div>
            ${f.hasLevels === false ? '' : `
            <div class="input-field">
                <label>Level</label>
                <input type="number" class="tier-level" value="${tier.level}" min="1" max="10">
            </div>
            `}
            ${showRemove ? '<button type="button" class="tier-remove-btn" title="Remove this level">&times;</button>' : ''}
        </div>
    `).join('');
}

// Build the facility-card inputs, grouped into a labeled section per category. Runs before other
// DOM setup. Tier-row inputs and buttons are handled via event delegation (see
// `attachFacilityTierHandlers`) rather than per-element listeners, since rows are added/removed
// dynamically after this initial render.
function renderFacilityCards() {
    const grid = document.getElementById('facilities-grid');
    if (!grid) return;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const VI_CATEGORIES = {
        'Materials': 'Nguyên liệu',
        'Environment': 'Cơ sở môi trường',
        'Aniimo Materials': 'Nguyên liệu Aniimo',
        'Wood & Ore Processing': 'Sản xuất gỗ và gạch quặng',
        'Materials Processing': 'Cơ sở chế biến'
    };
    grid.innerHTML = FACILITY_CATEGORIES.map(category => {
        const catName = isVi && VI_CATEGORIES[category] ? VI_CATEGORIES[category] : category;
        const cards = FACILITIES.filter(f => f.category === category).map(f => `
            <div class="facility-card">
                <h4>${getFacilityDisplayName(f.name)} <span class="info-icon" data-tooltip="${f.tooltip}">?</span></h4>
                <div class="facility-tiers" data-facility="${f.name}"></div>
                ${f.hasLevels === false ? '' : '<button type="button" class="add-tier-btn" data-facility="' + f.name + '">+ Add level</button>'}
                ${f.supportsEmode ? `<label class="facility-emode-toggle" title="Run in Electric Mode (automatic, no Aniimo worker needed)"><input type="checkbox" class="facility-emode-checkbox" data-facility="${f.name}" ${emodeFacilities.has(f.name) ? 'checked' : ''}> ⚡ E-mode</label>` : ''}
            </div>
        `).join('');
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${catName}</h4>
                <div class="facilities-grid">${cards}</div>
            </div>
        `;
    }).join('');
    FACILITIES.forEach(f => renderTierRows(f.name));
}

function attachEmodeHandlers() {
    const grid = document.getElementById('facilities-grid');
    if (grid) {
        grid.addEventListener('change', (e) => {
            if (e.target.classList.contains('facility-emode-checkbox')) {
                const fac = e.target.dataset.facility;
                if (e.target.checked) {
                    emodeFacilities.add(fac);
                } else {
                    emodeFacilities.delete(fac);
                }
                updatePowerGauge();
                saveInputsToStorage();
            }
        });
    }

    const autoBtn = document.getElementById('emode-auto-btn');
    if (autoBtn) {
        autoBtn.addEventListener('click', () => {
            let remainingWatts = getTargetEmodeWatts();
            emodeFacilities.clear();
            for (const name of EMODE_PRIORITY) {
                const fac = FACILITIES.find(f => f.name === name);
                if (!fac || !fac.supportsEmode) continue;
                const w = FACILITY_POWER_WATTS[name] || 0;
                const owned = (facilityTiers[name] || []).reduce((sum, t) => sum + t.count, 0);
                if (owned > 0 && remainingWatts >= w * owned) {
                    emodeFacilities.add(name);
                    remainingWatts -= w * owned;
                }
            }
            document.querySelectorAll('.facility-emode-checkbox').forEach(cb => {
                cb.checked = emodeFacilities.has(cb.dataset.facility);
            });
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const allBtn = document.getElementById('emode-all-btn');
    if (allBtn) {
        allBtn.addEventListener('click', () => {
            FACILITIES.filter(f => f.supportsEmode).forEach(f => emodeFacilities.add(f.name));
            document.querySelectorAll('.facility-emode-checkbox').forEach(cb => cb.checked = true);
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const noneBtn = document.getElementById('emode-none-btn');
    if (noneBtn) {
        noneBtn.addEventListener('click', () => {
            emodeFacilities.clear();
            document.querySelectorAll('.facility-emode-checkbox').forEach(cb => cb.checked = false);
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const rateSelect = document.getElementById('power-grid-rate');
    const simpleRate = document.getElementById('simple-power-grid-rate');
    if (rateSelect) {
        rateSelect.addEventListener('change', () => {
            if (simpleRate) simpleRate.value = rateSelect.value;
            updatePowerGauge();
            saveInputsToStorage();
        });
    }
    if (simpleRate) {
        simpleRate.addEventListener('change', () => {
            if (rateSelect) rateSelect.value = simpleRate.value;
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const genSelect = document.getElementById('generator-capacity');
    const simpleGen = document.getElementById('simple-generator-capacity');
    if (genSelect) {
        genSelect.addEventListener('change', () => {
            if (simpleGen) simpleGen.value = genSelect.value;
            updatePowerGauge();
            saveInputsToStorage();
        });
    }
    if (simpleGen) {
        simpleGen.addEventListener('change', () => {
            if (genSelect) genSelect.value = simpleGen.value;
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const simpleToggle = document.getElementById('emode-simple-on');
    if (simpleToggle) {
        simpleToggle.addEventListener('change', () => {
            updatePowerGauge();
            saveInputsToStorage();
        });
    }

    const homeSelect = document.getElementById('home-level');
    if (homeSelect) {
        homeSelect.addEventListener('change', () => {
            updateSimpleEmodeState();
        });
    }
}

function updateSimpleEmodeState() {
    const homeLevel = selectedHomeLevel();
    const hint = document.getElementById('emode-simple-hint');
    const toggle = document.getElementById('emode-simple-on');
    const rateField = document.getElementById('emode-simple-rate-field');
    const genField = document.getElementById('emode-simple-generator-field');
    const gauge = document.getElementById('simple-power-gauge-container');

    const defaultWatts = GENERATOR_WATTS_BY_HOME_LEVEL[homeLevel] || DEFAULT_GENERATOR_WATTS;
    const simpleGen = document.getElementById('simple-generator-capacity');
    const genSelect = document.getElementById('generator-capacity');
    if (simpleGen) simpleGen.value = String(defaultWatts);
    if (genSelect) genSelect.value = String(defaultWatts);

    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (homeLevel < 12) {
        if (toggle) toggle.disabled = true;
        if (rateField) rateField.style.opacity = '0.5';
        if (genField) genField.style.opacity = '0.5';
        if (gauge) gauge.style.opacity = '0.5';
        if (hint) hint.innerHTML = isVi
            ? '<span style="color: var(--text-muted);">⚡ Chế độ điện mở khóa tại <strong>RV 12</strong>.</span>'
            : '<span style="color: var(--text-muted);">⚡ Electric Mode unlocks at <strong>RV 12</strong>.</span>';
    } else {
        if (toggle) toggle.disabled = false;
        if (rateField) rateField.style.opacity = '1';
        if (genField) genField.style.opacity = '1';
        if (gauge) gauge.style.opacity = '1';
        if (hint) hint.innerHTML = isVi
            ? 'Tự động cân bằng điện trong giới hạn máy phát. Giải phóng công nhân Aniimo ở các cơ sở dùng điện; các cơ sở còn lại chạy thủ công với Aniimo.'
            : 'Auto-balances power within generator limit. Frees Aniimo workers on electric units; remaining units run manually with Aniimo.';
    }
    updatePowerGauge();
}

// Delegated handlers for the facility grid, covering tier rows added/removed after initial
// render: editing a Count/Level input updates `facilityTiers` and persists it; "+ Add level"
// appends a new tier (guessing the next level up from the highest owned, capped at 10); "×"
// removes a tier. Attach once, on the grid container, rather than per-row.
function attachFacilityTierHandlers() {
    const grid = document.getElementById('facilities-grid');
    if (!grid) return;

    grid.addEventListener('input', (e) => {
        const row = e.target.closest('.tier-row');
        if (!row) return;
        const container = e.target.closest('.facility-tiers');
        const name = container.dataset.facility;
        const idx = parseInt(row.dataset.tierIndex, 10);
        const tier = facilityTiers[name][idx];
        if (e.target.classList.contains('tier-count')) {
            tier.count = numberOrDefault(e.target.value, 0);
        } else if (e.target.classList.contains('tier-level')) {
            tier.level = numberOrDefault(e.target.value, 1);
        }
        saveInputsToStorage();
    });

    grid.addEventListener('click', (e) => {
        const addBtn = e.target.closest('.add-tier-btn');
        if (addBtn) {
            const name = addBtn.dataset.facility;
            const tiers = facilityTiers[name];
            const nextLevel = Math.min(10, Math.max(...tiers.map(t => t.level)) + 1);
            tiers.push({ count: 1, level: nextLevel });
            renderTierRows(name);
            saveInputsToStorage();
            return;
        }
        const removeBtn = e.target.closest('.tier-remove-btn');
        if (removeBtn) {
            const row = removeBtn.closest('.tier-row');
            const container = removeBtn.closest('.facility-tiers');
            const name = container.dataset.facility;
            const idx = parseInt(row.dataset.tierIndex, 10);
            facilityTiers[name].splice(idx, 1);
            renderTierRows(name);
            saveInputsToStorage();
        }
    });

    // Enter key inside a tier input triggers a full plan recalculation, same as every other
    // input; delegated (rather than the per-input listener loop used for static inputs) since
    // tier inputs come and go as levels are added/removed.
    grid.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.matches('input')) {
            runFindPlan();
        }
    });
}

// --- Local persistence -----------------------------------------------------------------
// Saves/restores form inputs via localStorage so values survive a page reload. Purely
// client-side (no account, no server); works identically on localhost and once this is
// hosted on GitHub Pages, since localStorage is scoped to the page's own origin.
const _LEGACY_STORAGE_KEY = 'aniimax-config-v1';
const STORAGE_KEY = 'aniimolab-config-v1';

// True once the player has picked a rate unit themselves this visit. Until then a fresh plan
// picks the unit it reads best at; after it, their choice stands.
let rateUnitChosen = false;

// Every plain input ID whose value should be persisted (facility tiers are saved separately;
// see `facilityTiers`/`initFacilityTiers`, since they're a dynamic list rather than one fixed
// element per facility).
function getPersistedFieldIds() {
    return [
        'target-amount', 'current-amount',
        'strategy-level-up', 'strategy-priorities', 'level-up-target',
        'mode-simple', 'mode-advanced', 'home-level',
        'ecological-module-level', 'kitchen-module-level',
        'resource-detector-level', 'crafting-module-level',
        'rate-unit', 'season-on', 'layout-sim-on', 'power-grid-rate',
        'emode-simple-on', 'simple-power-grid-rate',
        'generator-capacity', 'simple-generator-capacity',
        'season-radish-plots', 'season-pepper-plots'
    ];
}

// Reads and parses the saved config blob, or `null` if there isn't one / it's corrupt.
function readStorage() {
    try {
        const raw = (localStorage.getItem(STORAGE_KEY) || localStorage.getItem(_LEGACY_STORAGE_KEY));
        return raw ? migrateSavedConfig(JSON.parse(raw)) : null;
    } catch (e) {
        console.warn('Could not load saved inputs from localStorage:', e);
        return null;
    }
}

// Carries a save made under an older name forward to its current one, so a returning user keeps
// their inputs across a rename instead of silently falling back to defaults. The full release
// renamed Mineral Pile to Mine and the Mineral Detector module to Resource Detector.
function migrateSavedConfig(data) {
    if (!data || typeof data !== 'object') return data;
    // Saves from before simple mode existed hold a hand-entered setup; keep showing it.
    if (data['mode-simple'] === undefined && data.facilityTiers) {
        data['mode-simple'] = false;
        data['mode-advanced'] = true;
    }
    const tiers = data.facilityTiers;
    if (tiers && tiers['Mine'] === undefined && tiers['Mineral Pile'] !== undefined) {
        tiers['Mine'] = tiers['Mineral Pile'];
    }
    if (data['resource-detector-level'] === undefined && data['mineral-detector-level'] !== undefined) {
        data['resource-detector-level'] = data['mineral-detector-level'];
    }
    return data;
}

// Populates the module-level `facilityTiers` from a saved config blob (see `readStorage`),
// falling back to defaults for any facility missing from it; covers both a fresh page load
// (no save yet) and a facility newly added to `FACILITIES` since the user's last save.
function initFacilityTiers(data) {
    const defaults = defaultFacilityTiers();
    const saved = (data && data.facilityTiers) || {};
    facilityTiers = {};
    FACILITIES.forEach(f => {
        const tiers = saved[f.name];
        facilityTiers[f.name] = Array.isArray(tiers) && tiers.length > 0
            ? tiers.map(t => ({
                count: numberOrDefault(t.count, 0),
                level: f.hasLevels === false ? 1 : numberOrDefault(t.level, 1)
            }))
            : defaults[f.name];
    });

}

function saveInputsToStorage() {
    const data = {
        facilityTiers,
        levelUpStock,
        skippedRecipes: [...skippedRecipes],
        unlockedSpecial: [...unlockedSpecial],
        priorities: priorityOrder,
        aniimoLevels,
        roster,
        emodeFacilities: [...emodeFacilities],
        seasonRadishPlots,
        seasonPepperPlots,
        selectedSeasonDishes: [...selectedSeasonDishes],
    };
    getPersistedFieldIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        data[id] = (el.type === 'checkbox' || el.type === 'radio') ? el.checked : el.value;
    });
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.warn('Could not save inputs to localStorage:', e);
    }
}

function loadInputsFromStorage(data) {
    if (!data) return;
    if (typeof data.seasonRadishPlots === 'number') seasonRadishPlots = data.seasonRadishPlots;
    if (typeof data.seasonPepperPlots === 'number') seasonPepperPlots = data.seasonPepperPlots;
    if (Array.isArray(data.selectedSeasonDishes)) {
        selectedSeasonDishes = new Set(data.selectedSeasonDishes.filter(n => typeof n === 'string'));
    }
    if (Array.isArray(data.emodeFacilities)) {
        emodeFacilities = new Set(data.emodeFacilities);
        document.querySelectorAll('.facility-emode-checkbox').forEach(cb => {
            cb.checked = emodeFacilities.has(cb.dataset.facility);
        });
    }
    if (data.levelUpStock && typeof data.levelUpStock === 'object') levelUpStock = { ...data.levelUpStock };
    if (Array.isArray(data.skippedRecipes)) skippedRecipes = new Set(data.skippedRecipes.filter(n => typeof n === 'string'));
    if (Array.isArray(data.unlockedSpecial)) unlockedSpecial = new Set(data.unlockedSpecial.filter(n => typeof n === 'string'));
    if (Array.isArray(data.priorities)) {
        const saved = data.priorities.filter(p => PRIORITY_TARGETS.some(t => t.id === p?.target));
        const missing = PRIORITY_TARGETS.filter(t => !saved.some(p => p.target === t.id)).map(t => ({ target: t.id, on: false }));
        priorityOrder = [...saved.map(p => ({ target: p.target, on: !!p.on })), ...missing];
    } else if (data['strategy-coins'] || data['strategy-exp'] || data['strategy-aniipods']) {
        // Saves from before Priorities picked one "Most ..." tab; carry that choice over.
        const first = data['strategy-exp'] ? 'aniimo_exp' : data['strategy-aniipods'] ? 'aniipods' : 'coins';
        priorityOrder = [first, ...PRIORITY_TARGETS.map(t => t.id).filter(id => id !== first)]
            .map(target => ({ target, on: target === first }));
        data['strategy-priorities'] = true;
    }
    if (data.aniimoLevels && typeof data.aniimoLevels === 'object') {
        aniimoLevels = Object.fromEntries(Object.entries(data.aniimoLevels)
            .filter(([ability, level]) => ABILITY_BY_NAME.has(ability) && Number.isInteger(Number(level)) && level >= 1 && level <= 4)
            .map(([ability, level]) => [ability, Number(level)]));
    }
    if (Array.isArray(data.roster)) {
        roster = data.roster
            .filter(a => a && typeof a === 'object' && a.abilities && typeof a.abilities === 'object')
            .map(a => ({
                name: typeof a.name === 'string' ? a.name : '',
                count: Math.max(1, Math.round(Number(a.count)) || 1),
                abilities: Object.fromEntries(Object.entries(a.abilities)
                    .filter(([ability, level]) => ABILITY_BY_NAME.has(ability) && Number.isInteger(Number(level)) && level >= 1 && level <= 4)
                    .map(([ability, level]) => [ability, Number(level)])),
                personalities: PERSONALITY_PAIRS.map((pair, p) => pair.names.includes(a.personalities?.[p]) ? a.personalities[p] : pair.names[0]),
            }));
    }
    getPersistedFieldIds().forEach(id => {
        if (!(id in data)) return;
        const el = document.getElementById(id);
        if (!el) return;
        if (el.type === 'checkbox' || el.type === 'radio') {
            el.checked = !!data[id];
        } else {
            el.value = data[id];
        }
    });
    levelUpTargetChosen = 'level-up-target' in data;
    updatePowerGauge();
}

// Auto-save on every change to a persisted static field (facility tier inputs save themselves;
// see `attachFacilityTierHandlers`).
function attachAutoSave() {
    getPersistedFieldIds().forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        const eventName = (el.type === 'checkbox' || el.type === 'radio' || el.tagName === 'SELECT') ? 'change' : 'input';
        el.addEventListener(eventName, saveInputsToStorage);
    });
}

function clearSavedInputs() {
    const confirmMsg = window.i18n ? window.i18n.t('clear_saved_confirm') : 'Are you sure you want to reset all saved inputs to default?';
    if (!confirm(confirmMsg)) return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Could not clear saved inputs from localStorage:', e);
    }
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
    const chip = (count, name, level) => `
        <div class="chip"><span><span class="chip-count">${count}</span> ${name}</span>${level ? `<span class="chip-level">${level}</span>` : ''}</div>`;
    const built = FACILITIES
        .map(f => ({ name: f.name, tier: facilities[f.name][0], hasLevels: f.hasLevels !== false }))
        .filter(({ tier }) => tier.count > 0)
        .map(({ name, tier, hasLevels }) => chip(`${tier.count}×`, getFacilityDisplayName(name), hasLevels ? `Lv.${tier.level}` : ''))
        .join('');
    const moduleChips = [
        ['Ecological Module', modules.ecological_module],
        ['Kitchen Module', modules.kitchen_module],
        ['Resource Detector', modules.resource_detector],
        ['Crafting Module', modules.crafting_module],
    ].map(([name, level]) => chip('', getModuleDisplayName(name), level > 0 ? `Lv.${level}` : (isVi ? 'chưa mở' : 'not yet'))).join('');
    const kinds = FACILITIES.filter(f => facilities[f.name][0].count > 0).length;
    const titleEl = document.getElementById('simple-summary-title');
    if (titleEl) titleEl.textContent = isVi
        ? `${kinds} cơ sở và 4 mô-đun tại RV ${homeLevel}`
        : `${kinds} facilities and 4 modules at RV ${homeLevel}`;
    const sumEl = document.getElementById('simple-summary');
    if (sumEl) sumEl.innerHTML = `
        <p class="assume-title">${isVi ? 'Cơ sở' : 'Facilities'}</p>
        <div class="chip-grid">${built}</div>
        <p class="assume-title">${isVi ? 'Mô-đun' : 'Modules'}</p>
        <div class="chip-grid">${moduleChips}</div>`;
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
    const homeSelect = document.getElementById('home-level');
    if (homeSelect) {
        homeSelect.addEventListener('change', () => {
            renderSimpleSummary();
            renderStrategy();
            updateProductionAniimoCap();
            updateSimpleEmodeState();
            updatePowerGauge();
        });
    }
}

// --- Special recipes -------------------------------------------------------------------
// Recipes unlocked with a rare currency (see `SPECIAL_RECIPES`): left out of plans unless ticked.

let unlockedSpecial = new Set();
const SPECIAL_NAMES = new Set(SPECIAL_RECIPES.map(r => r.name));

function renderSpecialRecipes() {
    const grid = document.getElementById('special-grid');
    if (!grid) return;
    const currentRv = selectedHomeLevel();
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    grid.innerHTML = SPECIAL_RECIPES.map(r => {
        const checked = unlockedSpecial.has(r.name);
        const unlockRv = r.unlockRV || 1;
        const isLocked = isSimpleMode() && currentRv < unlockRv;
        const rvBadgeText = isVi
            ? `Mở khóa tại RV ${unlockRv}`
            : `Unlocks at RV ${unlockRv}`;
        return `
        <label class="special-recipe-card ${checked ? 'active' : ''}">
            <input type="checkbox" class="special-card-checkbox" data-special="${r.name}"${checked ? ' checked' : ''}>
            <div class="special-card-thumb">
                ${renderItemIcon(r.name)}
            </div>
            <div class="special-card-info">
                <span class="special-card-name">${getItemDisplayName(r.name)}</span>
                <span class="special-card-facility">
                    ${renderFacilityIcon(r.facility)}
                    <span>${getFacilityDisplayName(r.facility)}</span>
                </span>
                <span class="special-rv-badge ${isLocked ? 'rv-future' : ''}">${rvBadgeText}</span>
            </div>
        </label>`;
    }).join('');
    renderRecipeCount();
}

function attachSpecialHandlers() {
    const grid = document.getElementById('special-grid');
    if (!grid) return;
    grid.addEventListener('change', (e) => {
        const name = e.target.dataset.special;
        if (!name) return;
        if (e.target.checked) unlockedSpecial.add(name); else unlockedSpecial.delete(name);
        e.target.closest('.special-recipe-card')?.classList.toggle('active', e.target.checked);
        renderRecipeCount();
        saveInputsToStorage();
    });
}

// --- Opportunities ---------------------------------------------------------------------
// After each plan, what the player could change to do better, best first: a locked recipe, an
// Aniimo a level higher, and in Advanced mode a module level or one more facility or facility
// level. Only changes within reach: Simple mode already has everything its RV level allows, and
// Advanced mode goes up to the lowest RV level that allows everything entered. Each change is
// solved in full in a worker of its own (see `rankImprovements` in worker.js), so planning never
// waits on it, and it's measured by what the plan leads with (see `rankMeasure`).

let rankWorkers = [];
let rankRunId = 0;
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
    rankRunId++;
    rankWorkers.forEach(worker => worker.terminate());
    rankWorkers = [];
}

// How many workers share the ranking: up to six, leaving cores for the page, the plan's own worker
// and the layout's.
const RANK_WORKERS = Math.max(1, Math.min(6, (navigator.hardwareConcurrency || 2) - 3));

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
function homeLevelCovering(input) {
    for (let level = 1; level <= MAX_HOME_LEVEL; level++) {
        const allowed = simpleSetup(level);
        const facilitiesFit = FACILITIES.every(f => {
            const have = input.facilities[f.name];
            if (tierCount(have) === 0) return true;
            const cap = allowed.facilities[f.name];
            return tierCount(have) <= tierCount(cap) && (f.hasLevels === false || tierLevel(have) <= tierLevel(cap));
        });
        const modulesFit = Object.entries(input.modules).every(([name, level_]) => level_ <= (allowed.modules[name] ?? 0));
        if (facilitiesFit && modulesFit) return level;
    }
    return MAX_HOME_LEVEL;
}

// Every change within reach of `base` (a plan input), as `{ label, input, group }`. Changes
// sharing a `group` are one thing taken further and further (a module at each level up to what
// the RV level allows), listed least first; the card shows the least one that gets the most.
function improvementCandidates(base, setup) {
    const candidates = [];
    const owns = name => tierCount(base.facilities[name]) > 0;

    // Recipes the player hasn't unlocked, at a facility they have.
    const skipped = new Set(planContext?.skipped ?? skippedRecipes);
    const locked = [
        ...SPECIAL_RECIPES.map(r => ({ ...r, note: false })),
        ...(base.season ? SEASON.recipeNotes.map(r => ({ ...r, note: true })) : []),
    ];
    for (const recipe of locked) {
        if (!base.exclude.includes(recipe.name) || skipped.has(recipe.name)) continue;
        if (recipe.facility && !owns(recipe.facility)) continue;
        candidates.push({
            kind: 'Recipes',
            label: recipe.note ? `Recipe Note: ${prettyItem(recipe.name)}` : `Unlock ${prettyItem(recipe.name)}`,
            input: { ...base, exclude: base.exclude.filter(name => name !== recipe.name) },
        });
    }
    // Recipes the player skipped: they may have a reason, but they should know what it costs.
    for (const name of [...skipped].sort((a, b) => prettyItem(a).localeCompare(prettyItem(b)))) {
        if (!base.exclude.includes(name)) continue;
        candidates.push({
            kind: 'Recipes',
            label: `Unskip ${prettyItem(name)}`,
            input: { ...base, exclude: base.exclude.filter(n => n !== name) },
        });
    }

    // Every level above the one given is tried, here and below, since one level can gain nothing
    // while the next gains a lot.
    const levelsAbove = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => from + 1 + i);

    // An Aniimo at a higher level, up to the highest the game is known to have.
    const abilities = new Set(FACILITIES.filter(f => f.ability && owns(f.name)).map(f => f.ability));
    if (setup.startsWith('roster') && base.roster) {
        // One of the player's own Aniimo at a higher level, in each ability it has that matters
        // here. Of several alike, just one is trained up, on a card of its own.
        base.roster.members.forEach((member, i) => {
            const who = roster[i]?.name.trim() ? escapeText(roster[i].name.trim()) : `${rosterLabel(roster[i] || member, i)} Aniimo`;
            for (const [ability, level] of Object.entries(member.abilities).filter(([a]) => abilities.has(a))) {
                for (const next of levelsAbove(level, defaultLevelFor(ability))) {
                    const trained = { ...member, count: 1, abilities: { ...member.abilities, [ability]: next } };
                    const members = member.count > 1
                        ? [...base.roster.members.map((m, k) => (k === i ? { ...m, count: m.count - 1 } : m)), trained]
                        : base.roster.members.map((m, k) => (k === i ? trained : m));
                    const family = `${member.count > 1 ? 'One ' : ''}${who}: ${ability}`;
                    candidates.push({
                        kind: 'Aniimo', group: `roster:${i}:${ability}`, family, level: next,
                        label: `${family} Lv.${next}`,
                        input: { ...base, roster: { ...base.roster, members } },
                    });
                }
            }
        });
    }
    if (setup.startsWith('best')) {
        for (const ability of levelledAbilities().filter(a => abilities.has(a))) {
            const level = base.aniimo_levels[ability] ?? defaultLevelFor(ability);
            for (const next of levelsAbove(level, defaultLevelFor(ability))) {
                candidates.push({
                    kind: 'Aniimo', group: `aniimo:${ability}`, family: `${ability} Aniimo`, level: next,
                    label: `${ability} Aniimo Lv.${next}`,
                    input: { ...base, aniimo_levels: { ...base.aniimo_levels, [ability]: next } },
                });
            }
        }
    }

    // Advanced mode: a module at a higher level, one more facility, or one facility at a higher
    // level, within what the RV level covering the rest allows.
    if (planContext && !planContext.simple) {
        const allowed = simpleSetup(homeLevelCovering(base));
        for (const [module, level] of Object.entries(base.modules)) {
            for (const next of levelsAbove(level, allowed.modules[module] ?? 0)) {
                candidates.push({
                    kind: 'Modules', group: `module:${module}`, family: MODULE_NAMES[module] || module, level: next,
                    label: `${MODULE_NAMES[module] || module} Lv.${next}`,
                    input: { ...base, modules: { ...base.modules, [module]: next } },
                });
            }
        }
        for (const f of FACILITIES) {
            const tiers = (base.facilities[f.name] || []).filter(t => t.count > 0);
            const cap = allowed.facilities[f.name];
            const capLevel = f.hasLevels === false ? 1 : tierLevel(cap);
            if (tierCount(tiers) < tierCount(cap)) {
                for (const level of levelsAbove(0, capLevel)) {
                    candidates.push({
                        kind: 'Facilities', group: `another:${f.name}`, family: `+1 ${f.name}`,
                        level: f.hasLevels === false || capLevel === 1 ? null : level,
                        label: f.hasLevels === false || capLevel === 1 ? `+1 ${f.name}` : `+1 ${f.name} (Lv.${level})`,
                        input: { ...base, facilities: { ...base.facilities, [f.name]: [...tiers, { count: 1, level }] } },
                    });
                }
            }
            if (f.hasLevels === false || tiers.length === 0) continue;
            const lowest = tiers.reduce((a, b) => (b.level < a.level ? b : a));
            for (const level of levelsAbove(lowest.level, capLevel)) {
                const raised = tiers
                    .map(t => (t === lowest ? { ...t, count: t.count - 1 } : t))
                    .filter(t => t.count > 0)
                    .concat({ count: 1, level });
                candidates.push({
                    kind: 'Facilities', group: `upgrade:${f.name}`, level,
                    family: tierCount(tiers) > 1 ? `1 ${f.name} to` : `${f.name} to`,
                    label: tierCount(tiers) > 1 ? `1 ${f.name} to Lv.${level}` : `${f.name} to Lv.${level}`,
                    input: { ...base, facilities: { ...base.facilities, [f.name]: raised } },
                });
            }
        }
    }
    return candidates;
}

// Starts ranking what could improve the plan on screen, unless it's already been worked out.
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
    const runId = rankRunId;
    const current = ranking;
    // The candidates dealt out across the workers, each keeping their place in the list.
    const shares = Array.from({ length: Math.min(RANK_WORKERS, candidates.length) }, () => []);
    candidates.forEach((candidate, i) => shares[i % shares.length].push(i));
    let running = shares.length;
    let failed = false;
    rankWorkers = shares.map(indices => {
        const worker = new Worker(WORKER_URL, { type: 'module' });
        worker.onmessage = (event) => {
            if (runId !== rankRunId) return;
            const { type, count: result, ok } = event.data;
            if (type === 'progress') {
                if (result.index === -1) current.base ||= result;
                else current.results[indices[result.index]] = result;
                setStep('improve', 'start', `${current.results.filter(Boolean).length} of ${candidates.length}`);
            } else {
                if (!ok) console.warn('Ranking changes failed:', event.data.error);
                finish(!ok);
            }
            if (ranking === current) renderImprovements();
        };
        let finished = false;
        const finish = (fail) => {
            if (finished) return;
            finished = true;
            failed ||= fail;
            worker.terminate();
            if (--running === 0) {
                current.done = true;
                if (!failed) rankingsBySetup[setup] = current;
                setStep('improve', failed ? 'fail' : 'done', `${candidates.length} changes`);
                rankWorkers = [];
            }
        };
        worker.onerror = (event) => {
            if (runId !== rankRunId) return;
            console.warn('Ranking changes failed:', event.message || event);
            finish(true);
            if (ranking === current) renderImprovements();
        };
        worker.postMessage({
            id: 1,
            type: 'rank_improvements',
            // The plan's own first solve is the plan as it stands, so no worker solves it again.
            payload: JSON.stringify({ measure, base, candidates: indices.map(i => candidates[i].input), baseTop: plansBySetup[setup]?.measure_top }),
        });
        return worker;
    });
}

// The smallest gain worth showing (see `RANK_MIN_GAIN` in worker.js).
const RANK_MIN_GAIN = 1e-3;

// How a change compares with the plan, or null if it doesn't help: `{ score, text }`, with
// `score` ordering changes that move the measure ahead of those that only earn more Home Coins.
function improvementGain(result) {
    const base = ranking.base;
    if (!result || result.top == null || !base || base.top == null) return null;
    const about = result.proven === false || base.proven === false ? '~' : '';
    const { multiplier, suffix } = RATE_UNIT_SECONDS[document.getElementById('rate-unit').value] || RATE_UNIT_SECONDS.second;
    if (result.top > base.top * (1 + RANK_MIN_GAIN) + 1e-12) {
        if (ranking.measure === 'level_up') {
            const before = base.top > 0 ? PACE_UNIT_SECONDS / base.top : null;
            const after = PACE_UNIT_SECONDS / result.top;
            return {
                score: 1 + (before ? (before - after) / before : 1),
                text: before
                    ? `${about}−${formatDuration(before - after)} level-up (${formatDuration(after)})`
                    : `Level-up in ${about}${formatDuration(after)}`,
            };
        }
        const label = ranking.measure === 'coins' ? 'Home Coins' : priorityLabel(ranking.measure, planContext?.aniipod);
        const added = `+${formatRate((result.top - base.top) * multiplier)}${suffix}`;
        return {
            score: 1 + (base.top > 0 ? (result.top - base.top) / base.top : 1),
            text: base.top > 0 ? `${about}+${formatPercent((result.top - base.top) / base.top)} ${label} (${added})` : `${about}${added} ${label}`,
        };
    }
    const coins = result.coins;
    if (coins && coins.base > 0 && coins.value > coins.base * (1 + RANK_MIN_GAIN)) {
        const gain = (coins.value - coins.base) / coins.base;
        return {
            score: gain,
            text: `${about}+${formatPercent(gain)} Home Coins (+${formatRate((coins.value - coins.base) * multiplier)}${suffix})`,
        };
    }
    return null;
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
    const checked = ranking.results.filter(Boolean).length;
    const total = ranking.candidates.length;
    const within = ranking.homeLevel ? ` Within RV ${ranking.homeLevel} limits.` : '';
    const by = ranking.measure === 'level_up' ? 'level-up time, then Home Coins'
        : ranking.measure === 'coins' ? 'Home Coins' : `${priorityLabel(ranking.measure, planContext?.aniipod)}, then Home Coins`;
    // One row per change, or per group: the least of it that gets the most it can (see
    // `improvementCandidates`).
    const best = new Map();
    ranking.candidates.forEach((candidate, i) => {
        const gain = improvementGain(ranking.results[i]);
        if (!gain) return;
        const key = candidate.group || `#${i}`;
        const held = best.get(key);
        if (!held || gain.score > held.gain.score * (1 + RANK_MIN_GAIN)) best.set(key, { candidate, gain });
    });
    const rows = [...best.values()].sort((a, b) => b.gain.score - a.gain.score);
    const options = new Set(ranking.candidates.map((c, i) => c.group || `#${i}`)).size;
    const status = total === 0 ? `Nothing left to unlock or upgrade.${within}`
        : !ranking.done ? `Checking ${checked} of ${total}…${within}`
            : rows.length === 0 ? `No improvements found (${options} checked).${within}`
                : `Ranked by ${by}. ${rows.length} of ${options} help.${within}`;
    // The status line opens what was checked. The card is rebuilt as each result comes in; keep
    // the list open if the player opened it.
    const open = !!document.querySelector('#improve-list .improve-checked')?.open;
    document.getElementById('improve-list').innerHTML = improvementsChecked(best, status, open) + (rows.length
        ? `<ol class="improve-list">${rows.map(r => `<li><span class="improve-name">${r.candidate.label}</span><span class="improve-gain">${r.gain.text}</span></li>`).join('')}</ol>`
        : '');
}

// Everything the ranking tries, by kind, each with how it came out: the gain, "no gain", or
// still to check, behind `status`. A change tried at several levels is one line, e.g. "Earth
// Aniimo Lv.2–4".
function improvementsChecked(best, status, open) {
    if (!ranking.candidates.length) return `<p class="hint">${status}</p>`;
    const groups = new Map();
    ranking.candidates.forEach((candidate, i) => {
        const key = candidate.group || `#${i}`;
        if (!groups.has(key)) groups.set(key, { kind: candidate.kind, candidates: [], indices: [] });
        groups.get(key).candidates.push(candidate);
        groups.get(key).indices.push(i);
    });
    const kinds = new Map();
    for (const [key, group] of groups) {
        const first = group.candidates[0];
        const levels = group.candidates.map(c => c.level).filter(l => l != null);
        const name = first.family
            ? `${first.family}${levels.length ? ` Lv.${levels.length > 1 ? `${levels[0]}–${levels[levels.length - 1]}` : levels[0]}` : ''}`
            : first.label;
        const done = group.indices.every(i => ranking.results[i]);
        const found = best.get(key);
        const outcome = found
            ? `<span class="improve-gain">${found.candidate.level != null && levels.length > 1 ? `Lv.${found.candidate.level}: ` : ''}${found.gain.text}</span>`
            : `<span class="improve-none">${done ? 'no gain' : 'checking…'}</span>`;
        if (!kinds.has(group.kind)) kinds.set(group.kind, []);
        kinds.get(group.kind).push(`<li><span>${name}</span>${outcome}</li>`);
    }
    return `<details class="explain improve-checked"${open ? ' open' : ''}><summary>${status}</summary>${[...kinds]
        .map(([kind, items]) => `<p class="assume-title">${kind}</p><ul class="improve-checked-list">${items.join('')}</ul>`)
        .join('')}</details>`;
}

// --- Homeland layout -------------------------------------------------------------------
// The whole homeland around one Storage Unit (see layout.js): each finished batch is carried
// there, so the busiest facilities sit closest. Environment buildings keep the plots they cover
// exactly as planned, moving as one block. Facilities with no known size are left out and named.

// Trips per hour for each unit of a plan row: one per finished batch.
function tripsPerUnit(step) {
    if (step.status !== 'producing' || !step.cycle_time || !step.facility_count) return 0;
    const busy = step.busy_units ?? step.facility_count;
    return (busy / step.cycle_time / step.facility_count) * 3600;
}

// Whether a crop needs a growing environment: grown without one, a building's temperature
// would change it. Crops that need none grow the same anywhere.
const needsEnvironment = item => !!recipeIndex.find(r => r.name === item)?.environment;

// The plan as pieces for `layOut`: environment blocks, then one piece per other facility unit,
// then whatever the player owns that the plan doesn't use.
function homelandPieces(plan, input) {
    const pieces = [];
    const placed = {};
    const count = (facility, n = 1) => { placed[facility] = (placed[facility] || 0) + n; };
    const unplaced = new Set();
    const steps = (plan.coin_items || []).filter(s => s.facility);
    const envSteps = steps.filter(s => s.environment && s.status === 'producing');
    const assignments = plan.environment_assignments || [];

    // Environment blocks, grouped as the plan's own maps are (see `renderFacilityPlan`).
    const units = [];
    ENVIRONMENT_MODE_ORDER.forEach(mode => {
        const rows = envSteps.filter(s => s.environment === mode);
        if (!rows.length) return;
        let modeUnits = splitByEnvironmentUnit(rows, assignments.filter(a => a.mode === mode));
        modeUnits.forEach(unit => units.push({ mode, unit }));
    });
    const blocks = new Map();
    units.forEach(({ mode, unit }, i) => {
        const key = unit.partner ? `${unit.building}|${unit.partner.join(',')}|${i}` : `#${i}`;
        // A pair's zones are one place: gather them under the first zone that names the pair.
        const pairKey = unit.partner ? [...blocks.keys()].find(k => k.startsWith(`${unit.building}|${unit.partner.join(',')}|`) && !blocks.get(k).parts.some(part => part.zone === unit.zone)) : null;
        const block = blocks.get(pairKey) || { mode, unit, parts: [] };
        block.parts.push({ zone: unit.zone ?? 0, layout: unit.layout, rows: unit.rows });
        blocks.set(pairKey || key, block);
    });
    const placedInBlocks = {};
    // Each is a cluster for `layOut`: its buildings, and the plots they cover, which may go
    // anywhere in their zone.
    blocks.forEach(({ mode, unit, parts }) => {
        const size = environmentBuildingSize(unit.building);
        const buildings = [{ x: 0, y: 0, w: size, h: size, facility: unit.building, mode: unit.pairModes ? unit.pairModes[0] : mode, building: true }];
        count(unit.building);
        if (unit.partner) {
            const partnerSize = environmentBuildingSize(unit.partner[0]);
            buildings.push({ x: unit.partner[1], y: unit.partner[2], w: partnerSize, h: partnerSize, facility: unit.partner[0], mode: unit.pairModes ? unit.pairModes[1] : mode, building: true });
            count(unit.partner[0]);
        }
        const plots = [];
        const planned = [];
        parts.forEach(({ zone, layout, rows }) => {
            // Farmland layout optimization for Cooling Unit:
            // Shift the 2 right columns outward to x = 3.25 and x = 5.25 so their outer edge/corner
            // overlaps the 9x9 climate boundary (at x = 5.5) by >= 0.25 tiles, exactly matching the woodland layout.
            // This frees up internal grid space (at x = 1.25 and x = -1.25) to accommodate up to 32 Farmlands
            // in a single Cooling Unit cluster, eliminating the need for an extra Cooling Unit.
            if (unit.building === 'Cooling Unit' && rows.some(r => r.facility === 'Farmland')) {
                const shPlot = layout.find(p => p.facility === 'Starfall Hammock');
                const yCols = [-5.25, -3.25, -1.25, 0.75, 2.75, 4.75];
                const shiftedFarmlandSlots = [];
                for (const x of [-5.25, -3.25]) {
                    for (const y of yCols) shiftedFarmlandSlots.push({ x, y, size: 2, facility: 'Farmland' });
                }
                for (const y of [-5.25, -3.25, 2.75, 4.75]) shiftedFarmlandSlots.push({ x: -1.25, y, size: 2, facility: 'Farmland' });
                for (const y of [-5.25, -3.25, 2.75, 4.75]) shiftedFarmlandSlots.push({ x: 1.25, y, size: 2, facility: 'Farmland' });
                for (const x of [3.25, 5.25]) {
                    for (const y of yCols) shiftedFarmlandSlots.push({ x, y, size: 2, facility: 'Farmland' });
                }
                const validSlots = shiftedFarmlandSlots.filter(s => {
                    if (!shPlot) return true;
                    return !(s.x < shPlot.x + (shPlot.size || 5) && shPlot.x < s.x + s.size && s.y < shPlot.y + (shPlot.size || 5) && shPlot.y < s.y + s.size);
                }).sort((a, b) => Math.hypot(a.x - 1, a.y - 1) - Math.hypot(b.x - 1, b.y - 1));

                layout = shPlot ? [{ ...shPlot }, ...validSlots] : validSlots;
            }

            // Each plot in this zone gets one of the crops planned for its facility here.
            const crops = {};
            rows.forEach(r => {
                for (let n = 0; n < r.facility_count; n++) (crops[r.facility] ||= []).push({ crop: r.item_name, trips: tripsPerUnit(r), cycle: r.cycle_time });
            });
            layout.forEach(p => {
                const crop = (crops[p.facility] || []).shift();
                if (!crop) return;
                plots.push({ w: p.size, h: p.size, weight: crop.trips, cycle: crop.cycle, zone: unit.partner ? zone : 0, facility: p.facility, crop: crop.crop });
                planned.push({ x: p.x, y: p.y });
                count(p.facility);
                placedInBlocks[`${p.facility}|${crop.crop}`] = (placedInBlocks[`${p.facility}|${crop.crop}`] || 0) + 1;
            });
            // If there are still crops in rows not accommodated by layout slots (e.g. merged Ginseng plots):
            Object.entries(crops).forEach(([facility, remainingCrops]) => {
                while (remainingCrops.length > 0) {
                    const crop = remainingCrops.shift();
                    const size = facility === 'Woodland' ? 4 : 2;
                    // Candidate slots on the right flank / perimeter (as indicated in user reference image 2)
                    const extraSlots = [
                        { x: 3.25, y: -5.25 }, { x: 3.25, y: 4.75 }, { x: 5.25, y: -3.25 }, { x: 5.25, y: 2.75 },
                        { x: -5.25, y: -5.25 }, { x: -5.25, y: 4.75 }, { x: 1.25, y: 4.75 }, { x: -1.25, y: 4.75 }
                    ];
                    const slot = extraSlots[planned.length % extraSlots.length];
                    plots.push({ w: size, h: size, weight: crop.trips, cycle: crop.cycle, zone: unit.partner ? zone : 0, facility, crop: crop.crop });
                    planned.push(slot);
                    count(facility);
                    placedInBlocks[`${facility}|${crop.crop}`] = (placedInBlocks[`${facility}|${crop.crop}`] || 0) + 1;
                }
            });
        });
        pieces.push({ cluster: true, buildings, plots, planned });
    });

    // Recipes taking turns on the same units (the Bench's and Kiln's tiers) share them: as many
    // units as their busy time together needs, each running every tier in turn at its share.
    const takesTurns = step => step.status === 'producing' && !!recipeIndex.find(r => r.name === step.item_name)?.turns;
    const turnGroups = new Map();
    steps.filter(takesTurns).forEach(step => turnGroups.set(step.facility, [...(turnGroups.get(step.facility) || []), step]));
    turnGroups.forEach((rows, facility) => {
        const footprint = FACILITY_FOOTPRINTS[facility];
        if (!footprint) {
            unplaced.add(facility);
            return;
        }
        const busy = rows.reduce((sum, r) => sum + (r.busy_units ?? r.facility_count), 0);
        const n = Math.max(1, Math.ceil(busy - 1e-6));
        const jobs = rows.filter(r => r.cycle_time > 0).map(r => ({ item: r.item_name, cycle: r.cycle_time, rate: (r.busy_units ?? r.facility_count) / r.cycle_time / n }));
        const weight = jobs.reduce((sum, j) => sum + j.rate * 3600, 0);
        for (let i = 0; i < n; i++) {
            pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight, jobs, cycle: jobs[0]?.cycle, facility, crop: jobs[0]?.item ?? null, sensitive: false }] });
        }
        count(facility, n);
    });

    // Everything else, one unit at a time; environment crops no map took count here too.
    steps.filter(step => !takesTurns(step)).forEach(step => {
        let n = step.facility_count;
        if (step.environment && step.status === 'producing') {
            const key = `${step.facility}|${step.item_name}`;
            const taken = Math.min(n, placedInBlocks[key] || 0);
            placedInBlocks[key] = (placedInBlocks[key] || 0) - taken;
            n -= taken;
        }
        const footprint = FACILITY_FOOTPRINTS[step.facility];
        if (!footprint) {
            if (n > 0) unplaced.add(step.facility);
            return;
        }
        for (let i = 0; i < n; i++) {
            // A crop that needs an environment but is grown without one stays out of every
            // coverage square, so no building's temperature changes it.
            const growing = step.status === 'producing';
            pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: tripsPerUnit(step), cycle: step.cycle_time, facility: step.facility, crop: growing ? step.item_name : null, sensitive: growing && needsEnvironment(step.item_name) }] });
        }
        count(step.facility, n);
    });

    // What's owned but not in the plan at all, such as extra workshops or storage.
    // Unused environment buildings (Cooling Unit, Heat Furnace, Sunlamp) are NOT placed on the board to avoid wasting space or confusing the layout.
    FACILITIES.forEach(f => {
        const owned = tierCount(input.facilities[f.name]);
        const extra = owned - (placed[f.name] || 0);
        if (extra <= 0) return;
        if (f.name in ENVIRONMENT_BUILDING_SIZES) return;
        const footprint = FACILITY_FOOTPRINTS[f.name];
        if (!footprint) {
            unplaced.add(f.name);
            return;
        }
        for (let i = 0; i < extra; i++) pieces.push({ members: [{ x: 0, y: 0, w: footprint[0], h: footprint[1], weight: 0, facility: f.name, crop: null, building: false, mode: null }] });
    });

    // Add Crackle Generator (2x2) and Crackle Power Poles (1.5x1.5) when Electric Mode is active
    const isEmodeActive = (document.getElementById('emode-simple-on')?.checked ?? true) || !!document.getElementById('emode-on')?.checked;
    const hasElectricFacilities = (plan.coin_items || []).some(s => s.facility?.includes('(Electric)')) || (input.emode_facility_counts && Object.values(input.emode_facility_counts).some(c => c > 0));
    const currentRv = isSimpleMode() ? selectedHomeLevel() : (input.home_level || 14);
    if ((isEmodeActive || currentRv >= 12) && hasElectricFacilities) {
        // Crackle Generator (official 2x2 footprint, 11x11 square range)
        pieces.push({
            members: [{
                x: 0, y: 0, w: 2, h: 2,
                weight: 0,
                facility: 'Crackle Generator',
                generator: true,
                sensitive: false
            }]
        });
        // Crackle Power Poles (official 1.5x1.5 footprint, 7x7 square relay range, up to 2-3 poles for network extension)
        const poleCount = currentRv >= 12 ? Math.min(3, Math.floor((currentRv - 10) / 2)) : 0;
        for (let p = 0; p < poleCount; p++) {
            pieces.push({
                members: [{
                    x: 0, y: 0, w: 1.5, h: 1.5,
                    weight: 0,
                    facility: 'Crackle Power Pole',
                    powerPole: true,
                    sensitive: false
                }]
            });
        }
    }

    return { pieces, unplaced: [...unplaced] };
}

// Colors for the layout: crops and Aniimo materials as in the environment maps, the rest by
// category.
const LAYOUT_CATEGORY_COLORS = {
    'Materials': '#8d8f5a',
    'Aniimo Materials': '#5c9bd6',
    'Wood & Ore Processing': '#c28a52',
    'Materials Processing': '#8a7fc4',
    'Environment': '#9aa0a8',
};
const layoutColor = m => {
    if (m.generator || m.facility === 'Generator' || m.facility === 'Crackle Generator') return '#06b6d4';
    if (m.powerPole || m.facility === 'Crackle Power Pole' || m.facility === 'Power Pole') return '#eab308';
    return m.building
        ? (ENVIRONMENT_MODE_COLORS[m.mode] || '#9aa0a8')
        : ENVIRONMENT_FACILITY_COLORS[m.facility] || LAYOUT_CATEGORY_COLORS[FACILITY_CATEGORY_BY_NAME.get(m.facility)] || '#888888';
};
const initialsOf = name => {
    if (name === 'Generator' || name === 'Crackle Generator') return '⚡GEN';
    if (name === 'Crackle Power Pole' || name === 'Power Pole') return '⚡POLE';
    return name.split(/[\s-]+/).map(w => w[0]).join('').toUpperCase();
};

let layoutRunId = 0;
let layoutWorker = null;

// Every plot of the homeland, `{ number, x, y, w, h }` in tiles, with the top left at the origin.
function homelandPlots() {
    return HOMELAND_PLOTS.flatMap((row, r) => row.map((number, c) => ({
        number, x: c * HOMELAND_PLOT_SIZE.w, y: r * HOMELAND_PLOT_SIZE.h, w: HOMELAND_PLOT_SIZE.w, h: HOMELAND_PLOT_SIZE.h,
    })));
}

// The RV level the layout is for: the one given in Simple mode, else the lowest that allows
// everything entered (see `homeLevelCovering`).
function layoutHomeLevel() {
    return isSimpleMode() ? selectedHomeLevel() : homeLevelCovering(lastPlanInput);
}

function attachLayoutHandlers() {
    document.getElementById('layout-whole').addEventListener('change', (e) => {
        layoutShowsWhole = e.target.checked;
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-sim-on').addEventListener('change', () => {
        if (lastLayout) drawLayout(lastLayout);
    });
    document.getElementById('layout-replay').addEventListener('click', () => {
        if (layoutSim) resetLayoutSim(layoutSim);
    });
    document.getElementById('layout-su-count')?.addEventListener('change', () => {
        if (lastPlan && lastPlan.success) renderHomelandLayout(lastPlan);
    });
}

function drawLayout(drawn) {
    const diagram = document.getElementById('layout-diagram');
    diagram.innerHTML = homelandSvg(drawn.layout, drawn.homeLevel);
    // With the simulation off, the layout is drawn on its own.
    const on = document.getElementById('layout-sim-on').checked;
    diagram.classList.toggle('no-sim', !on);
    const stock = new Map(planContext?.levelUp ? lastPlanInput?.level_up?.stock || [] : []);
    startLayoutSim(on ? diagram.querySelector('.layout-svg') : null, layoutFlows(drawn.layout), stock);
}

function renderHomelandLayout(plan) {
    const card = document.getElementById('layout-card');
    if (!plan?.success || !lastPlanInput) {
        card.style.display = 'none';
        return;
    }
    const runId = ++layoutRunId;
    lastLayout = null;
    stopLayoutSim();
    setStep('layout', 'start');
    card.style.display = 'block';
    document.getElementById('layout-summary').textContent = 'Laying out…';
    document.getElementById('layout-diagram').innerHTML = '';
    // Worked out in a worker of its own: a large homeland takes a few seconds.
    const { pieces, unplaced } = homelandPieces(plan, lastPlanInput);
    const homeLevel = layoutHomeLevel();
    const cells = homelandPlots().filter(p => p.number <= homeLevel);
    if (layoutWorker) layoutWorker.terminate();
    layoutWorker = new Worker(WORKER_URL.replace('worker.js', 'layout-worker.js'), { type: 'module' });
    layoutWorker.onmessage = (event) => {
        layoutWorker.terminate();
        layoutWorker = null;
        if (runId !== layoutRunId) return;
        const layout = event.data;
        const at = layout.storageAt;
        // Buildings carry nothing themselves.
        const members = layout.pieces.flatMap(p => p.members).map(m => ({ ...m, weight: m.weight || 0 }));
        const trips = members.reduce((sum, m) => sum + m.weight, 0);
        const storages = layout.storages || [layout.storage];
        const walked = members.reduce((sum, m) => {
            const cx = m.x + m.w / 2;
            const cy = m.y + m.h / 2;
            const minDist = Math.min(...storages.map(su => Math.hypot(cx - (su.x + su.w / 2), cy - (su.y + su.h / 2))));
            return sum + m.weight * minDist;
        }, 0);
        const noRoom = [...new Set(layout.unplaced.map(i => {
            const piece = pieces[i];
            return piece.cluster ? `${piece.buildings[0].facility} and its plots` : piece.members[0].facility;
        }))];
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        const notes = [
            noRoom.length ? (isVi ? `Không đủ diện tích trên các lô đất RV ${homeLevel} cho: ${noRoom.join(', ')}.` : `No room found in RV ${homeLevel}'s plots for: ${noRoom.join(', ')}.`) : '',
            unplaced.length ? (isVi ? `Chưa đặt được, không rõ kích thước: ${unplaced.join(', ')}.` : `Not placed, size unknown: ${unplaced.join(', ')}.`) : '',
        ].filter(Boolean).join(' ');
        document.getElementById('layout-summary').textContent = `${trips > 0
            ? (isVi
                ? `${formatNumber(Math.round(trips))} chuyến/giờ đến Kho lưu trữ (SU), trung bình ${(walked / trips).toFixed(1)} ô mỗi chuyến, trong ${cells.length} lô đất mở tại RV ${homeLevel}.`
                : `${formatNumber(Math.round(trips))} trips/hour to the Storage Unit, ${(walked / trips).toFixed(1)} tiles each on average, in the ${cells.length} plot${cells.length === 1 ? '' : 's'} open at RV ${homeLevel}.`)
            : (isVi ? 'Không có sản phẩm nào trong kế hoạch này cần chuyển đến Kho lưu trữ.' : 'Nothing in this plan is carried to the Storage Unit.')}${notes ? ` ${notes}` : ''}`;
        lastLayout = { layout, homeLevel };
        drawLayout(lastLayout);
        setStep('layout', 'done');
    };
    layoutWorker.onerror = (event) => {
        console.error('Homeland layout failed:', event.message || event);
        if (runId !== layoutRunId) return;
        stopLayout();
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        document.getElementById('layout-summary').textContent = isVi
            ? 'Không thể tính toán được sơ đồ bố trí.'
            : 'The layout couldn\'t be worked out.';
        setStep('layout', 'fail');
    };
    const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
    layoutWorker.postMessage({ pieces, cells: cells.map(({ x, y, w, h }) => ({ x, y, w, h })), options: { suCount } });
}

// Stops a layout still being worked out, so it can't land over a newer plan.
function stopLayout() {
    stopLayoutSim();
    layoutRunId++;
    layoutWorker?.terminate();
    layoutWorker = null;
    lastLayout = null;
}

// Whether the layout shows the whole homeland rather than just what's placed; the player's toggle.
let layoutShowsWhole = false;
let lastLayout = null;

function homelandSvg(layout, homeLevel) {
    // Each environment building in use covers the 9x9 square around its center, drawn under
    // everything in its mode's color as on the building's own map.
    const coverage = layout.pieces.flatMap(p => p.members)
        .filter(m => m.building && m.mode)
        .map(m => ({ x: m.x + m.w / 2 - ENVIRONMENT_COVERAGE_RADIUS, y: m.y + m.h / 2 - ENVIRONMENT_COVERAGE_RADIUS, w: ENVIRONMENT_COVERAGE_RADIUS * 2, h: ENVIRONMENT_COVERAGE_RADIUS * 2, mode: m.mode }));
    // The whole homeland, its plots marked out and the ones not open yet shaded.
    const plots = homelandPlots();
    // Zoomed to what's placed, a couple of tiles around it, unless the whole homeland is asked for.
    const storages = (layout.storages && layout.storages.length > 0) ? layout.storages : [layout.storage];
    const placed = [...storages, ...layout.pieces.flatMap(p => p.members)];
    const whole = layoutShowsWhole;
    const minX = whole ? -1 : Math.floor(Math.min(...placed.map(r => r.x))) - 2;
    const minY = whole ? -1 : Math.floor(Math.min(...placed.map(r => r.y))) - 2;
    const maxX = whole ? Math.max(...plots.map(p => p.x + p.w)) + 1 : Math.ceil(Math.max(...placed.map(r => r.x + r.w))) + 2;
    const maxY = whole ? Math.max(...plots.map(p => p.y + p.h)) + 1 : Math.ceil(Math.max(...placed.map(r => r.y + r.h))) + 2;
    // Locked plots last, so where one meets an open plot, the edge between them reads red.
    const plotShapes = [...plots].sort((a, b) => (b.number <= homeLevel) - (a.number <= homeLevel)).map(p => {
        const open = p.number <= homeLevel;
        // An open plot is named by its number; one still to come by the RV level that opens it.
        return `<g class="layout-plot${open ? '' : ' locked'}"><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" />
            <text x="${p.x + 0.6}" y="${p.y + 0.9}" font-size="0.9">${open ? 'Plot' : 'RV'} ${p.number}</text></g>`;
    }).join('');
    const lines = [];
    for (let x = minX; x <= maxX; x++) lines.push(`<line x1="${x}" y1="${minY}" x2="${x}" y2="${maxY}" />`);
    for (let y = minY; y <= maxY; y++) lines.push(`<line x1="${minX}" y1="${y}" x2="${maxX}" y2="${y}" />`);
    const maxTrips = Math.max(...layout.pieces.flatMap(p => p.members.map(m => m.weight || 0)), 1e-9);
    const shapes = layout.pieces.flatMap(p => p.members).map(m => {
        const color = layoutColor(m);
        const away = Math.hypot(m.x + m.w / 2 - (layout.storage.x + layout.storage.w / 2), m.y + m.h / 2 - (layout.storage.y + layout.storage.h / 2));
        const tip = tipAttrs(m.facility, {
            detail: m.jobs ? m.jobs.map(j => prettyItem(j.item)).join(', ') : m.crop ? prettyItem(m.crop) : m.building && m.mode ? m.mode : 'Idle',
            stats: m.weight > 0 ? `${formatRate(m.weight)} trips/hour · ${away.toFixed(1)} tiles from storage` : '',
            color,
        });
        const label = Math.min(m.w, m.h) >= 1.5 ? `<text x="${m.x + m.w / 2}" y="${m.y + m.h / 2}" font-size="${Math.min(0.8, m.w / 3)}">${initialsOf(m.facility)}</text>` : '';
        // Busier pieces are filled more solidly; idle ones are an outline.
        const fill = m.building ? 0.9 : m.weight > 0 ? 0.35 + 0.55 * Math.sqrt(m.weight / maxTrips) : 0.08;
        if (m.building) {
            // As on the building's own map: its mode's color, with the game's symbol for it.
            return `<g class="env-building" ${tip}><rect x="${m.x + 0.05}" y="${m.y + 0.05}" width="${m.w - 0.1}" height="${m.h - 0.1}" rx="0.3"
                fill="${color}" fill-opacity="${m.mode ? 1 : 0.25}" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.08" />
                ${m.mode ? environmentBuildingIcon(m.facility, m.mode, m.x + m.w / 2, m.y + m.h / 2) : ''}</g>`;
        }
        return `<g class="layout-piece" ${tip}><rect x="${m.x + 0.04}" y="${m.y + 0.04}" width="${m.w - 0.08}" height="${m.h - 0.08}" rx="0.2"
            fill="${color}" fill-opacity="${fill.toFixed(2)}" stroke="${color}" stroke-width="0.06" />${label}</g>`;
    }).join('');
    const coverageShapes = coverage.map(c => {
        const tint = ENVIRONMENT_MODE_COLORS[c.mode] || '#9aa0a8';
        const shade = (0.12 * (ENVIRONMENT_MODE_SHADE[c.mode] ?? 1)).toFixed(3);
        return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="${tint}" fill-opacity="${shade}" />`;
    }).join('');
    // Its edge goes over the pieces, so the square reads through whatever stands in it.
    const coverageEdges = coverage.map(c => {
        const tint = ENVIRONMENT_MODE_COLORS[c.mode] || '#9aa0a8';
        return `<rect x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}" fill="none"
            stroke="${tint}" stroke-opacity="0.8" stroke-dasharray="0.35,0.25" stroke-width="0.08" />`;
    }).join('');
    const s = layout.storage;
    // A line from everything carried to the Storage Unit, each drawn once its first batch is in,
    // and a ring for the batch it's on (see "Deliveries"), in the same order as `layoutFlows`.
    const flowList = layoutFlows(layout);
    const flows = flowList.map(f => `<line x1="${f.x1}" y1="${f.y1}" x2="${f.x2}" y2="${f.y2}" class="layout-flow-line" />`).join('');
    const rings = flowList.map(f => `<g class="layout-ring" transform="translate(${f.rx.toFixed(2)} ${f.ry.toFixed(2)})">
            <circle r="${f.ring.toFixed(2)}" class="ring-track" /><circle r="${f.ring.toFixed(2)}" class="ring-fill" pathLength="1" stroke-dasharray="0 1" transform="rotate(-90)" /></g>`).join('');
    const totalTrips = layout.pieces.flatMap(p => p.members).reduce((sum, m) => sum + (m.weight || 0), 0);
    return `<svg class="layout-svg" viewBox="${minX} ${minY} ${maxX - minX} ${maxY - minY}" role="img" aria-label="Homeland layout">
        <defs><pattern id="layout-locked" width="1" height="1" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="1" class="layout-hatch" /></pattern></defs>
        <g class="env-grid">${lines.join('')}</g>
        <g class="layout-plots">${plotShapes}</g>
        <g class="layout-coverage">${coverageShapes}</g>
        ${shapes}
        <g class="layout-coverage-edges" pointer-events="none">${coverageEdges}</g>
        <g class="layout-rings" pointer-events="none">${rings}</g>
        <g class="layout-flows" pointer-events="none">${flows}<g class="layout-dots"></g></g>
        ${(() => {
            const members = layout.pieces.flatMap(p => p.members);
            const genPiece = members.find(m => m.facility === 'Crackle Generator' || m.facility === 'Generator' || m.generator);
            const poles = members.filter(m => m.facility === 'Crackle Power Pole' || m.facility === 'Power Pole' || m.powerPole);

            let aura = '';
            if (genPiece) {
                // 11x11 square range for Crackle Generator (official Aniimo mechanics)
                const gx = genPiece.x - (11 - genPiece.w) / 2;
                const gy = genPiece.y - (11 - genPiece.h) / 2;
                const genCenter = { x: genPiece.x + genPiece.w / 2, y: genPiece.y + genPiece.h / 2 };

                aura += `<g class="generator-power-network" pointer-events="none">
                    <!-- Crackle Generator 11x11 Square Grid -->
                    <rect x="${gx}" y="${gy}" width="11" height="11" rx="0.3"
                        fill="#06b6d4" fill-opacity="0.06" stroke="#06b6d4" stroke-opacity="0.6" stroke-width="0.16" stroke-dasharray="0.8 0.4" />
                    <text x="${genCenter.x}" y="${gy - 0.35}" font-size="0.72" fill="#06b6d4" font-weight="700" text-anchor="middle">⚡ Crackle Generator (11×11 Grid)</text>`;

                let lastNode = genCenter;
                poles.forEach((pole, idx) => {
                    const px = pole.x - (7 - pole.w) / 2;
                    const py = pole.y - (7 - pole.h) / 2;
                    const pCenter = { x: pole.x + pole.w / 2, y: pole.y + pole.h / 2 };
                    aura += `
                        <!-- Power Pole #${idx + 1} 7x7 Relay Range -->
                        <rect x="${px}" y="${py}" width="7" height="7" rx="0.25"
                            fill="#eab308" fill-opacity="0.04" stroke="#eab308" stroke-opacity="0.5" stroke-width="0.12" stroke-dasharray="0.5 0.25" />
                        <!-- Power Transmission Cable -->
                        <line x1="${lastNode.x}" y1="${lastNode.y}" x2="${pCenter.x}" y2="${pCenter.y}"
                            stroke="#06b6d4" stroke-width="0.14" stroke-dasharray="0.4 0.2" stroke-opacity="0.75" />
                        <text x="${pCenter.x}" y="${py - 0.25}" font-size="0.55" fill="#eab308" font-weight="600" text-anchor="middle">⚡ Pole #${idx + 1} (7×7 Relay)</text>
                    `;
                    lastNode = pCenter;
                });
                aura += `</g>`;
            }
            const suElements = storages.map((su, idx) => {
                const roleColors = { central: '#eab308', farm: '#10b981', workshop: '#06b6d4', forestry: '#059669', expansion: '#8b5cf6' };
                const suColor = roleColors[su.role] || '#f59e0b';
                const suLabel = su.label || `SU ${idx + 1}`;
                const suTrips = layout.pieces.flatMap(p => p.members).filter(m => m.closestStorage === su.id).reduce((sum, m) => sum + (m.weight || 0), 0);
                return `<g class="layout-piece layout-storage-unit su-${su.role || 'hub'}" ${tipAttrs(suLabel, { detail: `Dedicated hub: ${su.role || 'All-purpose'}`, stats: suTrips > 0 ? `${formatRate(suTrips)} trips/hour` : 'Logistics hub', color: suColor })}>
                    <rect x="${su.x + 0.04}" y="${su.y + 0.04}" width="${su.w - 0.08}" height="${su.h - 0.08}" rx="0.25" fill="${suColor}" fill-opacity="0.88" stroke="#ffffff" stroke-width="0.08" class="layout-storage" />
                    <text x="${su.x + su.w / 2}" y="${su.y + su.h / 2}" font-size="0.65" font-weight="800" fill="#000000" class="layout-storage-text">SU ${idx + 1}</text>
                </g>`;
            }).join('');
            return aura + suElements;
        })()}
    </svg>`;
}

// --- Deliveries ------------------------------------------------------------------------
// The layout plays its homeland out in sped-up game time, from the moment everything is set up.
// Every finished batch goes to the Storage Unit, with its byproduct, and adds to what's there; a
// recipe starts a batch only once the Storage Unit has all it takes, and takes it out. Each unit
// also keeps to the plan's pace for each recipe it runs, so it doesn't take more than its share
// of what others need; a Bench or Kiln runs its tiers in turn. A ring on each shows its batch,
// amber while it waits for materials. What isn't modeled: carrying takes no time (the dots walk
// at a fixed pace just to show it), and which of two recipes wanting the same thing gets it first
// (they take turns at random).

// Roughly how many real seconds the build-up takes, however long it is in game (at least a
// minute a second, at most an hour); a guess from first batches, not the whole wait.
const SIM_BUILD_UP = 10;
// Tiles a second a delivery walks, in real time.
const SIM_PACE = 4;
// Game seconds per step of the simulation.
const SIM_STEP = 2;
// Real seconds between two dots on the same line, at the least.
const SIM_DOT_GAP = 0.12;
let layoutSim = null;

// Each piece carried to the Storage Unit: its line and ring, and its jobs: what it makes, how
// long a batch takes and its pace in the plan (batches a second). Most pieces have one; a Bench
// or Kiln unit has one per tier it takes turns on (see `homelandPieces`).
function layoutFlows(layout) {
    const storages = (layout.storages && layout.storages.length > 0) ? layout.storages : [layout.storage];
    return layout.pieces.flatMap(p => p.members).filter(m => m.weight > 0 && m.crop && m.cycle > 0).map(m => {
        const x1 = m.x + m.w / 2;
        const y1 = m.y + m.h / 2;
        const closestSU = storages.reduce((best, su) => {
            const d1 = Math.hypot(x1 - (su.x + su.w / 2), y1 - (su.y + su.h / 2));
            const d2 = Math.hypot(x1 - (best.x + best.w / 2), y1 - (best.y + best.h / 2));
            return d1 < d2 ? su : best;
        }, storages[0]);
        const x2 = closestSU.x + closestSU.w / 2;
        const y2 = closestSU.y + closestSU.h / 2;
        const ring = Math.min(0.45, Math.min(m.w, m.h) * 0.22);
        return {
            x1, y1, x2, y2, length: Math.hypot(x2 - x1, y2 - y1),
            ring, rx: m.x + m.w - ring - 0.12, ry: m.y + ring + 0.12,
            jobs: m.jobs || [{ item: m.crop, cycle: m.cycle, rate: m.weight / 3600 }],
        };
    });
}

// What a recipe takes and gives, from the recipe list: ingredients with amounts, its item and
// yield (a quick variant makes the regular item), and its byproduct.
function recipeTerms(name) {
    const r = recipeIndex.find(r => r.name === name);
    return {
        takes: (r?.ingredients || []).map((ingredient, i) => [ingredient, r.amounts?.[i] ?? 1]),
        makes: name.replace(/^quick_/, ''),
        yield: r?.yieldAmount || 1,
        byproduct: r?.byproduct ? [r.byproduct, r.byproductAmount || 0] : null,
    };
}

// When an item's first batch could be ready, from the moment everything is set up: a crop's grow
// time, or a recipe's own batch time after its slowest ingredient is first there, as the planner
// works it out (see `item_lead_time` in optimizer.rs). Only sets the simulation's speed.
function firstBatchTimes(flows) {
    const batch = new Map();
    flows.flatMap(f => f.jobs).forEach(j => batch.set(j.item, Math.min(batch.get(j.item) ?? Infinity, j.cycle)));
    const makers = new Map();
    batch.forEach((_, name) => {
        const terms = recipeTerms(name);
        [terms.makes, terms.byproduct?.[0]].filter(Boolean).forEach(item => makers.set(item, [...(makers.get(item) || []), name]));
    });
    const known = new Map();
    const first = (name, depth = 0) => {
        if (depth > 8) return 0;
        if (!known.has(name)) {
            known.set(name, 0);
            const waits = recipeTerms(name).takes
                .map(([ingredient]) => makers.get(ingredient))
                .filter(Boolean)
                .map(list => Math.min(...list.map(m => first(m, depth + 1))));
            known.set(name, Math.max(0, ...waits) + (batch.get(name) || 0));
        }
        return known.get(name);
    };
    return first;
}

function startLayoutSim(svg, flows, stock) {
    stopLayoutSim();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById('layout-sim').hidden = !svg || flows.length === 0 || reduce;
    if (!svg || flows.length === 0) return;
    const lines = [...svg.querySelectorAll('.layout-flow-line')];
    const rings = [...svg.querySelectorAll('.layout-ring')];
    if (reduce) {
        lines.forEach(line => line.classList.add('live'));
        rings.forEach(ring => ring.remove());
        return;
    }
    const first = firstBatchTimes(flows);
    const latest = Math.max(...flows.flatMap(f => f.jobs).map(j => first(j.item)));
    const speed = Math.min(3600, Math.max(60, latest / SIM_BUILD_UP));
    const units = flows.map((flow, k) => ({
        flow,
        jobs: flow.jobs.map(job => ({ ...job, terms: recipeTerms(job.item) })),
        line: lines[k], ring: rings[k], fill: rings[k]?.querySelector('.ring-fill'),
    }));
    // Something no piece here makes, and no stock covers, is taken as always there, so a recipe
    // using it isn't held up forever.
    const made = new Set(units.flatMap(u => u.jobs).flatMap(j => [j.terms.makes, j.terms.byproduct?.[0]].filter(Boolean)));
    const sim = { svg, units, speed, stock, made, layer: svg.querySelector('.layout-dots'), dots: [], frame: 0, visible: true };
    layoutSim = sim;
    document.getElementById('layout-clock').title = `Game time since everything was set up, at ${formatNumber(Math.round(speed))}× speed`;
    // Only plays while the diagram is on screen.
    sim.observer = new IntersectionObserver(([entry]) => {
        sim.visible = entry.isIntersecting;
        if (sim.visible && !sim.frame && layoutSim === sim) sim.frame = requestAnimationFrame(now => tickLayoutSim(sim, now));
    });
    sim.observer.observe(svg);
    resetLayoutSim(sim);
}

function resetLayoutSim(sim) {
    sim.game = 0;
    sim.real = 0;
    sim.last = null;
    sim.store = new Map(sim.stock);
    sim.units.forEach(unit => {
        unit.jobs.forEach(job => { job.pace = 1; });
        unit.job = null;
        unit.until = null;
        unit.free = 0;
        unit.lastDot = -Infinity;
        unit.line?.classList.remove('live');
        showRing(unit, 0, false);
    });
    sim.dots.forEach(dot => dot.el.remove());
    sim.dots = [];
    showSimClock(0);
    if (!sim.frame) sim.frame = requestAnimationFrame(now => tickLayoutSim(sim, now));
}

function stopLayoutSim() {
    if (!layoutSim) return;
    cancelAnimationFrame(layoutSim.frame);
    layoutSim.observer?.disconnect();
    layoutSim = null;
}

// Whether the Storage Unit has what `job` needs for a batch.
function simHas(sim, job) {
    return job.terms.takes.every(([item, n]) => !sim.made.has(item) && !sim.stock.has(item) || (sim.store.get(item) || 0) >= n);
}

// Whether `job` is due a batch by its pace. Pace may run a little over one, so a batch noticed at
// the end of a step doesn't lose the time since.
const simDue = job => job.pace >= 1 - 1e-9;

// Starts the first job of `unit` that's due and has its materials, at game time `at`.
function simStart(sim, unit, at) {
    const job = unit.jobs.find(j => simDue(j) && simHas(sim, j));
    if (!job) return;
    job.terms.takes.forEach(([item, n]) => {
        if (sim.made.has(item) || sim.stock.has(item)) sim.store.set(item, (sim.store.get(item) || 0) - n);
    });
    job.pace -= 1;
    unit.job = job;
    unit.started = at;
    unit.until = at + job.cycle;
}

function stepLayoutSim(sim, dt) {
    const from = sim.game;
    sim.game += dt;
    // Recipes wanting the same thing take turns at random.
    const order = [...sim.units];
    for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
    }
    for (const unit of order) {
        unit.jobs.forEach(job => { job.pace = Math.min(1 + job.rate * SIM_STEP, job.pace + job.rate * dt); });
        // Each batch finished within the step is delivered then, and the next starts right away.
        while (unit.until != null && unit.until <= sim.game) {
            const { makes, byproduct, yield: amount } = unit.job.terms;
            sim.store.set(makes, (sim.store.get(makes) || 0) + amount);
            if (byproduct) sim.store.set(byproduct[0], (sim.store.get(byproduct[0]) || 0) + byproduct[1]);
            deliver(sim, unit, (sim.game - unit.until) / sim.speed);
            unit.free = unit.until;
            unit.until = null;
            unit.job = null;
            simStart(sim, unit, unit.free);
        }
        if (unit.until == null) simStart(sim, unit, Math.max(from, unit.free));
    }
}

function deliver(sim, unit, age) {
    unit.line?.classList.add('live');
    const walk = unit.flow.length / SIM_PACE;
    // A line busier than the eye can follow shows only some of its dots.
    if (age >= walk || sim.real - age - unit.lastDot < SIM_DOT_GAP) return;
    unit.lastDot = sim.real - age;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    el.setAttribute('r', '0.2');
    el.setAttribute('class', 'layout-dot');
    sim.layer.appendChild(el);
    sim.dots.push({ el, flow: unit.flow, age });
}

function showRing(unit, progress, waiting) {
    if (!unit.ring) return;
    unit.fill.setAttribute('stroke-dasharray', `${progress.toFixed(3)} 1`);
    unit.ring.classList.toggle('waiting', waiting);
}

function tickLayoutSim(sim, now) {
    sim.frame = 0;
    if (layoutSim !== sim || !sim.svg.isConnected) return;
    // A long gap between frames (a hidden tab) isn't counted as time passing.
    const dt = sim.last == null ? 0 : Math.min(now - sim.last, 100) / 1000;
    sim.last = now;
    const until = sim.game + dt * sim.speed;
    while (sim.game < until - 1e-9) stepLayoutSim(sim, Math.min(SIM_STEP, until - sim.game));
    sim.real += dt;
    sim.units.forEach(unit => {
        const busy = unit.until != null;
        showRing(unit, busy ? Math.min(1, (sim.game - unit.started) / unit.job.cycle) : 0, !busy && unit.jobs.some(simDue));
    });
    sim.dots = sim.dots.filter(dot => {
        dot.age += dt;
        const along = (dot.age * SIM_PACE) / dot.flow.length;
        if (along >= 1) {
            dot.el.remove();
            return false;
        }
        dot.el.setAttribute('cx', (dot.flow.x1 + (dot.flow.x2 - dot.flow.x1) * along).toFixed(2));
        dot.el.setAttribute('cy', (dot.flow.y1 + (dot.flow.y2 - dot.flow.y1) * along).toFixed(2));
        return true;
    });
    showSimClock(sim.game);
    if (sim.visible) sim.frame = requestAnimationFrame(t => tickLayoutSim(sim, t));
    else sim.last = null;
}

function showSimClock(seconds) {
    const minutes = Math.floor(seconds / 60);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor(minutes / 60) % 24;
    const text = `${days ? `${days}d ` : ''}${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
    const clock = document.getElementById('layout-clock');
    if (clock.textContent !== text) clock.textContent = text;
}

// --- Progress card ---------------------------------------------------------------------
// Under the button, every step of working out a plan in the order it runs, each with a spinner
// while it runs and its time once done: the solves in the worker (see `exactPlanJson` in
// worker.js), then the layout, the opportunities and the Minimum team.

let progress = null;

function startProgress(input, runId) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const levelUp = !!input.level_up && planContext.levelUp && !planContext.ready && !planContext.unavailable;
    const priorities = input.priorities || [];
    // A level-up's solves (the soonest level-up, the most Home Coins at that pace, spare Bench
    // and Kiln time) are one step, and every plan's last is its final solve and the re-check
    // of it against every limit: the worker's steps map onto these (see `setStep`).
    const steps = [
        ...priorities.map(target => ({ key: `priority:${target}`, label: isVi ? `Nhiều ${priorityLabel(target, planContext.aniipod)} nhất` : `Most ${priorityLabel(target, planContext.aniipod)}` })),
        { key: 'plan', label: levelUp ? (isVi ? 'Lên cấp nhanh nhất' : 'Fastest Level-Up') : priorities.length ? (isVi ? 'Home Coin từ phần còn lại' : "Home Coins with What's Left") : (isVi ? 'Nhiều Home Coin nhất' : 'Most Home Coins') },
        { key: 'layout', label: isVi ? 'Bố cục Homeland' : 'Homeland Layout' },
        { key: 'minimum', label: isVi ? 'Tổ đội Aniimo tối thiểu' : 'Minimum Team Plan' },
    ];
    progress = { runId, steps: steps.map(step => ({ ...step, state: 'pending' })) };
    renderProgress();
}

// The worker's solves that make up the card's 'plan' step; it's done once the plan is checked.
const PLAN_SOLVES = ['level_up', 'final', 'stock_up', 'check'];

// Moves step `key` on: 'start', 'done', 'skip' or 'fail', with an optional note such as
// "3 of 12", and for a solve, whether HiGHS proved its answer. The backup planner only appears
// if the exact one couldn't run.
function setStep(key, state, detail, proven) {
    if (!progress || progress.runId !== planRunId) return;
    if (PLAN_SOLVES.includes(key)) {
        const plan = progress.steps.find(s => s.key === 'plan');
        if (proven === false) plan.unproven = true;
        if (state === 'start' && plan.state !== 'running') setStep('plan', 'start');
        else if (state === 'done' && key === 'check') setStep('plan', 'done', undefined, !plan.unproven);
        else renderProgress();
        return;
    }
    let step = progress.steps.find(s => s.key === key);
    if (!step && key === 'backup') {
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        step = { key, label: isVi ? 'Bộ giải dự phòng' : 'Backup Planner', state: 'pending' };
        progress.steps.splice(progress.steps.findIndex(s => s.key === 'layout'), 0, step);
    }
    if (!step) return;
    const now = performance.now();
    if (state === 'start') {
        if (step.state !== 'running') step.started = now;
        step.state = 'running';
    } else if (state === 'done' || state === 'fail') {
        step.ms = step.started ? now - step.started : null;
        step.state = state;
    } else if (state === 'skip') {
        step.state = 'skipped';
    }
    if (detail !== undefined) step.detail = detail;
    if (proven !== undefined) step.proven = proven;
    renderProgress();
}

// What "proven best" means, shown on hovering it.
const PROVEN_MEANS = 'No plan the model allows does better. Some of its options, such as how plots can be arranged around an environment building, come from a shortlist rather than every possibility.';
const PROVEN_MEANS_VI = 'Không phương án nào trong mô hình toán đạt hiệu suất cao hơn. Các phương án bố trí ô đất quanh cơ sở môi trường đã được tối ưu hóa.';

// Whether a solve proved its plan the best the model allows, or ran out of time first.
function searchNote(proven) {
    if (proven === undefined) return '';
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    return proven
        ? `<span title="${isVi ? PROVEN_MEANS_VI : PROVEN_MEANS}">${isVi ? 'tối ưu chuẩn xác' : 'proven best'}</span>`
        : `<span title="${isVi ? 'Bộ giải đạt thời gian giới hạn.' : 'The solver ran out of time before it could prove nothing does better.'}">${isVi ? 'tốt nhất theo thời gian' : 'best found in time'}</span>`;
}

// Once the plan is back, any solve that never ran (a level-up out of reach skips the last one;
// the backup planner skips them all) is marked skipped.
function finishSolveSteps() {
    if (!progress) return;
    progress.steps
        .filter(s => s.key === 'plan' || s.key.startsWith('priority:'))
        .forEach(s => { if (s.state === 'pending' || s.state === 'running') s.state = 'skipped'; });
    if (progress.steps.some(s => s.key === 'backup')) setStep('backup', 'done');
    renderProgress();
}

function renderProgress() {
    const card = document.getElementById('solve-progress');
    if (!progress) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'block';
    const icon = state => ({
        running: '<span class="step-spinner" aria-label="Running"></span>',
        done: '<span class="step-icon done" aria-label="Done">✓</span>',
        fail: '<span class="step-icon fail" aria-label="Failed">✕</span>',
        skipped: '<span class="step-icon skipped" aria-label="Skipped">–</span>',
    }[state] || '<span class="step-icon pending" aria-label="Waiting">•</span>');
    const time = ms => ms == null ? '' : ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
    card.innerHTML = `<ol class="progress-steps">${progress.steps.map(step => {
        const finished = step.state === 'done' || step.state === 'fail';
        const note = [step.detail, finished ? searchNote(step.proven) : '', finished ? time(step.ms) : ''].filter(Boolean).join(' · ');
        return `
        <li class="progress-step ${step.state}">${icon(step.state)}<span class="step-label">${step.label}</span>
            <span class="step-note">${note}</span></li>`;
    }).join('')}</ol>`;
}

// --- My Aniimo -------------------------------------------------------------------------
// The Aniimo the player actually has, card by card (see `Crew` in models.rs): each card's homeland
// abilities with their levels, its four personalities (one from each pair) and how many are alike.
// The plan shares their hours out, so one level-4 Earth Aniimo covers what it can and no more.

let roster = [];
// The Best plan's team, to start a roster from (see `renderAniimoSummary`).
let lastBestTeam = null;

function newRosterAniimo(abilities = {}, personalities = null) {
    return { name: '', count: 1, abilities, personalities: personalities || PERSONALITY_PAIRS.map(pair => pair.names[0]) };
}

// Facilities whose Aniimo lives there: every Aniimo Materials facility.
const RESIDENT_FACILITIES = new Set(FACILITIES.filter(f => f.category === 'Aniimo Materials').map(f => f.name));

// The roster for the solver (see `JsRoster` in wasm.rs).
function rosterPayload() {
    return {
        members: roster.map(a => ({ count: a.count, abilities: a.abilities, personalities: a.personalities })),
        residents: [...RESIDENT_FACILITIES],
        environment: ENVIRONMENT_BUILDING_ABILITY,
        personalities: Object.fromEntries(FACILITIES.filter(f => f.personality).map(f => [f.name, f.personality])),
    };
}

const escapeText = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// A card's name: what the player called it, else its abilities.
function rosterLabel(aniimo, i) {
    if (aniimo.name?.trim()) return escapeText(aniimo.name.trim());
    const abilities = Object.entries(aniimo.abilities).map(([ability, level]) => `${ability} ${level}`).join(', ');
    return abilities || `Aniimo ${i + 1}`;
}

function renderRoster() {
    const editor = document.getElementById('roster-editor');
    if (!editor) return;
    const cards = roster.map((aniimo, i) => {
        const abilities = Object.entries(aniimo.abilities).map(([ability, level]) => `
            <span class="roster-ability">${abilityTag(ability)}<span class="tabs level-picker">${[1, 2, 3, 4].map(l =>
            `<label><input type="radio" name="roster-${i}-${ability}" data-level="${i}|${ability}" value="${l}"${l === level ? ' checked' : ''}> ${l}</label>`).join('')}</span><button type="button" class="roster-x" data-drop="${i}|${ability}" aria-label="Remove ${ability}" title="Remove ${ability}">✕</button></span>`).join('');
        const missing = ABILITIES.map(a => a.name).filter(name => !(name in aniimo.abilities));
        const add = missing.length
            ? `<select class="roster-add-ability" data-add="${i}" aria-label="Add an ability"><option value="">+ Ability</option>${missing.map(name => `<option>${name}</option>`).join('')}</select>`
            : '';
        const personalities = PERSONALITY_PAIRS.map((pair, p) => `<span class="tabs level-picker roster-pair" role="radiogroup" aria-label="${pair.names.join(' or ')}">${pair.names.map((name, k) =>
            `<label title="${name}"><input type="radio" name="roster-${i}-pair-${p}" data-personality="${i}|${p}" value="${name}"${aniimo.personalities[p] === name ? ' checked' : ''}> ${pair.letters[k]}</label>`).join('')}</span>`).join('');
        return `
            <div class="roster-card">
                <div class="roster-head">
                    <input type="text" class="roster-name" data-name="${i}" value="${escapeText(aniimo.name)}" placeholder="Aniimo ${i + 1}" aria-label="Name">
                    <span class="roster-count" title="How many you have that are alike"><button type="button" data-count="${i}|-1" aria-label="One fewer">−</button><span>×${aniimo.count}</span><button type="button" data-count="${i}|1" aria-label="One more">+</button></span>
                    <button type="button" class="roster-x" data-remove="${i}" aria-label="Remove this Aniimo" title="Remove">✕</button>
                </div>
                <div class="roster-abilities">${abilities}${add}</div>
                <div class="roster-personalities">${personalities}</div>
            </div>`;
    }).join('');
    editor.innerHTML = `${cards || '<p class="hint small">No Aniimo yet. Add the ones you have, or start from the Best plan\'s team.</p>'}
        <div class="roster-actions">
            <button type="button" class="skip-add-btn" data-roster="add">+ Add Aniimo</button>
            ${lastBestTeam?.length ? '<button type="button" class="skip-add-btn" data-roster="from-best">Start from the Best team</button>' : ''}
        </div>`;
}

// When the roster can't make a plan: keeps the Aniimo card, and its editor, on screen so the
// player can add to it.
function showRosterShortfall() {
    document.getElementById('error-message').style.display = 'none';
    showSetupOnly();
    const anyAble = roster.some(a => a.count > 0 && Object.keys(a.abilities).length);
    // An empty roster's editor already says to add some.
    document.getElementById('aniimo-collapsed-summary').textContent = anyAble ? 'No plan found with these Aniimo.' : '';
}

// Of the results, only the Aniimo card, emptied of the last plan's team: its setup may be what
// to change.
function showSetupOnly() {
    const content = document.getElementById('results-content');
    content.style.display = 'block';
    content.classList.add('setup-only');
    document.getElementById('aniimo-collapsed-summary').textContent = '';
    document.getElementById('aniimo-summary').innerHTML = '';
    document.getElementById('aniimo-abilities').innerHTML = '';
    document.getElementById('aniimo-count').hidden = true;
}

// Plans again once the player stops changing the roster for a moment, not on every click.
let rosterReplan = null;
function rosterChanged(rerender = true) {
    saveInputsToStorage();
    if (rerender) renderRoster();
    clearTimeout(rosterReplan);
    rosterReplan = setTimeout(switchAniimoSetup, 700);
}

function attachRosterHandlers() {
    const editor = document.getElementById('roster-editor');
    if (!editor) return;
    editor.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const { count, remove, drop, roster: action } = button.dataset;
        if (count) {
            const [i, by] = count.split('|').map(Number);
            roster[i].count = Math.max(1, roster[i].count + by);
        } else if (remove) {
            roster.splice(Number(remove), 1);
        } else if (drop) {
            const [i, ability] = drop.split('|');
            delete roster[Number(i)].abilities[ability];
        } else if (action === 'add') {
            roster.push(newRosterAniimo());
        } else if (action === 'from-best' && lastBestTeam) {
            // Alike Aniimo share a card, with how many there are.
            const cards = new Map();
            lastBestTeam.forEach(g => {
                const personalities = PERSONALITY_PAIRS.map(pair => pair.names.find(name => g.personalities?.has(name)) || pair.names[0]);
                const key = `${g.ability}|${g.level}|${personalities.join()}`;
                if (cards.has(key)) cards.get(key).count += g.count;
                else cards.set(key, { ...newRosterAniimo({ [g.ability]: g.level }, personalities), count: g.count });
            });
            roster = [...cards.values()];
        } else {
            return;
        }
        rosterChanged();
    });
    editor.addEventListener('change', (e) => {
        const { level, personality, add, name } = e.target.dataset;
        if (level) {
            const [i, ability] = level.split('|');
            roster[Number(i)].abilities[ability] = Number(e.target.value);
        } else if (personality) {
            const [i, p] = personality.split('|').map(Number);
            roster[i].personalities[p] = e.target.value;
        } else if (add) {
            if (!e.target.value) return;
            roster[Number(add)].abilities[e.target.value] = 1;
        } else if (name !== undefined) {
            roster[Number(name)].name = e.target.value;
            saveInputsToStorage();
            return;
        } else {
            return;
        }
        rosterChanged();
    });
}

// The Aniimo Team card for a roster plan: how busy each card's Aniimo are and where. A resident
// facility keeps its Aniimo all day; environment buildings too (see `staffing`).
function renderRosterSummary(plan) {
    const busy = roster.map(() => 0);
    const where = roster.map(() => new Map());
    (plan.coin_items || []).forEach(step => {
        if (step.crew == null || step.status !== 'producing' || !roster[step.crew]) return;
        busy[step.crew] += RESIDENT_FACILITIES.has(step.facility) ? step.facility_count : (step.busy_units ?? step.facility_count);
        const place = `${step.facility} (${prettyItem(step.item_name)})`;
        where[step.crew].set(place, (where[step.crew].get(place) || 0) + step.facility_count);
    });
    (plan.staffing || []).forEach(([building, member, share]) => {
        if (!roster[member]) return;
        busy[member] += share;
        where[member].set(building, (where[member].get(building) || 0) + share);
    });
    // The growing jobs (sowing, reaping and the like) take seconds a harvest, so they don't count
    // as busy time, but someone has to do them: each goes to the least busy Aniimo able to.
    const jobs = new Map();
    (plan.coin_items || []).forEach(step => {
        if (step.status !== 'producing' || !(step.facility === 'Farmland' || step.facility === 'Woodland')) return;
        (recipeIndex.find(r => r.name === step.item_name)?.jobs || []).forEach(([job, ability, level]) => {
            jobs.set(`${job}|${ability}|${level}|${step.facility}`, { job, ability, level, facility: step.facility });
        });
    });
    jobs.forEach(({ job, ability, level, facility }) => {
        const able = roster.map((a, i) => i).filter(i => (roster[i].abilities[ability] || 0) >= level);
        if (!able.length) return;
        const pick = able.reduce((a, b) => (busy[b] / roster[b].count < busy[a] / roster[a].count ? b : a));
        const place = `${job} on ${facility}`;
        if (!where[pick].has(place)) where[pick].set(place, 1);
    });
    const have = roster.reduce((sum, a) => sum + a.count, 0);
    const working = roster.reduce((sum, a, i) => sum + Math.min(a.count, Math.ceil(busy[i] - 1e-6)), 0);
    const rows = roster.map((aniimo, i) => {
        const places = [...where[i]].map(([place, n]) => Number.isInteger(n) && n > 1 ? `${place} ×${n}` : place).join(', ');
        const abilities = Object.entries(aniimo.abilities).map(([ability, level]) => `${abilityTag(ability)} ${level}`).join(' ');
        const letters = aniimo.personalities.map(personalityLetter).join('');
        return `<tr><td data-label="Aniimo">${rosterLabel(aniimo, i)}<div class="hint small">${abilities} · ${letters}</div></td><td data-label="How many">${aniimo.count}</td><td data-label="Busy on average">${busy[i].toFixed(1)}</td><td data-label="Where">${places || '<span class="hint small">idle</span>'}</td></tr>`;
    }).join('');
    document.getElementById('aniimo-summary').innerHTML = roster.length
        ? `<table class="aniimo-table"><thead><tr><th>${window.th ? window.th('th_aniimo', 'Aniimo') : 'Aniimo'}</th><th>${window.th ? window.th('th_how_many', 'How many') : 'How many'}</th><th>${window.th ? window.th('th_busy_avg', 'Busy on average') : 'Busy on average'}</th><th>${window.th ? window.th('th_where', 'Where') : 'Where'}</th></tr></thead><tbody>${rows}</tbody></table>
           <p class="hint small">${working} of your ${have} Aniimo have work in this plan.</p>`
        : '<p class="hint">Add the Aniimo you have under My Aniimo to plan with them.</p>';
    document.getElementById('aniimo-collapsed-summary').textContent = '';
    document.getElementById('aniimo-abilities').innerHTML = '';
    const count = document.getElementById('aniimo-count');
    document.getElementById('aniimo-count-have').textContent = working;
    const of = document.getElementById('aniimo-count-of');
    of.textContent = have;
    of.hidden = false;
    count.hidden = false;
    count.classList.remove('over');
    count.title = `${working} of your ${have} Aniimo have work in this plan`;
}

// --- Season (Lễ hội Trung Thu) -------------------------------------------------------------
// The Harvest Moon Festival (see `SEASON`): on the page from RV 10, or always in Advanced mode,
// where there's no RV level to go by. While it's on, players can configure dedicated plots for
// Moondew Radish and Waxing Moon Pepper, select festival dishes to prioritize, and earn Harvest Moon points.

let seasonRadishPlots = 2;
let seasonPepperPlots = 2;
let selectedSeasonDishes = new Set(SEASON_RECIPES.map(r => r.name));

function seasonAvailable() {
    return !isSimpleMode() || selectedHomeLevel() >= SEASON.minHomeLevel;
}

function seasonActive() {
    return seasonAvailable() && document.getElementById('season-on')?.checked;
}

function updateSeasonPlotsSummary() {
    const summaryEl = document.getElementById('season-plots-summary');
    if (!summaryEl) return;
    const totalFarmland = simpleSetup(selectedHomeLevel()).facilities['Farmland']?.[0]?.count || 32;
    const used = seasonRadishPlots + seasonPepperPlots;
    const remaining = Math.max(0, totalFarmland - used);
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (isVi) {
        summaryEl.innerHTML = `Dành <strong>${used} ô đất</strong> (${seasonRadishPlots} Củ cải + ${seasonPepperPlots} Ớt) cho sự kiện Trung Thu. Còn lại <strong>${remaining} ô đất nông nghiệp</strong> cho nhân sâm, lúa nước và các cây trồng khác.`;
    } else {
        summaryEl.innerHTML = `Dedicated <strong>${used} plots</strong> (${seasonRadishPlots} Radish + ${seasonPepperPlots} Pepper) for the event. Remaining <strong>${remaining} farmland plots</strong> for standard agriculture.`;
    }
}

function renderSeason() {
    const seasonSec = document.getElementById('season-section');
    if (seasonSec) seasonSec.hidden = !seasonAvailable();
    const seasonCfg = document.getElementById('season-config');
    if (seasonCfg) seasonCfg.hidden = !seasonActive();

    // Update stepper inputs
    const radishInput = document.getElementById('season-radish-plots');
    if (radishInput) radishInput.value = seasonRadishPlots;
    const pepperInput = document.getElementById('season-pepper-plots');
    if (pepperInput) pepperInput.value = seasonPepperPlots;

    updateSeasonPlotsSummary();

    const notesGrid = document.getElementById('season-notes');
    if (notesGrid) {
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        notesGrid.innerHTML = SEASON_RECIPES.map(r => {
            const checked = selectedSeasonDishes.has(r.name);
            const pointsText = `+${r.points} ${isVi ? 'điểm' : 'pts'}`;
            return `
            <label class="season-dish-card ${checked ? 'active' : ''}">
                <input type="checkbox" class="dish-checkbox" data-season-dish="${r.name}"${checked ? ' checked' : ''}>
                <div class="dish-thumb">
                    ${renderItemIcon(r.name)}
                </div>
                <div class="dish-details">
                    <span class="dish-name">${getItemDisplayName(r.name)}</span>
                    <span class="dish-meta">
                        <span class="dish-facility">${getFacilityDisplayName(r.facility)}</span>
                        <span class="dish-points-badge">${pointsText}</span>
                    </span>
                </div>
            </label>`;
        }).join('');
    }
}

function attachSeasonHandlers() {
    document.getElementById('season-on')?.addEventListener('change', () => {
        renderStrategy();
        saveInputsToStorage();
    });

    // Stepper buttons for dedicated festival plots
    document.querySelectorAll('[data-step-plot]').forEach(btn => {
        btn.addEventListener('click', () => {
            const crop = btn.dataset.stepPlot;
            const dir = Number(btn.dataset.stepDir);
            if (crop === 'radish') {
                seasonRadishPlots = Math.max(0, Math.min(10, seasonRadishPlots + dir));
                const input = document.getElementById('season-radish-plots');
                if (input) input.value = seasonRadishPlots;
            } else if (crop === 'pepper') {
                seasonPepperPlots = Math.max(0, Math.min(10, seasonPepperPlots + dir));
                const input = document.getElementById('season-pepper-plots');
                if (input) input.value = seasonPepperPlots;
            }
            updateSeasonPlotsSummary();
            saveInputsToStorage();
        });
    });

    // Inputs for dedicated plots
    document.getElementById('season-radish-plots')?.addEventListener('input', (e) => {
        seasonRadishPlots = Math.max(0, Math.min(10, Number(e.target.value) || 0));
        updateSeasonPlotsSummary();
        saveInputsToStorage();
    });
    document.getElementById('season-pepper-plots')?.addEventListener('input', (e) => {
        seasonPepperPlots = Math.max(0, Math.min(10, Number(e.target.value) || 0));
        updateSeasonPlotsSummary();
        saveInputsToStorage();
    });

    // Dishes selection
    document.getElementById('season-notes')?.addEventListener('change', (e) => {
        const name = e.target.dataset.seasonDish;
        if (!name) return;
        if (e.target.checked) selectedSeasonDishes.add(name);
        else selectedSeasonDishes.delete(name);
        e.target.closest('.season-dish-card')?.classList.toggle('active', e.target.checked);
        saveInputsToStorage();
    });
}

// Every recipe plans may not use: the player's skips, locked special recipes, and unselected season dishes.
function excludedRecipes() {
    const lockedSpecial = SPECIAL_RECIPES.map(r => r.name).filter(name => !unlockedSpecial.has(name));
    const lockedSeason = seasonActive()
        ? SEASON_RECIPES.map(r => r.name).filter(name => !selectedSeasonDishes.has(name))
        : SEASON_RECIPES.map(r => r.name);
    // Going for Aniipods means the best tier only; the others would be cheaper but catch worse.
    const best = wantsAniipods() ? bestAniipod() : null;
    const lesser = best ? ANIIPOD_TIERS.filter(name => name !== best) : [];
    return [...new Set([...skippedRecipes, ...lockedSpecial, ...lockedSeason, ...lesser])];
}

// --- Recipes to skip -------------------------------------------------------------------
// Recipes plans may not use (see `JsPlanInput::exclude` in wasm.rs), for things the player can't
// make yet. Saved with the other inputs.

let skippedRecipes = new Set();

// Every recipe as `{ name, facility }`, loaded once for the search box.
let recipeIndex = [];

function recipeLabel(recipe) {
    return `${prettyItem(recipe.name)} (${recipe.facility})`;
}

async function loadRecipeIndex() {
    try {
        recipeIndex = JSON.parse(await callWorker('get_all_items'))
            .map(r => ({ name: r.name, facility: r.facility, cost: r.cost || 0, seasonSeedCost: r.season_seed_cost || 0, environment: r.environment || null, jobs: r.jobs || [], ingredients: r.raw_materials || [], amounts: r.required_amount || [], yieldAmount: r.yield_amount || 1, byproduct: r.byproduct_item || null, byproductAmount: r.byproduct?.[1] || 0, turns: r.sell_currency === 'none' }))
            .sort((a, b) => a.facility.localeCompare(b.facility) || a.name.localeCompare(b.name));
        document.getElementById('skip-options').innerHTML =
            recipeIndex.map(r => `<option value="${recipeLabel(r)}"></option>`).join('');
        renderSkippedRecipes();
    } catch (error) {
        console.warn('Could not load the recipe list:', error);
    }
}

// The Recipes section's badge, e.g. " (2 on, 3 skipped)", so what's set shows while it's closed.
function renderRecipeCount() {
    const parts = [];
    const on = [...unlockedSpecial].filter(name => SPECIAL_NAMES.has(name)).length;
    if (on) parts.push(`${on} on`);
    if (skippedRecipes.size) parts.push(`${skippedRecipes.size} skipped`);
    document.getElementById('recipe-count').textContent = parts.length ? ` (${parts.join(', ')})` : '';
}

function renderSkippedRecipes() {
    renderRecipeCount();
    const facilityOf = name => recipeIndex.find(r => r.name === name)?.facility;
    document.getElementById('skip-chips').innerHTML = [...skippedRecipes]
        .sort((a, b) => prettyItem(a).localeCompare(prettyItem(b)))
        .map(name => {
            const facility = facilityOf(name);
            return `<span class="skip-chip">${escapeText(prettyItem(name))}${facility ? ` <span class="skip-chip-facility">${facility}</span>` : ''}<button type="button" data-unskip="${escapeText(name)}" aria-label="Stop skipping ${escapeText(prettyItem(name))}" title="Stop skipping">✕</button></span>`;
        }).join('');
}

function setSkipped(name, skipped) {
    if (skipped) skippedRecipes.add(name); else skippedRecipes.delete(name);
    renderSkippedRecipes();
    saveInputsToStorage();
}

// Adds what's typed in the search box: a full "Item (Facility)" pick, or a unique partial match.
function addSkipFromInput() {
    const input = document.getElementById('skip-input');
    const text = input.value.trim().toLowerCase();
    if (!text) return;
    let match = recipeIndex.find(r => recipeLabel(r).toLowerCase() === text);
    if (!match) {
        const partial = recipeIndex.filter(r => recipeLabel(r).toLowerCase().includes(text));
        if (partial.length === 1) match = partial[0];
    }
    if (!match) {
        input.setCustomValidity('Pick a recipe from the list.');
        input.reportValidity();
        return;
    }
    input.setCustomValidity('');
    input.value = '';
    setSkipped(match.name, true);
}

function attachSkipHandlers() {
    document.getElementById('skip-add-btn').addEventListener('click', addSkipFromInput);
    const input = document.getElementById('skip-input');
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSkipFromInput();
        }
    });
    input.addEventListener('input', () => input.setCustomValidity(''));
    document.getElementById('skip-chips').addEventListener('click', (e) => {
        const name = e.target.closest('[data-unskip]')?.dataset.unskip;
        if (name) setSkipped(name, false);
    });
    // The ✕ on a plan row skips that recipe and plans again.
    document.getElementById('facility-plan-container').addEventListener('click', (e) => {
        const name = e.target.closest('[data-skip]')?.dataset.skip;
        if (!name) return;
        setSkipped(name, true);
        runFindPlan();
    });
}

// --- Strategy ----------------------------------------------------------------------------
// "Level up" plans the soonest next RV level-up (its coins plus Wood Blocks and Mineral Sand, or
// from RV 7 a Woodworking Bench item and a Chimney Kiln item, less what's already in stock);
// "Priorities" makes as much of each ticked priority as the ones above it allow.

// What the player has toward a level-up, by item name ('coins' for coins).
let levelUpStock = {};

// The highest ability level an Aniimo reaches, and the abilities that stop short of it; mirrors
// `MAX_ANIIMO_LEVEL` and `ABILITY_DEFAULTS` in models.rs.
const MAX_ANIIMO_LEVEL = 4;
// Abilities to assume less of unless the player says otherwise: there is no level-4 Perfumery
// Aniimo in the game yet, so one isn't assumed, but a player who has one can say so.
const ABILITY_DEFAULTS = { Perfumery: 3 };
const defaultLevelFor = ability => ABILITY_DEFAULTS[ability] ?? MAX_ANIIMO_LEVEL;

// Which abilities a level matters for: the ones a facility works with, since a crop's grow time
// is fixed and an environment building's Aniimo level isn't known to change anything. Largest
// first so the list reads in the game's ability order.
function levelledAbilities() {
    const used = new Set(FACILITIES.map(f => f.ability).filter(Boolean));
    return ABILITIES.map(a => a.name).filter(name => used.has(name));
}

// The ability levels the player says they have, for the plan input. An ability left out is taken
// as level 4; the game's own ceiling applies on top (see `max_level_for` in models.rs).
let aniimoLevels = {};

// What to send the solver for `setup`: the per-ability levels, or the player's roster (see
// `aniimo_setup_from` and `JsRoster` in wasm.rs).
function aniimoInput(setup) {
    if (setup.startsWith('roster')) return { aniimo: 'roster', roster: rosterPayload(), aniimo_levels: {} };
    const levels = {};
    levelledAbilities().forEach(ability => { levels[ability] = bestAniimoLevel(ability); });
    return { aniimo: setup.split(':')[0], aniimo_levels: levels };
}

function bestAniimoLevel(ability) {
    return aniimoLevels[ability] ?? defaultLevelFor(ability);
}


// Which of the three setups is on screen.
function selectedSetupTab() {
    if (document.getElementById('aniimo-minimum')?.checked) return 'minimum';
    if (document.getElementById('aniimo-custom')?.checked) return 'custom';
    return 'best';
}

// A row of level buttons, one picked, in the same segmented style as the tabs above. A level the
// game isn't known to have is marked, and asks before it's taken.
function levelPicker(group, chosen, ability, label) {
    const usual = defaultLevelFor(ability);
    return `<span class="tabs level-picker" role="radiogroup" aria-label="${label}">${[1, 2, 3, 4]
        .map(level => {
            const unheardOf = level > usual;
            const w = getWorkerForLevel(ability, level);
            const wName = w ? ` · ${w.name}${w.is_prismana && level >= 4 ? ' (Prismana)' : ''}` : '';
            const mark = unheardOf
                ? ` class="unheard-of" title="Chưa có Aniimo ${ability} cấp ${level} trong dữ liệu game"`
                : ` title="Cấp ${level}${wName}"`;
            const confirm = unheardOf ? ` data-confirm="${ability}"` : '';
            return `<label${mark}><input type="radio" name="${group}" value="${level}"${chosen === level ? ' checked' : ''}${confirm}> ${level}</label>`;
        })
        .join('')}</span>`;
}

// Best: the level the player has of each ability a level matters for.
function renderAbilityLevels() {
    const list = document.getElementById('ability-levels');
    if (!list) return;
    list.innerHTML = levelledAbilities().map(ability => {
        const chosen = bestAniimoLevel(ability);
        const w = getWorkerForLevel(ability, chosen);
        const isPrismana = w && w.is_prismana && chosen >= 4;
        const avatarHtml = w ? `
            <span class="ability-chosen-avatar ${isPrismana ? 'is-prismana' : ''}" title="${w.name} · Cấp ${chosen}${isPrismana ? ' (Prismana)' : ''}">
                <img class="chosen-avatar-img" src="${w.img_url}" alt="${w.name}" loading="lazy" onerror="this.src='https://aniimoguide.com/images/aniimo/head_round/${w.number || '10011'}.webp'">
                <span class="chosen-worker-name">${w.name}</span>
            </span>` : '';
        return `
            <div class="ability-level">
                <div class="ability-level-info">
                    ${abilityTag(ability)}
                    ${avatarHtml}
                </div>
                ${levelPicker(`level-${ability}`, chosen, ability, `${ability} level`)}
            </div>`;
    }).join('');
}

// Shows the settings for whichever setup is picked, and works that plan out.
function showAniimoSetup() {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const tab = selectedSetupTab();
    const panel = document.getElementById('aniimo-setup-panel');
    if (panel) panel.hidden = true;
    const levels = document.getElementById('ability-levels');
    if (levels) levels.hidden = true;
    const editor = document.getElementById('roster-editor');
    if (editor) editor.hidden = true;
    const hint = document.getElementById('aniimo-setup-hint');
    if (hint) {
        hint.textContent = isVi ? 'Tổ đội công nhân luôn được tối ưu tự động theo các Aniimo cấp cao nhất.' : 'Workers automatically optimized with best Aniimos.';
    }
    switchAniimoSetup();
}

const ITEM_NAMES = {
    coins: 'Home Coins',
    wood_block: 'Wood Blocks',
    mineral_sand: 'Mineral Sand',
    umbral_sweet_and_spicy_sauce: 'Umbral Sweet and Spicy Sauce',
    coarse_sifted_ore: 'Coarse-Sifted Ore',
    river_washed_stones: 'River-Washed Stones',
    premium_river_washed_stones: 'Premium River-Washed Stones',
    sugar_roasted_chestnuts: 'Sugar-Roasted Chestnuts',
    flowers_in_a_bottle: 'Flowers in a Bottle',
};

function getFacilityDisplayName(name) {
    if (!name) return name;
    if (window.i18n && window.i18n.getLang() === 'vi') {
        const dict = window.VI_FACILITY_NAMES || {};
        const cleanName = name.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '');
        const suffix = name.includes('(Electric)') ? ' (Điện)' : name.includes('(Manual)') ? ' (Thủ công)' : '';
        if (dict[cleanName]) {
            return dict[cleanName] + suffix;
        }
    }
    return name;
}

function getModuleDisplayName(name) {
    if (!name) return name;
    if (window.i18n && window.i18n.getLang() === 'vi') {
        const dict = window.VI_MODULE_NAMES || {};
        if (dict[name]) return dict[name];
    }
    return name.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

function getItemDisplayName(name) {
    if (window.i18n && window.i18n.getLang() === 'vi') {
        const viDict = window.VI_ITEM_NAMES;
        if (viDict && viDict[name]) return viDict[name];
    }
    return ITEM_NAMES[name] || prettyItem(name);
}

function isLevelUpStrategy() {
    return true;
}

// Priorities is removed per user configuration; Level Up is the primary strategy.
const PRIORITY_TARGETS = [
    { id: 'coins', label: 'Home Coins' },
    { id: 'aniimo_exp', label: 'Aniimo EXP' },
    { id: 'aniipods', label: 'Aniipods' },
    { id: 'Wood Blocks', label: 'Wood Blocks' },
    { id: 'Mineral Sand', label: 'Mineral Sand' },
    { id: 'season_points', label: SEASON.points, season: true },
];

const ARROW_UP = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 2.5 L10 7 H2 Z" fill="currentColor"/></svg>';
const ARROW_DOWN = '<svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true"><path d="M6 9.5 L10 5 H2 Z" fill="currentColor"/></svg>';

let priorityOrder = PRIORITY_TARGETS.map(t => ({ target: t.id, on: t.id === 'coins' }));

function isPriorityStrategy() {
    return false;
}

function shownPriorities() {
    return [];
}

function activePriorities() {
    return [];
}

function wantsAniipods() {
    return false;
}

// A priority's name, with the Aniipod tier the plan would make.
function priorityLabel(target, aniipod = bestAniipod()) {
    if (target === 'aniipods') return aniipod ? prettyItem(aniipod) : 'Aniipods';
    return PRIORITY_TARGETS.find(t => t.id === target)?.label || CURRENCY_LABELS[target] || target;
}

function renderPriorities() {
    const list = document.getElementById('priority-list');
    if (!list) return;
    const best = bestAniipod();
    const shown = shownPriorities();
    list.innerHTML = shown.map((p, at) => {
        // Indices into `priorityOrder`, which also holds any priority that isn't shown.
        const i = priorityOrder.indexOf(p);
        const above = at > 0 ? priorityOrder.indexOf(shown[at - 1]) : -1;
        const below = at < shown.length - 1 ? priorityOrder.indexOf(shown[at + 1]) : -1;
        const label = priorityLabel(p.target, best);
        const note = p.target === 'aniipods' && !best ? ' <span class="hint small">(no Aniipod Maker yet)</span>' : '';
        return `
        <li class="priority${p.on ? '' : ' off'}" draggable="true" data-index="${i}">
            <span class="drag-handle" aria-hidden="true">⋮⋮</span>
            <span class="priority-rank">${p.on ? shown.slice(0, at + 1).filter(q => q.on).length : ''}</span>
            <span class="priority-name">${label}${note}</span>
            <label class="priority-switch" title="${p.on ? 'On: the plan goes for this' : 'Off: the plan ignores this'}">
                <input type="checkbox" role="switch" data-toggle="${i}" aria-label="${label}"${p.on ? ' checked' : ''}>
                <span class="switch-track" aria-hidden="true"></span>
                <span class="switch-text">${p.on ? 'On' : 'Off'}</span>
            </label>
            <span class="priority-move">
                <button type="button" data-move="${i}" data-to="${above}" data-by="-1" aria-label="Move ${label} up"${above < 0 ? ' disabled' : ''}>${ARROW_UP}</button>
                <button type="button" data-move="${i}" data-to="${below}" data-by="1" aria-label="Move ${label} down"${below < 0 ? ' disabled' : ''}>${ARROW_DOWN}</button>
            </span>
        </li>`;
    }).join('');
}

function movePriority(from, to) {
    if (to < 0 || to >= priorityOrder.length || from === to) return;
    const [moved] = priorityOrder.splice(from, 1);
    priorityOrder.splice(to, 0, moved);
    renderPriorities();
    saveInputsToStorage();
}

function attachPriorityHandlers() {
    const list = document.getElementById('priority-list');
    if (!list) return;
    list.addEventListener('change', (e) => {
        const i = e.target.dataset.toggle;
        if (i === undefined) return;
        priorityOrder[i].on = e.target.checked;
        renderPriorities();
        saveInputsToStorage();
    });
    list.addEventListener('click', (e) => {
        const button = e.target.closest('[data-move]');
        if (!button) return;
        const to = Number(button.dataset.to);
        movePriority(Number(button.dataset.move), to);
        list.querySelector(`[data-move="${to}"][data-by="${button.dataset.by}"]`)?.focus();
    });
    let dragFrom = null;
    list.addEventListener('dragstart', (e) => {
        const item = e.target.closest('li[data-index]');
        if (!item) return;
        dragFrom = Number(item.dataset.index);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragFrom));
    });
    list.addEventListener('dragover', (e) => {
        if (dragFrom === null) return;
        e.preventDefault();
        const over = e.target.closest('li[data-index]');
        list.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
        if (over) over.classList.add('drop-target');
    });
    list.addEventListener('drop', (e) => {
        e.preventDefault();
        const over = e.target.closest('li[data-index]');
        if (dragFrom !== null && over) movePriority(dragFrom, Number(over.dataset.index));
        dragFrom = null;
    });
    list.addEventListener('dragend', () => {
        dragFrom = null;
        renderPriorities();
    });
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

// The RV level being worked toward: the next one in simple mode, the picked one in advanced.
function levelUpTarget() {
    if (isSimpleMode()) return selectedHomeLevel() + 1;
    return numberOrDefault(document.getElementById('level-up-target').value, 7);
}

// The target's cost, or null if it isn't known.
function levelUpCost() {
    return LEVEL_UP_COSTS[levelUpTarget()] || null;
}

// Why the level-up can't be planned, or null if it can.
function levelUpUnavailable() {
    const target = levelUpTarget();
    if (target > MAX_HOME_LEVEL) return `RV ${MAX_HOME_LEVEL} is the top level, so there's no level-up to plan.`;
    if (!LEVEL_UP_COSTS[target]) return `There's no level-up cost for RV ${target}.`;
    return null;
}

// Everything worth counting toward `cost`: coins, and each chain up to the tier it needs.
function stockNames(cost) {
    const names = ['coins'];
    cost.items.forEach(([item]) => {
        const chain = LEVEL_UP_CHAINS.find(c => c.includes(item));
        if (chain) names.push(...chain.slice(0, chain.indexOf(item) + 1));
    });
    return names;
}

function stockAmount(name) {
    const amount = Number(levelUpStock[name]);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function populateLevelUpTargets() {
    const select = document.getElementById('level-up-target');
    select.innerHTML = Object.keys(LEVEL_UP_COSTS).map(level => `<option value="${level}">${level}</option>`).join('');
}

function renderStrategy() {
    renderSeason();
    const levelUpConfig = document.getElementById('level-up-config');
    if (levelUpConfig) levelUpConfig.style.display = 'block';
    const prioritiesConfig = document.getElementById('priorities-config');
    if (prioritiesConfig) prioritiesConfig.style.display = 'none';

    // Simple mode always plans the next RV level, so only Advanced picks one.
    const targetRow = document.getElementById('level-up-target-row');
    if (targetRow) targetRow.style.display = isSimpleMode() ? 'none' : '';

    const costEl = document.getElementById('level-up-cost');
    const stockDetails = document.getElementById('level-up-stock');
    if (!costEl || !stockDetails) return;
    const unavailable = levelUpUnavailable();
    if (unavailable) {
        const noteText = window.i18n && window.i18n.getLang() === 'vi'
            ? `${unavailable} Kế hoạch sẽ ưu tiên kiếm nhiều Home Coin nhất.`
            : `${unavailable} Plans will go for the most Home Coins.`;
        costEl.innerHTML = `<p class="level-up-note">${noteText}</p>`;
        stockDetails.style.display = 'none';
        return;
    }
    const cost = levelUpCost();
    const chip = (amount, name) => `<div class="chip"><span><span class="chip-count">${formatNumber(amount)}</span> ${getItemDisplayName(name)}</span></div>`;
    const titleText = (window.i18n ? window.i18n.t('rv_costs') : 'RV {level} costs').replace('{level}', levelUpTarget());
    costEl.innerHTML = `
        <p class="assume-title">${titleText}</p>
        <div class="chip-grid">${chip(cost.coins, 'coins')}${cost.items.map(([item, n]) => chip(n, item)).join('')}</div>`;
    stockDetails.style.display = '';
    const stockGrid = document.getElementById('level-up-stock-grid');
    if (stockGrid) {
        stockGrid.innerHTML = stockNames(cost).map(name => `
            <div class="input-field">
                <label for="stock-${name}">${getItemDisplayName(name)}</label>
                <input type="number" id="stock-${name}" data-stock="${name}" min="0" value="${stockAmount(name)}">
            </div>`).join('');
    }
}

function attachStrategyHandlers() {
    document.getElementById('strategy-level-up')?.addEventListener('change', renderStrategy);
    document.getElementById('strategy-priorities')?.addEventListener('change', renderStrategy);
    document.getElementById('level-up-target')?.addEventListener('change', () => {
        levelUpTargetChosen = true;
        renderStrategy();
    });
    const grid = document.getElementById('level-up-stock-grid');
    grid?.addEventListener('input', (e) => {
        const name = e.target.dataset.stock;
        if (!name) return;
        levelUpStock[name] = Math.max(0, floatOrDefault(e.target.value, 0));
        saveInputsToStorage();
    });
    grid?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && e.target.matches('input')) runFindPlan();
    });
}

// The level-up the solver should plan for (see `JsPlanInput::level_up` in wasm.rs), or null.
function levelUpInput() {
    if (!isLevelUpStrategy() || levelUpUnavailable()) return null;
    const cost = levelUpCost();
    return {
        cost: [['coins', cost.coins], ...cost.items],
        stock: stockNames(cost).filter(name => stockAmount(name) > 0).map(name => [name, stockAmount(name)]),
    };
}

// A per-second rate as a per-hour figure, with a decimal when it's small.
function perHour(perSecond) {
    const hourly = perSecond * 3600;
    return hourly < 10 ? hourly.toFixed(1) : formatNumber(Math.round(hourly));
}

// "2d 4h", "5h 12m", "12m": how long until a level-up is covered.
function formatDuration(seconds) {
    const minutes = Math.ceil(seconds / 60);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
}

// What the plans on screen were asked for, so they're described against the right target even
// after the inputs change.
let planContext = null;

// The level-up part of the rate card: how soon the plan covers the target's cost, one line per
// cost at the selected rate unit. With a table to show, the unit select moves into its rate
// column and the separate coin rate is hidden, since the Coins row says the same.
function renderLevelUp(plan) {
    const card = document.getElementById('level-up-card');
    const select = document.getElementById('rate-unit');
    const rateBlock = document.getElementById('rate-block');
    if (select.closest('#level-up-card')) document.getElementById('rate-line').appendChild(select);
    rateBlock.style.display = '';
    const context = planContext;
    if (!context || !context.levelUp) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'block';
    const label = document.getElementById('level-up-label');
    const time = document.getElementById('level-up-time');
    const lines = document.getElementById('level-up-lines');
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    label.textContent = isVi ? `NÂNG CẤP RV ${context.target}` : `RV ${context.target} level-up`;
    const report = plan.level_up;
    if (context.unavailable) {
        time.textContent = '-';
        lines.innerHTML = `<p class="level-up-note">${context.unavailable} ${isVi ? 'Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'This plan is for the most Home Coins.'}</p>`;
        return;
    }
    if (context.ready) {
        time.textContent = isVi ? 'Đã đủ nguyên liệu' : 'Ready now';
        lines.innerHTML = `<p class="level-up-note">${isVi ? 'Bạn đã có đủ mọi nguyên liệu cần thiết. Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'You already have everything it costs. This plan is for the most Home Coins.'}</p>`;
        return;
    }
    if (!report) {
        const why = plan.level_up_note === 'unreachable'
            ? (isVi ? 'Các cơ sở hiện tại không thể sản xuất đủ toàn bộ nguyên liệu yêu cầu.' : `These facilities can't make everything it costs.`)
            : (isVi ? 'Không thể lập kế hoạch nâng cấp cấp RV này.' : `The level-up couldn't be planned.`);
        time.textContent = '-';
        lines.innerHTML = `<p class="level-up-note">${why} ${isVi ? 'Kế hoạch này tập trung kiếm nhiều Home Coin nhất.' : 'This plan is for the most Home Coins.'}</p>`;
        return;
    }
    time.textContent = isVi ? `trong ${formatDuration(report.seconds)}` : `in ${formatDuration(report.seconds)}`;
    const { multiplier } = RATE_UNIT_SECONDS[select.value] || RATE_UNIT_SECONDS.second;
    const perUnit = perSecond => formatRate(perSecond * multiplier);
    const slowest = Math.max(...report.requirements.map(r => r.seconds ?? Infinity));
    const rows = report.requirements.map(r => {
        const ready = r.seconds === null
            ? (isVi ? 'không thể' : 'never')
            : r.seconds === 0
                ? (isVi ? 'đã đủ' : 'have it')
                : formatDuration(r.seconds);
        const isSlowest = r.seconds !== null && r.seconds > 0 && r.seconds >= slowest * (1 - 1e-6);
        return `<tr${isSlowest ? ' class="slowest"' : ''}>
            <td>${getItemDisplayName(r.name)}</td>
            <td>${formatNumber(r.need)}</td>
            <td>${formatNumber(r.have)}</td>
            <td>${perUnit(r.per_second)}</td>
            <td>${ready}</td>
        </tr>`;
    }).join('');
    // What's left over once everything is ready and paid for: costs that finish early keep coming
    // in while the slowest one finishes.
    const surplus = report.requirements
        .map(r => ({ name: r.name, spare: Math.floor(r.have + r.per_second * report.seconds - r.need) }))
        .concat((report.leftovers || []).map(([name, amount]) => ({ name, spare: Math.floor(amount) })))
        .filter(r => r.spare >= 1)
        .map(r => `${formatNumber(r.spare)} ${r.name === 'coins' ? 'Home Coins' : getItemDisplayName(r.name)}`);
    const surplusLabel = isVi ? 'Thặng dư:' : 'Surplus:';
    const coinsNote = surplus.length
        ? `<p class="level-up-coins"><span>${surplusLabel}</span> <strong>${surplus.join(', ')}</strong></p>`
        : '';
    lines.innerHTML = `
        <table class="level-up-lines">
            <thead><tr><th>${window.th ? window.th('th_cost', 'Cost') : 'Cost'}</th><th>${window.th ? window.th('th_need', 'Need') : 'Need'}</th><th>${window.th ? window.th('th_have', 'Have') : 'Have'}</th><th id="level-up-rate-head"></th><th>${window.th ? window.th('th_ready_in', 'Ready in') : 'Ready in'}</th></tr></thead>
            <tbody>${rows}</tbody>
        </table>
        ${coinsNote}`;
    document.getElementById('level-up-rate-head').appendChild(select);
    rateBlock.style.display = 'none';
}

// The seeds a plan plants: one seed per planting of each Farmland and Woodland crop, and what
// they cost. A level-up plan counts them until the level-up is ready; others per the rate
// card's unit. Mines, Wells and resident facilities aren't planted.
function renderSeedTable(plan) {
    const card = document.getElementById('seed-card');
    const el = document.getElementById('seed-table');
    const unit = document.getElementById('rate-unit').value;
    const levelUp = plan.level_up && plan.level_up.seconds > 0 && planContext?.levelUp ? plan.level_up : null;
    const multiplier = levelUp ? levelUp.seconds : (RATE_UNIT_SECONDS[unit] || RATE_UNIT_SECONDS.second).multiplier;
    const rows = (plan.coin_items || [])
        .filter(s => (s.facility === 'Farmland' || s.facility === 'Woodland') && s.status === 'producing' && s.cycle_time > 0)
        .map(s => {
            const perSecond = s.facility_count / s.cycle_time;
            const recipe = recipeIndex.find(r => r.name === s.item_name);
            const cost = recipe?.cost || 0;
            // Whole seeds when counting to the level-up.
            const seeds = levelUp ? Math.ceil(perSecond * multiplier) : perSecond * multiplier;
            const wheat = seeds * (recipe?.seasonSeedCost || 0);
            return { name: s.item_name, facility: s.facility, plots: s.facility_count, seeds, cost: seeds * cost, wheat };
        })
        .sort((a, b) => b.seeds - a.seeds);
    if (rows.length === 0) {
        card.style.display = 'none';
        return;
    }
    const amount = formatRate;
    const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
    const totalWheat = rows.reduce((sum, r) => sum + r.wheat, 0);
    const totals = [
        totalCost > 0 ? `${amount(totalCost)} Home Coins` : '',
        totalWheat > 0 ? `${amount(totalWheat)} ${SEASON.currency}` : '',
    ].filter(Boolean).join(' + ');
    card.style.display = 'block';
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const per = levelUp
        ? (isVi ? `đến RV ${planContext.target}` : `until RV ${planContext.target}`)
        : (isVi
            ? ({ second: 'mỗi giây', minute: 'mỗi phút', hour: 'mỗi giờ', day: 'mỗi ngày' }[unit] || 'mỗi giây')
            : ({ second: 'per second', minute: 'per minute', hour: 'per hour', day: 'per day' }[unit] || 'per second'));
    document.getElementById('seed-card-unit').textContent = isVi
        ? `Hạt giống cần ${per}: 1 hạt cho mỗi lượt gieo trồng trên Đất nông nghiệp và Vườn ươm trong kế hoạch.`
        : `Seeds ${per}: one per planting, for every Farmland and Woodland crop in the plan.`;
    el.innerHTML = `
        <table>
            <thead><tr><th>${window.th ? window.th('th_crop', 'Crop') : 'Crop'}</th><th>${window.th ? window.th('th_plots', 'Plots') : 'Plots'}</th><th>${window.th ? window.th('th_seeds', 'Seeds') : 'Seeds'}</th><th>${window.th ? window.th('th_cost', 'Cost') : 'Cost'}</th></tr></thead>
            <tbody>${rows.map(r => `<tr>
                <td>${prettyItem(r.name)}</td>
                <td>${r.plots}</td>
                <td>${amount(r.seeds)}</td>
                <td>${r.wheat > 0 ? `${amount(r.wheat)} ${SEASON.currency}` : r.cost > 0 ? `${amount(r.cost)} Home Coins` : (isVi ? 'miễn phí' : 'free')}</td>
            </tr>`).join('')}</tbody>
            ${rows.length > 1 && totals ? `<tfoot><tr><td colspan="3">${isVi ? 'Tổng cộng' : 'Total'}</td><td>${totals}</td></tr></tfoot>` : ''}
        </table>`;
}

// What each product sold earns in a level-up plan, per hour and by the time the level-up is
// ready. (Priorities plans show this in the goal card instead.)
function renderProfitBreakdown(plan) {
    const card = document.getElementById('profit-card');
    const report = plan.level_up;
    const streams = (plan.income_streams || []).filter(s => s.units_per_second > 0);
    if (!report || streams.length === 0) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'block';
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const total = streams.reduce((sum, s) => sum + s.rate_per_second, 0);
    const rows = [...streams]
        .sort((a, b) => b.rate_per_second - a.rate_per_second)
        .map(s => `<tr>
            <td data-label="${isVi ? 'Sản phẩm' : 'Product'}">
                <div class="item-cell">
                    ${renderItemIcon(s.item_name)}
                    <span class="item-name-text">${prettyItem(s.item_name)}</span>
                </div>
            </td>
            <td data-label="${isVi ? 'Cơ sở' : 'Facility'}">
                <div class="facility-cell">
                    ${renderFacilityIcon(s.facility)}
                    <span class="facility-name-text">${getFacilityDisplayName(s.facility)}</span>
                </div>
            </td>
            <td data-label="${isVi ? 'Bán / giờ' : 'Sold per hour'}">${perHour(s.units_per_second)}</td>
            <td data-label="${isVi ? 'Lợi nhuận / giờ' : 'Profit per hour'}">${formatNumber(Math.round(s.rate_per_second * 3600))}</td>
            <td data-label="${isVi ? 'Tỷ lệ' : 'Share'}">${total > 0 ? Math.round(s.rate_per_second / total * 100) : 0}%</td>
            <td data-label="${isVi ? `Lợi nhuận đến RV ${planContext?.target}` : `Profit until RV ${planContext?.target}`}">${formatNumber(Math.floor(s.rate_per_second * report.seconds))}</td>
        </tr>`).join('');
    const profitUntilHeader = (window.th ? window.th('th_profit_until_rv', 'Profit until RV {rv}') : 'Profit until RV {rv}').replace('{rv}', planContext?.target || '');
    document.getElementById('profit-breakdown').innerHTML = `
        <div class="table-wrapper">
            <table class="facility-plan-table">
                <thead><tr><th>${window.th ? window.th('th_product', 'Product') : 'Product'}</th><th>${window.th ? window.th('th_facility', 'Facility') : 'Facility'}</th><th>${window.th ? window.th('th_sold_hour', 'Sold per hour') : 'Sold per hour'}</th><th>${window.th ? window.th('th_profit_hour', 'Profit per hour') : 'Profit per hour'}</th><th>${window.th ? window.th('th_share', 'Share') : 'Share'}</th><th>${profitUntilHeader}</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
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
                is_emode: true,
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
    if (!seasonActive()) return [];
    const radishPlots = seasonRadishPlots;
    const pepperPlots = seasonPepperPlots;
    if (radishPlots <= 0 && pepperPlots <= 0) return [];

    const cycleTime = 1200;
    const yieldPerHarvest = 8;
    const radishPerSec = (radishPlots * yieldPerHarvest) / cycleTime;
    const pepperPerSec = (pepperPlots * yieldPerHarvest) / cycleTime;

    const userChecked = SEASON_RECIPES.filter(r => selectedSeasonDishes.has(r.name));
    if (userChecked.length === 0) return [];

    // Kiểm tra số lượng cơ sở người chơi sở hữu ở cấp RV hiện tại
    const currentSetup = simpleSetup(selectedHomeLevel()).facilities;
    function hasSufficientFacilities(dish) {
        const usage = dish.facilityUsage || { [dish.facility]: 1 };
        for (const [fac, reqCount] of Object.entries(usage)) {
            const owned = currentSetup[fac]?.[0]?.count || 0;
            if (owned < reqCount) return false;
        }
        return true;
    }

    const evaluated = [];
    const baselineRate = Math.max(15, planRateEstimate || 40);

    for (const r of userChecked) {
        const info = SEASON_DISH_DATA[r.name];
        if (!info) continue;
        if (!hasSufficientFacilities(info)) continue;

        // Công suất trần của 1 cơ sở:
        const maxFacCapacity = 1 / (info.cycleTime || 203);

        let availUnits = 0;
        let rawRate = 0;

        if (info.radish > 0 && info.pepper > 0) {
            availUnits = Math.min(radishPerSec / info.radish, pepperPerSec / info.pepper);
            rawRate = Math.min(availUnits, maxFacCapacity) * (info.radish * 74 + info.pepper * 74);
        } else if (info.radish > 0) {
            availUnits = radishPerSec / info.radish;
            rawRate = Math.min(availUnits, maxFacCapacity) * (info.radish * 74);
        } else if (info.pepper > 0) {
            availUnits = pepperPerSec / info.pepper;
            rawRate = Math.min(availUnits, maxFacCapacity) * (info.pepper * 74);
        }

        // Bị chặn trên bởi công suất tối đa của cơ sở chế biến (tránh kế hoạch ảo)
        const maxUnits = Math.min(availUnits, maxFacCapacity);
        const maxRate = maxUnits * info.sellValue;
        const extraGain = maxRate - rawRate;
        const share = maxRate / (baselineRate + maxRate);

        // Quy tắc 1: Nếu món không làm tăng doanh thu hoặc share < 2% -> loại bỏ
        if (extraGain > 0 && share >= 0.02 && maxUnits > 1e-7) {
            evaluated.push({
                ...info,
                maxUnits,
                maxRate,
                extraGain,
                share
            });
        }
    }

    // Quy tắc 1: Không món nào đạt tiêu chuẩn -> bỏ qua tất cả
    if (evaluated.length === 0) return [];

    // Sắp xếp theo doanh thu tối đa giảm dần
    evaluated.sort((a, b) => b.maxRate - a.maxRate || b.points - a.points);

    // Nếu chỉ có 1 món đạt chuẩn -> chọn 1 món (Quy tắc 2)
    if (evaluated.length === 1) {
        return [evaluated[0]];
    }

    const top1 = evaluated[0];
    const top2 = evaluated[1];

    function hasFacilityConflict(dishA, dishB) {
        const usageA = dishA.facilityUsage || { [dishA.facility]: 1 };
        const usageB = dishB.facilityUsage || { [dishB.facility]: 1 };
        const allFacs = new Set([...Object.keys(usageA), ...Object.keys(usageB)]);
        for (const fac of allFacs) {
            const req = (usageA[fac] || 0) + (usageB[fac] || 0);
            const owned = currentSetup[fac]?.[0]?.count || 0;
            if (req > owned) return true;
        }
        return false;
    }

    // Quy tắc 3: Kiểm tra xem có thể chọn 2 món bổ trợ không
    // 3a. Hai món đơn không trùng nguyên liệu và không trùng bất kỳ cơ sở nào
    if ((top1.radish > 0 && top1.pepper === 0 && top2.pepper > 0 && top2.radish === 0) ||
        (top1.pepper > 0 && top1.radish === 0 && top2.radish > 0 && top2.pepper === 0)) {
        if (!hasFacilityConflict(top1, top2)) {
            return [top1, top2];
        }
    }

    // 3b. Top 1 là món combo nhưng thừa nguyên liệu và có món đơn tận dụng phần thừa (khác cơ sở)
    if (top1.radish > 0 && top1.pepper > 0) {
        if (radishPlots > pepperPlots) {
            const singleRadish = evaluated.find(d => d.radish > 0 && d.pepper === 0 && !hasFacilityConflict(top1, d));
            if (singleRadish && singleRadish.share >= 0.02) {
                return [top1, singleRadish];
            }
        } else if (pepperPlots > radishPlots) {
            const singlePepper = evaluated.find(d => d.pepper > 0 && d.radish === 0 && !hasFacilityConflict(top1, d));
            if (singlePepper && singlePepper.share >= 0.02) {
                return [top1, singlePepper];
            }
        }
    }

    // Quy tắc 2: Các trường hợp còn lại (2 món combo cạnh tranh nguyên liệu hoặc trùng cơ sở) -> chỉ chọn 1 món tốt nhất
    return [top1];
}

/**
 * Trả về số lượng cơ sở mà các món ăn sự kiện được chọn sẽ chiếm dụng (tính cả chuỗi sơ chế)
 */
export function getSeasonFacilityUsage(planRateEstimate = 40) {
    const dishes = selectOptimalSeasonDishes(planRateEstimate);
    const usage = {};
    for (const d of dishes) {
        const facUsage = d.facilityUsage || { [d.facility]: 1 };
        for (const [fac, count] of Object.entries(facUsage)) {
            usage[fac] = (usage[fac] || 0) + count;
        }
    }
    return usage;
}

// Get plan-level input values from the form (facilities/modules/prioritize-byproducts, nothing
// goal-related, since find_plan doesn't need a target). Currency is always coins: the full
// release removed Bud Tickets, the only other sellable currency.
function getPlanInputValues() {
    const { facilities, modules } = simpleSetup(selectedHomeLevel());
    const excluded = [...excludedRecipes()];

    // 1. Highest-tier crops rule ONLY for Woodland:
    // Only allow crops of the highest unlocked level for Woodland to maximize Wood Blocks for level-up.
    // At RV 14, Woodland is Lv.5: Only natural_rubber, coconut, quick_maple_syrup are allowed. All lower crops (Lv 1-4) are blocked.
    // Farmland is NOT locked because Farmland does not produce Wood Blocks.
    const woodlandTier = facilities['Woodland']?.[0]?.level || 1;

    const woodlandCropsByLevel = {
        1: ['willow_wood'],
        2: ['bamboo', 'lemon'],
        3: ['cherry_blossom', 'apple', 'maple_syrup', 'quick_bamboo'],
        4: ['palm_bark', 'chestnut', 'walnut', 'quick_lemon'],
        5: ['natural_rubber', 'coconut', 'quick_maple_syrup'],
        6: ['cocoa', 'orange_flower', 'quick_coconut'],
    };

    // If season is active and user wants umbral_pickle, keep apple for cider_vinegar
    const keepAppleForSeason = seasonActive() && selectedSeasonDishes.has('umbral_pickle');

    for (const [lvl, crops] of Object.entries(woodlandCropsByLevel)) {
        if (Number(lvl) < woodlandTier) {
            for (const crop of crops) {
                if (keepAppleForSeason && crop === 'apple') continue;
                if (!excluded.includes(crop)) excluded.push(crop);
            }
        }
    }

    // 2. Block Pearl if Crafting Table Lv.6 (Pearl Necklace) is not unlocked (RV < 15)
    // Selling raw pearl is economically unviable and forces climate wastage.
    const craftingTableLevel = facilities['Crafting Table']?.[0]?.level || 1;
    if (craftingTableLevel < 6) {
        if (!excluded.includes('pearl')) excluded.push('pearl');
    }

    // 3. Deduct dedicated event plots from Farmland and reserve facilities for chosen season dishes
    if (seasonActive()) {
        const optimalDishes = selectOptimalSeasonDishes();
        const needsRockCandy = optimalDishes.some(d => d.name === 'moondew_radish_slices' || d.name === 'harvest_platter');
        const sugarcanePlots = needsRockCandy ? 1 : 0;

        const totalFarmland = facilities['Farmland']?.[0]?.count || 0;
        const dedicated = Math.min(totalFarmland, seasonRadishPlots + seasonPepperPlots + sugarcanePlots);
        if (facilities['Farmland'] && facilities['Farmland'][0]) {
            facilities['Farmland'][0].count = Math.max(0, totalFarmland - dedicated);
        }

        // Quy tắc 4: Luôn ưu tiên cơ sở chế biến cho món ăn sự kiện được chọn (bao gồm cả chuỗi sơ chế)
        const eventFacUsage = getSeasonFacilityUsage();
        for (const [fac, count] of Object.entries(eventFacUsage)) {
            // Không trừ Tidewhisper Sandcastle vì Sandcastle sẽ được cập nhật mục đích sử dụng trực tiếp từ mẻ muối biển
            if (fac === 'Tidewhisper Sandcastle') continue;
            if (facilities[fac] && facilities[fac][0]) {
                facilities[fac][0].count = Math.max(0, facilities[fac][0].count - count);
            }
        }
    }

    return {
        currency: 'coins',
        priorities: activePriorities(),
        prioritize_byproducts: false,
        level_up: levelUpInput(),
        exclude: excluded,
        season: seasonActive(),
        emode_facilities: [],
        emode_facility_counts: {},
        power_grid_rate: getPowerGridRate(),
        production_aniimo_cap: getProductionAniimoCap(),
        facilities,
        modules
    };
}

// Integrates dedicated festival crops and chosen festival dishes into the solved plan
function integrateSeasonPlan(plan) {
    if (!plan || !plan.success || !seasonActive()) return plan;
    const radishPlots = seasonRadishPlots;
    const pepperPlots = seasonPepperPlots;
    if (radishPlots <= 0 && pepperPlots <= 0) return plan;

    // Harvest rate (with watering, cycle is 1200s, yield is 8 per harvest)
    const cycleTime = 1200;
    const yieldPerHarvest = 8;
    let radishPerSec = (radishPlots * yieldPerHarvest) / cycleTime;
    let pepperPerSec = (pepperPlots * yieldPerHarvest) / cycleTime;

    const newSteps = [...(plan.coin_items || [])];
    const newStreams = [...(plan.income_streams || [])];
    let extraCoinsRate = 0;
    let seasonPointsRate = 0;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';

    // Thêm các bước canh tác Farmland mùa vụ
    if (radishPlots > 0) {
        newSteps.push({
            facility: 'Farmland',
            item_name: 'moondew_radish',
            facility_count: radishPlots,
            status: 'producing',
            cycle_time: cycleTime,
            is_grower: true,
            reason: isVi ? 'Canh tác Lễ hội Trung Thu' : 'Harvest Moon Festival farming',
            environment: null
        });
    }
    if (pepperPlots > 0) {
        newSteps.push({
            facility: 'Farmland',
            item_name: 'waxing_moon_pepper',
            facility_count: pepperPlots,
            status: 'producing',
            cycle_time: cycleTime,
            is_grower: true,
            reason: isVi ? 'Canh tác Lễ hội Trung Thu' : 'Harvest Moon Festival farming',
            environment: null
        });
    }

    // Chọn danh sách món ăn sự kiện tối ưu (0, 1 hoặc tối đa 2 món) theo các quy tắc
    const optimalDishes = selectOptimalSeasonDishes(plan.rate_per_second);

    // Nếu có món cần Kẹo đá, thêm 1 ô Farmland trồng Mía
    const needsRockCandy = optimalDishes.some(d => d.name === 'moondew_radish_slices' || d.name === 'harvest_platter');
    if (needsRockCandy) {
        newSteps.push({
            facility: 'Farmland',
            item_name: 'sugarcane',
            facility_count: 1,
            status: 'producing',
            cycle_time: 2400,
            is_grower: true,
            reason: isVi ? 'Dùng cho Kẹo đá; phần còn lại bán trực tiếp' : 'Used for rock_candy; the rest sells directly',
            environment: null
        });
    }

    // Nếu có món cần Nước ngọt (Kẹo đá hoặc Lẩu hắc ám), thêm 1 Giếng nước sản xuất Nước ngọt thường
    const needsFreshWater = needsRockCandy || optimalDishes.some(d => d.name === 'umbral_hot_pot');
    if (needsFreshWater) {
        const fwReason = isVi
            ? (optimalDishes.some(d => d.name === 'umbral_hot_pot') ? (needsRockCandy ? 'Dùng cho Kẹo đá, Lẩu hắc ám' : 'Dùng cho Lẩu hắc ám') : 'Dùng cho Kẹo đá')
            : 'Used for event dishes';
        newSteps.push({
            facility: 'Well',
            item_name: 'fresh_water',
            facility_count: 1,
            status: 'producing',
            cycle_time: 2250,
            is_grower: false,
            is_emode: true,
            reason: fwReason,
            environment: null
        });
    }

    for (const dish of optimalDishes) {
        const maxFacCapacity = 1 / (dish.cycleTime || 203);
        let availUnits = 0;

        if (dish.radish > 0 && dish.pepper > 0) {
            availUnits = Math.min(radishPerSec / dish.radish, pepperPerSec / dish.pepper);
        } else if (dish.radish > 0) {
            availUnits = radishPerSec / dish.radish;
        } else if (dish.pepper > 0) {
            availUnits = pepperPerSec / dish.pepper;
        }

        // Bị chặn trên bởi công suất tối đa của cơ sở chế biến
        const units = Math.min(availUnits, maxFacCapacity);

        if (dish.radish > 0) radishPerSec = Math.max(0, radishPerSec - units * dish.radish);
        if (dish.pepper > 0) pepperPerSec = Math.max(0, pepperPerSec - units * dish.pepper);

        if (units > 1e-7) {
            const coinsPerSec = units * dish.sellValue;
            const ptsPerSec = units * dish.points;
            extraCoinsRate += coinsPerSec;
            seasonPointsRate += ptsPerSec;

            // 1. Nếu món có chuỗi sơ chế (ví dụ Mâm cỗ trung thu cần Kẹo đá, Củ cải sấy lát và Ớt nướng trăng):
            if (dish.prepChain) {
                for (const prep of dish.prepChain) {
                    newSteps.push({
                        facility: prep.facility,
                        item_name: prep.item_name,
                        facility_count: 1,
                        status: 'producing',
                        cycle_time: prep.cycleTime,
                        is_grower: false,
                        is_emode: prep.is_emode || false,
                        reason: isVi ? prep.reasonVi : prep.reasonEn,
                        environment: null
                    });
                }
            }

            // 2. Thêm cơ sở chính hoàn thiện món
            newSteps.push({
                facility: dish.facility,
                item_name: dish.name,
                facility_count: 1,
                status: 'producing',
                cycle_time: dish.cycleTime || 203,
                is_grower: false,
                reason: isVi ? `Món ăn Lễ hội Trung Thu (+${dish.points} điểm)` : `Festival dish (+${dish.points} pts)`,
                environment: null
            });

            // 3. Dòng tiền bán món ăn ra thị trường
            newStreams.push({
                item_name: dish.name,
                facility: dish.facility,
                sell_value: dish.sellValue,
                rate_per_second: coinsPerSec,
                units_per_second: units,
                lead_time_seconds: 0,
                total_units: 0,
                total_value: 0,
                points: dish.points
            });
        }
    }

    // Cập nhật mục đích của cơ sở sản xuất nguyên liệu phụ trợ cho sự kiện:
    // Muối biển từ Lâu đài cát Tidewhisper dùng cho Ớt nướng trăng (hoặc Mâm cỗ trung thu, Sốt cay ngọt)
    const saltDishes = optimalDishes.filter(d => d.name === 'roasted_waxing_moon_pepper' || d.name === 'harvest_platter' || d.name === 'umbral_sweet_and_spicy_sauce');
    if (saltDishes.length > 0) {
        let forTextVi = 'Ớt nướng trăng';
        if (saltDishes.some(d => d.name === 'harvest_platter')) {
            forTextVi = 'Ớt nướng trăng (Mâm cỗ trung thu)';
        } else if (saltDishes.some(d => d.name === 'umbral_sweet_and_spicy_sauce')) {
            forTextVi = 'Sốt cay ngọt hắc ám';
        }
        const purposeText = isVi
            ? `Dùng cho ${forTextVi}; phần còn lại bán trực tiếp`
            : `Used for ${forTextVi}; the rest sells directly`;
        const sandStep = newSteps.find(s => s.facility.includes('Tidewhisper Sandcastle') && s.status === 'producing');
        if (sandStep) {
            sandStep.reason = purposeText;
        } else {
            newSteps.push({
                facility: 'Tidewhisper Sandcastle',
                item_name: 'quick_sea_salt',
                facility_count: 1,
                status: 'producing',
                cycle_time: 2250,
                is_grower: false,
                reason: isVi ? `Dùng cho ${forTextVi}` : `Used for ${forTextVi}`,
                environment: null
            });
        }
    }

    // Nông sản thô còn dư bán trực tiếp lấy coin và điểm (giá 74 coin)
    if (radishPerSec > 1e-7) {
        const coinsPerSec = radishPerSec * 74;
        const ptsPerSec = radishPerSec * 1;
        extraCoinsRate += coinsPerSec;
        seasonPointsRate += ptsPerSec;
        newStreams.push({
            item_name: 'moondew_radish',
            facility: 'Farmland',
            sell_value: 74,
            rate_per_second: coinsPerSec,
            units_per_second: radishPerSec,
            lead_time_seconds: 0,
            total_units: 0,
            total_value: 0,
            points: 1
        });
    }

    if (pepperPerSec > 1e-7) {
        const coinsPerSec = pepperPerSec * 74;
        const ptsPerSec = pepperPerSec * 1;
        extraCoinsRate += coinsPerSec;
        seasonPointsRate += ptsPerSec;
        newStreams.push({
            item_name: 'waxing_moon_pepper',
            facility: 'Farmland',
            sell_value: 74,
            rate_per_second: coinsPerSec,
            units_per_second: pepperPerSec,
            lead_time_seconds: 0,
            total_units: 0,
            total_value: 0,
            points: 1
        });
    }

    let updatedLevelUp = plan.level_up;
    if (plan.level_up && plan.level_up.requirements) {
        const newRatePerSec = plan.rate_per_second + extraCoinsRate;
        const newReqs = plan.level_up.requirements.map(r => {
            if (r.name === 'coins') {
                const short = Math.max(0, r.need - r.have);
                const seconds = short <= 0 ? 0 : (newRatePerSec > 0 ? short / newRatePerSec : null);
                return { ...r, per_second: newRatePerSec, seconds };
            }
            return r;
        });
        updatedLevelUp = {
            ...plan.level_up,
            requirements: newReqs
        };
    }

    return {
        ...plan,
        coin_items: newSteps,
        income_streams: newStreams,
        rate_per_second: plan.rate_per_second + extraCoinsRate,
        season_points: seasonPointsRate,
        level_up: updatedLevelUp
    };
}

/**
 * Tính toán số lượng ô đất Củ cải và Ớt tối ưu (Sweet Spot) để đạt năng suất cao nhất:
 * Cân bằng chính xác giữa năng lực tiêu thụ của cơ sở chế biến và diện tích đất Farmland dành cho cây trồng giá trị cao (Nhân sâm).
 */
export function calculateOptimalSeasonPlots(dishes, homeLevel) {
    if (!dishes || dishes.length === 0) {
        return { radish: 0, pepper: 0, dishNames: [] };
    }

    let reqRadishPerSec = 0;
    let reqPepperPerSec = 0;
    const dishNames = [];

    for (const d of dishes) {
        dishNames.push(prettyItem(d.name));
        const maxFacUnits = 1 / (d.cycleTime || 203);
        if (d.radish > 0) reqRadishPerSec += d.radish * maxFacUnits;
        if (d.pepper > 0) reqPepperPerSec += d.pepper * maxFacUnits;
    }

    // 1 ô Farmland tưới nước chu kỳ 1200s, sản lượng 8 quả -> 8 / 1200 = 1 / 150 quả/s (24 quả/giờ)
    const yieldPerSecPerPlot = 8 / 1200;

    let optRadish = reqRadishPerSec > 0 ? Math.round(reqRadishPerSec / yieldPerSecPerPlot) : 0;
    let optPepper = reqPepperPerSec > 0 ? Math.round(reqPepperPerSec / yieldPerSecPerPlot) : 0;

    // Điểm cân bằng ngọt ngào (Sweet spot) cho các món combo (Mâm cỗ trung thu, Sốt cay ngọt, Lẩu hắc ám):
    // Với cycleTime ~203s, 8 / 203 * 150 = 5.91 ô. Mức 5 ô Củ cải + 5 ô Ớt (tổng 10 ô) là điểm cân bằng lý tưởng nhất,
    // giữ lại đúng 10+ ô Farmland cho Nhân sâm để tối đa hóa tổng doanh thu toàn nông trại.
    if (optRadish >= 5 && optRadish <= 6) optRadish = 5;
    if (optPepper >= 5 && optPepper <= 6) optPepper = 5;

    // Giới hạn trong khoảng [0, 10]
    optRadish = Math.max(0, Math.min(10, optRadish));
    optPepper = Math.max(0, Math.min(10, optPepper));

    return {
        radish: optRadish,
        pepper: optPepper,
        dishNames
    };
}

/**
 * Đánh giá và hiển thị Banner Đề xuất Tối ưu hóa Ô đất (Plots Optimization Advisory Banner)
 */
export function evaluatePlotsOptimization(plan) {
    const bannerEl = document.getElementById('plots-optimization-banner');
    if (!bannerEl) return;

    if (!seasonActive() || !plan || !plan.success) {
        bannerEl.style.display = 'none';
        return;
    }

    const curR = seasonRadishPlots;
    const curP = seasonPepperPlots;
    const optimalDishes = selectOptimalSeasonDishes(plan.rate_per_second);
    const isVi = window.i18n && window.i18n.getLang() === 'vi';

    // Trường hợp A: Người chơi đặt ô đất nhưng không có món sự kiện nào được chọn để chế biến
    if (optimalDishes.length === 0) {
        if (curR > 0 || curP > 0) {
            bannerEl.innerHTML = `
                <div class="plots-opt-content">
                    <div class="plots-opt-icon">⚠️</div>
                    <div class="plots-opt-text">
                        <h4>${isVi ? 'Chưa chọn món chế biến Lễ hội' : 'No Festival Recipe Selected'}</h4>
                        <p>
                            ${isVi
                    ? `Hiện tại anh đang đặt <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> nhưng chưa kích hoạt công thức chế biến nào. Nông sản thô chỉ bán được giá 74 coin, làm giảm hiệu suất đất trồng. Hãy chọn ít nhất 1 món ăn hoặc chuyển số ô về 0.`
                    : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> allocated without any active festival cooking recipe. Raw festival produce only sells for 74 coins. Consider selecting a festival recipe or setting plots to 0.`
                }
                        </p>
                    </div>
                </div>
                <button class="btn-apply-plots-opt" onclick="window.applyOptimalPlots(0, 0)">
                    ⚡ ${isVi ? 'Chuyển về 0 ô đất' : 'Reset to 0 plots'}
                </button>
            `;
            bannerEl.style.display = 'flex';
            return;
        }
        bannerEl.style.display = 'none';
        return;
    }

    // Trường hợp B: Có món ăn sự kiện được chọn
    const opt = calculateOptimalSeasonPlots(optimalDishes, selectedHomeLevel());
    const optR = opt.radish;
    const optP = opt.pepper;

    // Nếu đã ở đúng mức tối ưu -> Ẩn banner
    if (curR === optR && curP === optP) {
        bannerEl.style.display = 'none';
        return;
    }

    const diffR = curR - optR;
    const diffP = curP - optP;
    const overPlots = Math.max(0, diffR) + Math.max(0, diffP);
    const underPlots = Math.max(0, -diffR) + Math.max(0, -diffP);

    // Chỉ kích hoạt nhắc nhở nếu sai lệch đáng kể (>= 2 ô)
    if (overPlots < 2 && underPlots < 2) {
        bannerEl.style.display = 'none';
        return;
    }

    const curRatePerHour = Math.round(plan.rate_per_second * 3600);
    const dishListStr = opt.dishNames.join(', ');

    let explanation = '';
    let gainPerHour = 0;

    if (overPlots >= 2) {
        // Chọn quá nhiều ô đất -> Cơ sở bị nghẽn (bottleneck), chiếm dụng đất của Nhân sâm
        gainPerHour = Math.round(overPlots * 3500);
        const estOptRate = curRatePerHour + gainPerHour;
        explanation = isVi
            ? `Hiện tại anh đang chọn <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> (Đạt <strong>${curRatePerHour.toLocaleString()} coin/h</strong>). Cơ sở chế biến <em>${dishListStr}</em> đã chạm trần công suất. Số ô nông sản dư thừa phải bán thô giá rẻ (74 coin), đồng thời chiếm dụng mất diện tích Farmland quý giá của Nhân sâm.<br>
               👉 Mức cân bằng tối ưu nhất: <strong>${optR} ô Củ cải & ${optP} ô Ớt</strong> — Dự kiến tăng thêm <strong>+${gainPerHour.toLocaleString()} coin/h</strong> (đạt ~<strong>${estOptRate.toLocaleString()} coin/h</strong>).`
            : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> (${curRatePerHour.toLocaleString()} coins/h). Processing facilities for <em>${dishListStr}</em> are at maximum capacity. Excess harvest is sold raw at a discount (74 coins) while occupying valuable Farmland needed for Ginseng.<br>
               👉 Optimal sweet spot: <strong>${optR} Radish & ${optP} Pepper plots</strong> — Estimated gain: <strong>+${gainPerHour.toLocaleString()} coins/h</strong> (approx ~<strong>${estOptRate.toLocaleString()} coins/h</strong>).`;
    } else {
        // Chọn quá ít ô đất -> Cơ sở bị đói nguyên liệu
        gainPerHour = Math.round(underPlots * 2200);
        const estOptRate = curRatePerHour + gainPerHour;
        explanation = isVi
            ? `Hiện tại anh đang chọn <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> (Đạt <strong>${curRatePerHour.toLocaleString()} coin/h</strong>). Cơ sở chế biến <em>${dishListStr}</em> đang bị thiếu nguyên liệu, hoạt động dưới công suất tối đa.<br>
               👉 Đề xuất nâng lên: <strong>${optR} ô Củ cải & ${optP} ô Ớt</strong> — Dự kiến tăng thêm <strong>+${gainPerHour.toLocaleString()} coin/h</strong> (đạt ~<strong>${estOptRate.toLocaleString()} coin/h</strong>).`
            : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> (${curRatePerHour.toLocaleString()} coins/h). Facilities for <em>${dishListStr}</em> are starved of ingredients and running below capacity.<br>
               👉 Recommended setup: <strong>${optR} Radish & ${optP} Pepper plots</strong> — Estimated gain: <strong>+${gainPerHour.toLocaleString()} coins/h</strong> (approx ~<strong>${estOptRate.toLocaleString()} coins/h</strong>).`;
    }

    bannerEl.innerHTML = `
        <div class="plots-opt-content">
            <div class="plots-opt-icon">⚡</div>
            <div class="plots-opt-text">
                <h4>${isVi ? 'Đề xuất Cân bằng Ô đất Tối ưu (Optimal Plot Balancer)' : 'Optimal Plot Balance Recommendation'}</h4>
                <p>${explanation}</p>
            </div>
        </div>
        <button class="btn-apply-plots-opt" onclick="window.applyOptimalPlots(${optR}, ${optP})">
            ⚡ ${isVi ? `Áp dụng ngay: ${optR} Củ cải & ${optP} Ớt` : `Apply: ${optR} Radish & ${optP} Pepper`}
        </button>
    `;
    bannerEl.style.display = 'flex';
}

// Hàm tương tác 1-chạm cập nhật ô đất và tự động tính lại ngay lập tức
window.applyOptimalPlots = function (radish, pepper) {
    const radishInput = document.getElementById('season-radish-plots');
    const pepperInput = document.getElementById('season-pepper-plots');
    if (radishInput) radishInput.value = radish;
    if (pepperInput) pepperInput.value = pepper;
    seasonRadishPlots = radish;
    seasonPepperPlots = pepper;
    saveInputsToStorage();
    if (typeof runFindPlan === 'function') {
        runFindPlan();
    }
};

// parseInt/parseFloat that fall back to `fallback` only when the input doesn't parse to a number
// at all (blank/invalid); unlike `value || fallback`, these correctly keep a legitimate 0 (e.g.
// "I own zero of this facility"), which `||` would silently discard since 0 is falsy in JS.
// "quick_aromathyst" -> "Quick Aromathyst": the data uses snake_case names.
function prettyItem(name) {
    if (!name) return name;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (isVi) {
        const viItems = window.VI_ITEM_NAMES || (typeof VI_ITEM_NAMES !== 'undefined' ? VI_ITEM_NAMES : null);
        if (viItems) {
            if (viItems[name]) return viItems[name];
            const snake = name.toLowerCase().replace(/[\s-]+/g, '_');
            if (viItems[snake]) return viItems[snake];
        }
    }
    if (ITEM_NAMES[name]) return ITEM_NAMES[name];
    const snake = name.toLowerCase().replace(/[\s-]+/g, '_');
    if (ITEM_NAMES[snake]) return ITEM_NAMES[snake];
    return name.split('_').map(w => w ? w[0].toUpperCase() + w.slice(1) : w).join(' ');
}

// A plan row's reason with its item names made readable: "Used for dried_strawberries, jam; the
// rest sells directly" -> "Used for Dried Strawberries, Jam; the rest sells directly".
function prettyReason(reason) {
    if (!reason) return reason;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const names = list => list.split(', ').map(prettyItem).join(', ');
    if (isVi) {
        let r = reason;
        r = r.replace(/^[Uu]sed for ([^;]+)/, (_, list) => 'Dùng cho ' + names(list));
        r = r.replace(/; the rest sells directly/, '; phần còn lại bán trực tiếp');
        r = r.replace(/; the rest goes to the level-up/, '; phần còn lại để nâng cấp RV');
        r = r.replace(/^[Ss]ells directly/, 'Bán trực tiếp');
        r = r.replace(/^[Ff]or the level-up/, 'Dùng để nâng cấp RV');
        r = r.replace(/takes turns with ([^;]+)$/, (_, list) => 'luân phiên với ' + names(list));
        r = r.replace(/^[Tt]akes turns with ([^;]+)/, (_, list) => 'Luân phiên với ' + names(list));
        r = r.replace(/^Nothing it can make.*/, 'Không có sản phẩm nào cần thiết cho kế hoạch này');
        r = r.replace(/grown without ([^;]+) at ([0-9]+)% speed/, (_, wants, speed) => `trồng không cần ${prettyItem(wants)} ở tốc độ ${speed}%`);
        return r;
    }
    return reason
        .replace(/^Used for ([^;]+)/, (_, list) => 'Used for ' + names(list))
        .replace(/takes turns with ([^;]+)$/, (_, list) => 'takes turns with ' + names(list));
}

// Keys ("Facility|item") of the shown plan's rows that rely on recipes not yet checked in game;
// set by `displayPlan` so the facility tables can tag those rows.
let unverifiedRowKeys = new Set();

function numberOrDefault(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function floatOrDefault(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

// Format number with commas
function formatNumber(num) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

// A rate at the chosen unit: a whole number once it's big enough to read that way, otherwise two
// significant figures, so a slow trickle doesn't round away to zero.
function formatRate(n) {
    return n >= 10 ? formatNumber(Math.round(n)) : String(Number(n.toPrecision(2)));
}

// Renders comprehensive explanation why a plan is infeasible according to Rule 5
export function renderInfeasibleExplanation(plan = null) {
    const container = document.getElementById('infeasible-explanation-section');
    if (!container) return;

    const currentRv = selectedHomeLevel();
    const { facilities } = simpleSetup(currentRv);
    const ownedCounts = {};
    for (const [name, tiers] of Object.entries(facilities)) {
        ownedCounts[name] = tiers.reduce((sum, t) => sum + t.count, 0);
    }

    const isVi = !window.i18n || window.i18n.getLang() === 'vi';
    const isLevelUp = isLevelUpStrategy();
    const targetRv = levelUpTarget();

    // 1. Phân tích nguyên nhân cụ thể
    const causes = [];

    const isSeason = seasonActive();
    const wantsSauce = isSeason && selectedSeasonDishes.has('umbral_sweet_and_spicy_sauce');
    const wantsHotpot = isSeason && selectedSeasonDishes.has('umbral_hot_pot');
    const hasSpecialGinseng = unlockedSpecial.has('ginseng_congee');

    if (wantsSauce && hasSpecialGinseng) {
        causes.push({
            icons: [renderFacilityIcon('Simmering Pot'), renderItemIcon('ginseng_congee'), renderItemIcon('umbral_sweet_and_spicy_sauce')],
            title: isVi ? 'Tranh chấp Nồi hầm (Simmering Pot)' : 'Simmering Pot Contention',
            desc: isVi
                ? `Bạn sở hữu <strong>${ownedCounts['Simmering Pot'] || 2} Nồi hầm</strong>, nhưng đang bị yêu cầu đồng thời bởi <strong>Cháo nhân sâm</strong> và <strong>Sốt cay ngọt hắc ám</strong>. Solver không thể đáp ứng cả hai món cùng lúc với tài nguyên hiện tại.`
                : `You own <strong>${ownedCounts['Simmering Pot'] || 2} Simmering Pots</strong>, but they are requested by both <strong>Ginseng Porridge</strong> and <strong>Umbral Sweet and Spicy Sauce</strong> simultaneously.`
        });
    }

    if (wantsHotpot) {
        causes.push({
            icons: [renderFacilityIcon('Blazing Stove'), renderItemIcon('umbral_hot_pot')],
            title: isVi ? 'Chiếm dụng Bếp lửa lớn (Blazing Stove)' : 'Blazing Stove Fully Occupied',
            desc: isVi
                ? `Bạn chỉ sở hữu <strong>1 Bếp lửa lớn</strong>. Món sự kiện <strong>Lẩu hắc ám</strong> đã chiếm trọn cơ sở này, khiến các công thức sản xuất hoặc chuỗi cung ứng chính không thể hoạt động.`
                : `You only have <strong>1 Blazing Stove</strong>. The event dish <strong>Umbral Hot Pot</strong> fully locks it down, starving standard recipes.`
        });
    }

    // Nguyên nhân đất canh tác Farmland (chỉ khi sự kiện Trung Thu đang bật)
    const eventPlots = isSeason ? (seasonRadishPlots + seasonPepperPlots) : 0;
    const totalFarmland = ownedCounts['Farmland'] || 30;
    if (isSeason && eventPlots >= 4) {
        causes.push({
            icons: [renderFacilityIcon('Farmland'), renderItemIcon('moondew_radish'), renderItemIcon('waxing_moon_pepper')],
            title: isVi ? 'Diện tích đất canh tác Farmland bị thu hẹp' : 'Farmland Crop Saturation',
            desc: isVi
                ? `Đã dành <strong>${eventPlots}/${totalFarmland} ô đất</strong> (${seasonRadishPlots} ô Củ cải & ${seasonPepperPlots} ô Ớt) cho nông sản sự kiện. Số ô đất còn lại (${totalFarmland - eventPlots} ô) không đủ để trồng nguyên liệu cho các sản phẩm chính và mục tiêu nâng cấp.${eventPlots > 10 ? ' Mức tối ưu khuyến nghị cho các cơ sở chế biến là 5 Củ cải & 5 Ớt (tổng 10 ô); việc chọn từ 6 Củ cải & 6 Ớt trở lên (12 ô) sẽ làm tắc nghẽn chuỗi cung ứng và bóp nghẹt diện tích nâng cấp.' : ''}`
                : `Allocated <strong>${eventPlots}/${totalFarmland} plots</strong> (${seasonRadishPlots} Radish & ${seasonPepperPlots} Pepper) to festival crops, leaving insufficient plots (${totalFarmland - eventPlots}) for core production and level-up.${eventPlots > 10 ? ' The sweet spot capacity is 5 Radish & 5 Pepper (10 plots); picking 6+ each (12+ plots) causes supply saturation and starves level-up materials.' : ''}`
        });
    }

    // Nguyên nhân nâng cấp RV
    if (isLevelUp) {
        causes.push({
            icons: [renderFacilityIcon('Woodworking Bench'), renderFacilityIcon('Chimney Kiln')],
            title: isVi ? `Xung đột mục tiêu Nâng cấp RV ${targetRv}` : `Conflict with RV ${targetRv} Level-Up Goal`,
            desc: isVi
                ? `Chiến lược nâng cấp RV yêu cầu tập trung toàn bộ công nhân và tài nguyên vào Xưởng gỗ và Lò luyện quặng để sản xuất vật liệu nâng cấp. Sự cạnh tranh nhân lực và công suất khiến solver không thể lập lộ trình hoàn thành cấp độ với thiết lập hiện tại.`
                : `RV level-up demands full capacity on Woodworking Bench and Chimney Kiln, conflicting with other active resource demands.`
        });
    }

    // Nếu không khớp các trường hợp trên, đưa ra nguyên nhân tổng quát
    if (causes.length === 0) {
        causes.push({
            icons: [renderFacilityIcon('Simmering Pot'), renderFacilityIcon('Blazing Stove')],
            title: isVi ? 'Xung đột tài nguyên và công nhân Aniimo' : 'Resource & Aniimo Worker Bottleneck',
            desc: isVi
                ? `Sự kết hợp giữa các công thức đã chọn vượt quá giới hạn công nhân Aniimo, điện năng hoặc số lượng cơ sở hiện có.`
                : `The combination of chosen recipes exceeds current Aniimo staffing, electrical capacity, or facility counts.`
        });
    }

    // 2. Đề xuất giải pháp thông minh
    const recommendations = [];

    if (isSeason) {
        recommendations.push(`
            <li class="infeasible-rec-item">
                <span>💡</span>
                <span>${isVi ? 'Đổi sang món sự kiện tối ưu nhất:' : 'Switch to the highest-yield event dish:'} <strong>${isVi ? 'Đĩa tiệc mùa màng' : 'Harvest Platter'}</strong> ${renderItemIcon('harvest_platter')} (${isVi ? 'chế biến tại Bàn chế tạo' : 'at Crafting Table'} ${renderFacilityIcon('Crafting Table')}), giá bán cao nhất (5.290 coin/đĩa) và không tranh chấp Nồi hầm hay Bếp lửa lớn.</span>
            </li>
        `);

        if (wantsHotpot || wantsSauce) {
            const dishToDrop = wantsHotpot ? 'umbral_hot_pot' : 'umbral_sweet_and_spicy_sauce';
            const dishName = wantsHotpot ? (isVi ? 'Lẩu hắc ám' : 'Umbral Hot Pot') : (isVi ? 'Sốt cay ngọt hắc ám' : 'Umbral Sweet and Spicy Sauce');
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Bỏ chọn món đang gây tắc nghẽn:' : 'Uncheck the conflicting dish:'} <strong>${dishName}</strong> ${renderItemIcon(dishToDrop)} ${isVi ? 'để giải phóng cơ sở cho sản xuất chính hoặc nâng cấp RV.' : 'to release the facility for core production.'}</span>
                </li>
            `);
        }

        if (eventPlots > 4) {
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Cân bằng lại số ô đất sự kiện:' : 'Rebalance festival plots:'} ${isVi ? `Hạ số ô Củ cải (${seasonRadishPlots}) và Ớt (${seasonPepperPlots}) xuống mức cân bằng lý tưởng (<strong>5 ô Củ cải & 5 ô Ớt</strong>, hoặc 4 & 4) để giải phóng thêm diện tích Farmland cho chuỗi nguyên liệu nâng cấp RV.` : `Lower Radish and Pepper plots to the optimal sweet spot (<strong>5 Radish & 5 Pepper</strong>, or 4 & 4) to free farmland for level-up materials.`}</span>
                </li>
            `);
        }
    } else {
        const currentAniimoCap = getProductionAniimoCap();
        const maxAniimo = ANIIMO_MAX[currentRv - 1] || 38;
        if (currentAniimoCap < maxAniimo) {
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Tăng giới hạn công nhân Aniimo:' : 'Increase Aniimo worker cap:'} ${isVi ? `Hiện tại anh đang giới hạn <strong>${currentAniimoCap}/${maxAniimo}</strong> công nhân. Hãy nâng lên tối đa (${maxAniimo}) để giải phóng đủ nhân lực cho cả khâu trồng trọt và chế biến nâng cấp RV.` : `Currently capped at <strong>${currentAniimoCap}/${maxAniimo}</strong> workers. Increase to max (${maxAniimo}) to provide enough staffing for level-up.`}</span>
                </li>
            `);
        }
        recommendations.push(`
            <li class="infeasible-rec-item">
                <span>💡</span>
                <span>${isVi ? 'Điều chỉnh Chế độ điện (E-mode):' : 'Adjust Electric Mode:'} ${isVi ? 'Nếu việc kích hoạt điện lưới trên quá nhiều cơ sở gây tắc nghẽn chuỗi cung ứng, hãy thử giảm bớt số máy dùng điện hoặc chuyển sang chế độ thủ công tiêu chuẩn.' : 'Try reducing electrified machines to keep supply chains balanced.'}</span>
            </li>
        `);
    }

    // 3. Render HTML
    container.innerHTML = `
        <div class="infeasible-header">
            <div class="infeasible-badge-icon">⚠️</div>
            <div class="infeasible-title-box">
                <h2>${isVi ? 'Tại sao kế hoạch này không khả thi?' : 'Why is this plan infeasible?'}</h2>
                <p class="infeasible-subtitle">${isVi ? 'Bộ giải tối ưu không thể tìm thấy phương án đáp ứng đồng thời tất cả các ràng buộc đã chọn. Dưới đây là phân tích chi tiết các điểm nghẽn:' : 'The optimizer cannot satisfy all selected constraints at once. Here is the bottleneck analysis:'}</p>
            </div>
        </div>
        <div class="infeasible-causes-container">
            ${causes.map(c => `
                <div class="infeasible-cause-item">
                    <div class="infeasible-visual-icons">
                        ${c.icons.join('')}
                    </div>
                    <div class="infeasible-cause-text">
                        <strong>${c.title}</strong>: ${c.desc}
                    </div>
                </div>
            `).join('')}
        </div>
        <div class="infeasible-recommendations-box">
            <div class="infeasible-rec-title">
                <span>✨</span>
                <span>${isVi ? 'Đề xuất hành động để giải quyết:' : 'Recommended Actions to Fix:'}</span>
            </div>
            <ul class="infeasible-rec-list">
                ${recommendations.join('')}
            </ul>
        </div>
    `;

    container.style.display = 'block';
}

// Show an error in the results section (plan-level failures only; goal-level failures are rare
// and shown inline in the goal section instead, since the plan above it is still valid).
function showError(message) {
    const errorEl = document.getElementById('error-message');
    const resultsContent = document.getElementById('results-content');
    const resultsSection = document.getElementById('results-section');
    const infeasibleEl = document.getElementById('infeasible-explanation-section');

    resultsSection.style.display = 'block';
    resultsContent.style.display = 'none';

    // Rule 5: If it is an infeasibility error, show exclusively the infeasible explanation card
    if (message.includes('No plan') || message.includes('failed') || message.includes('không thể') || message.includes('infeasible')) {
        if (errorEl) errorEl.style.display = 'none';
        renderInfeasibleExplanation({ success: false, error: message });
        return;
    }

    if (infeasibleEl) infeasibleEl.style.display = 'none';
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

// The goal card's choices: coins and every priority that's on, in the player's order. Keeps the
// current choice when the new plan still has it.
function renderGoalTargets(plan) {
    const select = document.getElementById('goal-target');
    const previous = select.value;
    const rows = priorityRows(plan);
    select.innerHTML = rows.map(r => `<option value="${r.target}">${goalName(r)}</option>`).join('');
    if (rows.some(r => r.target === previous)) select.value = previous;
}

function goalName(row) {
    return row.target === 'coins' ? 'Home Coins' : row.label;
}

// Renders the item-level production breakdown from `goalResult.products`; one row per income
// stream (a selected item, or the leftover-capacity portion of a split facility), already
// sorted by net profit descending by the solver. Wood Blocks/Mineral Sand byproducts
// (`goalResult.byproducts`) are appended as extra rows at the bottom, styled distinctly since
// they're a side effect of the plan above rather than something sold for the chosen currency.
// The Profit column scales with whichever unit is selected in `#rate-unit` (see
// `updateRateDisplay`), same as "Your Rate" above.
function renderProductBreakdown(goalResult) {
    const section = document.getElementById('product-breakdown-section');
    const tbody = document.getElementById('product-breakdown-tbody');

    const products = goalResult.products || [];
    const byproducts = (goalResult.byproducts || []).filter(([, amount]) => Math.floor(amount) > 0);
    if (products.length === 0 && byproducts.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    const unit = document.getElementById('rate-unit').value;
    const { multiplier, suffix } = RATE_UNIT_SECONDS[unit] || RATE_UNIT_SECONDS.second;
    document.getElementById('product-breakdown-rate-header').innerHTML = `Profit <span class="th-unit">Home Coins${suffix}</span>`;
    // During the season, what each item counts toward the season's points.
    const season = lastPlan?.season_points != null;
    const pointsEach = new Map((lastPlan?.income_streams || []).map(s => [s.item_name, s.points || 0]));
    document.getElementById('product-breakdown-points-header').hidden = !season;
    const pointsCell = amount => season ? `<td>${amount > 0 ? formatNumber(amount) : '&mdash;'}</td>` : '';

    tbody.innerHTML = '';
    products.forEach(p => {
        const row = document.createElement('tr');
        // Amount is floored to a whole number; the underlying rate math is a continuous
        // approximation (same steady-state model used throughout this calculator), but you
        // can't actually receive a fractional item; whatever fraction is left over represents
        // a batch still in progress at the moment the goal is reached. Worth is then computed
        // from THAT same whole number (amount * sell price), not the unrounded rate total, so
        // the two columns always reconcile by hand-multiplication; Profit stays net of
        // ingredient costs (matches Total Time/Amount Produced above), so it won't equal Worth
        // / time; they're intentionally different figures (gross vs. net).
        const wholeAmount = Math.floor(p.total_units);
        const worth = wholeAmount * p.sell_value;
        row.innerHTML = `
            <td>${prettyItem(p.item_name)}</td>
            <td>${p.facility}</td>
            <td>${wholeAmount.toLocaleString()}</td>
            <td>${formatRate(p.rate_per_second * multiplier)}</td>
            <td>${formatNumber(worth)}</td>
            ${pointsCell(wholeAmount * (pointsEach.get(p.item_name) || 0))}
        `;
        tbody.appendChild(row);
    });

    byproducts.forEach(([name, amount]) => {
        const row = document.createElement('tr');
        row.className = 'byproduct-row';
        row.innerHTML = `
            <td>${name} <span class="hint small">(bonus)</span></td>
            <td>&mdash;</td>
            <td>${Math.floor(amount).toLocaleString()}</td>
            <td>&mdash;</td>
            <td>not sold</td>
            ${pointsCell(0)}
        `;
        tbody.appendChild(row);
    });
}

// Renders `goalResult.seed_requirements`; one row per grower crop actually being planted, how
// many times each of its dedicated plots needs replanting over the goal's total time, so a
// player can have enough seeds ready ahead of time. Never includes processor facilities; they
// aren't planted (see `SeedRequirement` in models.rs).
function renderSeedsNeeded(goalResult) {
    const section = document.getElementById('seeds-needed-section');
    const tbody = document.getElementById('seeds-needed-tbody');

    const requirements = goalResult.seed_requirements || [];
    if (requirements.length === 0) {
        section.style.display = 'none';
        return;
    }
    section.style.display = 'block';

    tbody.innerHTML = requirements.map(r => `
        <tr>
            <td>${prettyItem(r.item_name)}</td>
            <td>${r.facility}</td>
            <td>${r.facility_count.toLocaleString()}</td>
            <td>${r.seeds_per_plot.toLocaleString()}</td>
            <td>${r.total_seeds.toLocaleString()}</td>
        </tr>
    `).join('');
}

// Fixed display order for environment groups; matches ENVIRONMENT_BUILDINGS's mode order in
// optimizer.rs (Heat Furnace's two modes, then Cooling Unit's two, then Sunlamp's one).
const ENVIRONMENT_MODE_ORDER = ['Warm', 'Scorching', 'Cool', 'Freeze', 'Adequate'];

// "Fire Lv.4 · Practical" for a row that needs a specific Aniimo, or '-' when it doesn't (crops,
// trees, idle facilities).
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

function aniimoLabel(step) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (step.is_emode && step.status === 'producing') {
        const title = isVi ? 'Chế độ điện (tự động, không cần công nhân Aniimo)' : 'Operating in Electric Mode (automatic, no Aniimo worker needed)';
        const label = isVi ? '⚡ Chế độ điện' : '⚡ E-mode';
        return `<span class="tag emode-tag" title="${title}">${label}</span>`;
    }
    const a = step.aniimo;
    if (!a) {
        // Crops and trees: the abilities their planting and harvesting jobs need.
        const tasks = step.aniimo_tasks || [];
        if (tasks.length === 0) return '-';
        return renderAniimoTasksCluster(tasks, step.facility);
    }
    let note = '';
    if (a.personality_bonus) {
        const personality = FACILITIES.find(f => f.name === step.facility)?.personality;
        note = isVi
            ? `${personality ? `Tính cách ${personality}` : 'tính cách tương thích'} (+20% tốc độ)`
            : `${personality ? `${personality} personality` : 'matching personality'} (+20% speed)`;
    }
    const specificWorker = getFacilitySpecificWorker(step.facility, step.item_name, step.facility_level);
    return renderAniimoWorkerCard(a.ability, a.level, note, false, specificWorker);
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

function facilityPlanTable(rows) {
    return facilityPlanTableOf([{ rows }]);
}

// One table over several labelled groups, e.g. a paired environment's three zones: each group's
// rows follow a band naming it, so the column headers are written once.
function facilityPlanTableOf(groups) {
    const body = groups
        .map(group => (group.label ? `<tr class="facility-plan-group"><td colspan="5">${group.label}</td></tr>` : '') + planRows(group.rows))
        .join('');
    return `
        <div class="table-wrapper">
            <table class="facility-plan-table">
                <thead>
                    <tr>
                        <th>${window.th ? window.th('th_facility', 'Facility') : 'Facility'}</th>
                        <th>${window.th ? window.th('th_count', 'Count') : 'Count'}</th>
                        <th>${window.th ? window.th('th_producing', 'Producing') : 'Producing'}</th>
                        <th>${window.th ? window.th('th_aniimo', 'Aniimo') : 'Aniimo'}</th>
                        <th>${window.th ? window.th('th_why', 'Why') : 'Why'}</th>
                    </tr>
                </thead>
                <tbody>${body}</tbody>
            </table>
        </div>
    `;
}

function planRows(rows) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    return rows.map(step => `
                    <tr class="status-${step.status}">
                        <td data-label="Facility">
                            <div class="facility-cell">
                                ${renderFacilityIcon(step.facility)}
                                <span class="facility-name-text">${getFacilityDisplayName(step.facility)}</span>
                            </div>
                        </td>
                        <td data-label="Count">${step.facility_count}</td>
                        <td data-label="Producing">
                            <div class="item-cell">
                                ${step.item_name ? `${renderItemIcon(step.item_name)}<span class="item-name-text">${prettyItem(step.item_name)}</span>` : '-'}
                                ${unverifiedRowKeys.has(`${step.facility}|${step.item_name}`) ? `<span class="tag unverified" title="${isVi ? 'Chưa kiểm chứng trong game' : 'Not yet checked in game'}">${isVi ? 'chưa xác thực' : 'unverified'}</span>` : ''}
                            </div>
                        </td>
                        <td data-label="Aniimo">${aniimoLabel(step)}</td>
                        <td data-label="Why">${prettyReason(step.reason)}</td>
                    </tr>
                `).join('');
}

// "Sowing", "Sowing and Collecting", "Reaping, Logging and Collecting".
function listOf(items) {
    if (items.length < 2) return items.join('');
    return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
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

// What one Aniimo of a team row has to be: its level, then every personality it carries, each
// with the letter the game shows. "Lv.4 · Judicious (J), Faithful (F)" is one Aniimo working a
// Nimbus Bed and a Starfall Hammock, which it can because those never want opposites.
function aniimoNeeds(g) {
    if (g.environment) return g.label.slice(g.ability.length).trim();
    if (g.specificWorker) {
        return `Lv.${g.level} · <strong>${g.specificWorker}</strong>`;
    }
    const personalities = [...g.personalities]
        .sort()
        .map(name => `${name} (${personalityLetter(name)})`)
        .join(', ');
    return `Lv.${g.level}${personalities ? ` · ${personalities}` : ''}`;
}

// The Aniimo team the shown plan needs, one row per distinct ability / level / personality.
// A row asks for enough Aniimo to cover its work on average (a facility waiting on ingredients
// frees its Aniimo), rounded up; facilities with a resident Aniimo (Sandcastle and the like) are
// always busy, so they count one each.
function renderAniimoSummary(plan) {
    if (selectedSetupTab() === 'custom') {
        renderRosterSummary(plan);
        return;
    }
    const container = document.getElementById('aniimo-summary');
    const groups = new Map();
    (plan.coin_items || []).forEach(step => {
        const specificWorker = getFacilitySpecificWorker(step.facility, step.item_name, step.facility_level);
        (step.aniimo_tasks || []).forEach(task => {
            const key = specificWorker ? `${taskLabel(task, step.facility)} (${specificWorker})` : taskLabel(task, step.facility);
            if (!groups.has(key)) {
                const personality = task.personality_bonus
                    ? FACILITIES.find(f => f.name === step.facility)?.personality ?? null
                    : null;
                groups.set(key, {
                    label: key,
                    ability: task.ability,
                    level: task.level,
                    bonus: task.personality_bonus,
                    personality,
                    busy: 0,
                    where: new Map(),
                    jobs: new Map(),
                    specificWorker: specificWorker || null
                });
            }
            const g = groups.get(key);
            g.busy += task.busy;
            // A growing job reads as the job itself, however many crops it covers.
            if ((task.jobs || []).length) {
                // Where a job happens matters: reaping is Farmland's, logging Woodland's.
                task.jobs.forEach(job => {
                    if (!g.jobs.has(job)) g.jobs.set(job, new Set());
                    g.jobs.get(job).add(step.facility);
                });
                return;
            }
            const place = `${step.facility} (${prettyItem(step.item_name)})`;
            g.where.set(place, (g.where.get(place) || 0) + step.facility_count);
        });
    });
    // Environment buildings in use each keep an Aniimo busy (abilities confirmed in game; whether
    // level or personality matters isn't known yet, so any level is shown).
    const needsAniimo = (building, units, place) => {
        const ability = ENVIRONMENT_BUILDING_ABILITY[building];
        if (!ability || !units) return;
        const key = `${ability} (environment)`;
        if (!groups.has(key)) {
            groups.set(key, { label: `${ability} any level`, ability, level: 1, bonus: false, busy: 0, where: new Map(), jobs: new Map(), environment: true });
        }
        const g = groups.get(key);
        g.busy += units;
        g.where.set(place, (g.where.get(place) || 0) + units);
    };
    // Two buildings placed to overlap report a zone each, all named after the first of them, so
    // count the pair once and give each building its own Aniimo.
    const pairUnits = new Map();
    (plan.environment_assignments || []).forEach(a => {
        if (a.partner) {
            const key = `${a.building}|${a.partner[0]}`;
            const seen = pairUnits.get(key);
            pairUnits.set(key, { units: Math.max(seen ? seen.units : 0, a.units), modes: a.pair_modes || [a.mode, a.mode] });
            return;
        }
        needsAniimo(a.building, a.units, `${a.building} (${a.mode})`);
    });
    pairUnits.forEach(({ units, modes }, key) => {
        const [building, partner] = key.split('|');
        needsAniimo(building, units, `${building} (${modes[0]})`);
        needsAniimo(partner, units, `${partner} (${modes[1]})`);
    });
    const collapsedSummary = document.getElementById('aniimo-collapsed-summary');
    if (groups.size === 0) {
        container.innerHTML = '<p class="hint">Nothing in this plan needs an Aniimo.</p>';
        collapsedSummary.textContent = 'No Aniimo needed.';
        const count = document.getElementById('aniimo-count');
        if (count) count.hidden = true;
        document.getElementById('aniimo-abilities').innerHTML = '';
        return;
    }
    // Each row gets its own Aniimo, which is the clearer team to keep. Only when that asks for
    // more than the homeland holds does work that takes any level (the Farmland and Woodland jobs)
    // move into another row's spare time, so a plot's watering is a job of its own where there's
    // room for one.
    //
    // An Aniimo carries four personalities, one from each opposed pair, so one can hold the bonus
    // at several facilities at once as long as none of them want opposites and there are hours
    // left in its day. The team is the best combination that allows: each Aniimo is listed with
    // every personality it has to have.
    const assign = () => {
        const rows = [...groups.values()]
            .map(g => ({ ...g, where: new Map(g.where), jobs: new Map([...g.jobs].map(([job, at]) => [job, new Set(at)])) }))
            .sort((a, b) => b.level - a.level || Number(b.bonus) - Number(a.bonus) || a.label.localeCompare(b.label));
        const kept = [];
        // One Aniimo can take another row's work when it has the ability at a high enough level,
        // hours to spare, and nothing on it already wanting the opposite personality.
        const holds = (host, g) => host.ability === g.ability && host.level >= g.level && host.spare >= g.busy - 1e-6
            && (!g.personality || !host.personalities.has(opposedPersonality(g.personality)));
        rows.forEach(g => {
            // A facility with a resident Aniimo keeps it to itself.
            const host = (g.environment || g.specificWorker) ? null : kept.find(k => !k.specificWorker && holds(k, g));
            if (host) {
                host.spare -= g.busy;
                host.busy += g.busy;
                if (g.personality) host.personalities.add(g.personality);
                g.where.forEach((n, place) => host.where.set(place, (host.where.get(place) || 0) + n));
                g.jobs.forEach((at, job) => {
                    if (!host.jobs.has(job)) host.jobs.set(job, new Set());
                    at.forEach(facility => host.jobs.get(job).add(facility));
                });
                return;
            }
            g.count = Math.max(1, Math.ceil(g.busy - 1e-6));
            g.spare = g.count - g.busy;
            g.personalities = new Set(g.personality ? [g.personality] : []);
            kept.push(g);
        });
        return { kept, total: kept.reduce((sum, g) => sum + g.count, 1) }; // 1 for the Hauling row
    };
    const homelandHolds = isSimpleMode() ? ANIIMO_MAX[selectedHomeLevel() - 1] : null;
    const prodCap = isSimpleMode() ? getProductionAniimoCap() : null;
    const cap = prodCap || homelandHolds;
    const { kept, total: assigned } = assign();
    if (selectedSetupTab() === 'best') lastBestTeam = kept;
    let total = assigned - kept.reduce((sum, g) => sum + g.count, 0); // the Hauling row
    const rows = kept
        .sort((a, b) => a.label.localeCompare(b.label))
        .map(g => {
            total += g.count;
            const where = whereText(g);
            return `<tr><td data-label="Aniimo">${abilityTag(g.ability)} ${aniimoNeeds(g)}</td><td data-label="How many">${g.count}</td><td data-label="Busy on average">${g.busy.toFixed(1)}</td><td data-label="Where">${where}</td></tr>`;
        })
        .join('');
    const haulingRow = `<tr><td data-label="Aniimo">${abilityTag('Hauling')} any level</td><td data-label="How many">1+</td><td data-label="Busy on average">?</td><td data-label="Where">Carries produce to storage. How much work this is isn't known yet; add more if produce piles up.</td></tr>`;

    // The count above says how many; this is only said when it's more than the production zone holds.
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const capNote = cap && total > cap
        ? `<p class="hint small">${isVi
            ? `Cần ${total} Aniimo, vượt quá giới hạn ${cap} của Vùng Sản Xuất (Homeland chứa tối đa ${homelandHolds}).`
            : `That's ${total} Aniimo, more than the production zone cap of ${cap} (Homeland holds ${homelandHolds}).`}</p>`
        : '';
    const have = document.getElementById('aniimo-count-have');
    const of = document.getElementById('aniimo-count-of');
    const count = document.getElementById('aniimo-count');
    if (have && of && count) {
        have.textContent = total;
        of.textContent = cap ?? '';
        of.hidden = !cap;
        count.hidden = false;
        count.classList.toggle('over', !!cap && total > cap);
        count.title = cap
            ? (isVi
                ? `${total} Aniimo cho kế hoạch này; giới hạn Vùng Sản Xuất là ${cap} (tổng Homeland: ${homelandHolds})`
                : `${total} Aniimo for this plan; production zone cap is ${cap} (Homeland holds ${homelandHolds})`)
            : `${total} Aniimo for this plan`;
    }
    collapsedSummary.textContent = '';
    // How many of each ability the plan needs, in the game's order, like its Abilities screen.
    const needed = new Map(ABILITIES.map(a => [a.name, 0]));
    kept.forEach(g => needed.set(g.ability, (needed.get(g.ability) || 0) + g.count));
    // Under each count, render Aniimo worker avatar badges with level badge and count multiplier
    const teamDots = g => {
        const where = whereText(g);
        const tip = `${g.count > 1 ? `${g.count}× ` : ''}${g.label}${g.bonus ? ' (+20% tốc độ)' : ''} · ${where}`;
        return renderRosterWorkerBadge(g.ability, g.environment ? '·' : g.level, g.count, tip, g.bonus, g.specificWorker || '');
    };
    document.getElementById('aniimo-abilities').innerHTML = ABILITIES.map(a => {
        const n = a.name === 'Hauling' ? `${needed.get(a.name) + 1}+` : needed.get(a.name);
        const zero = n === 0;
        const dots = kept
            .filter(g => g.ability === a.name)
            .sort((x, y) => y.level - x.level || Number(y.bonus) - Number(x.bonus))
            .map(teamDots);
        if (a.name === 'Hauling') {
            dots.push(renderRosterWorkerBadge('Hauling', '·', 1, 'Vận chuyển hàng hóa vào kho', false));
        }
        const stack = dots.length ? `<div class="ability-stack">${dots.join('')}</div>` : '';
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        const aName = isVi && window.VI_ABILITIES && window.VI_ABILITIES[a.name] ? window.VI_ABILITIES[a.name] : a.name;
        return `<div class="ability-col" style="--ability:${a.color}">
            <div class="ability-cell${zero ? ' zero' : ''}" title="${aName}: ${a.about}">
                <span class="ability-count">${n}</span><span class="ability-name">${aName}</span>
            </div>${stack}</div>`;
    }).join('');
    container.innerHTML = `
        <div class="table-wrapper">
            <table class="facility-plan-table">
                <thead><tr><th>${window.th ? window.th('th_aniimo', 'Aniimo') : 'Aniimo'}</th><th>${window.th ? window.th('th_how_many', 'How many') : 'How many'}</th><th>${window.th ? window.th('th_busy_avg', 'Busy on average') : 'Busy on average'}</th><th>${window.th ? window.th('th_where', 'Where') : 'Where'}</th></tr></thead>
                <tbody>${rows}${haulingRow}</tbody>
            </table>
        </div>
        ${capNote}
    `;
}

// Splits one environment mode's rows across its individual building units. Unlike the old
// preset-based version, each unit's exact facility-type capacity now comes straight from the
// solver's own geometric packing (`assignment.layouts[i]`; see `FacilityPlacement` in
// models.rs), not an evenly-divided share, since real per-building layouts aren't always
// identical (e.g. one Cooling Unit might host Farmland+Woodland while another hosts only
// Farmland). Still greedily fills each unit's per-facility-type capacity in row order, splitting
// a single row across units when its count exceeds one unit's remaining capacity; the exact
// split is arbitrary (any unit can host any plot of the crops sharing its mode), only the
// per-unit totals (and the diagram's exact positions) are load-bearing.
function splitByEnvironmentUnit(rows, assignmentsForMode) {
    const units = [];
    assignmentsForMode.forEach(a => {
        (a.layouts || []).forEach(layout => {
            const remaining = {};
            layout.forEach(p => {
                remaining[p.facility] = (remaining[p.facility] || 0) + 1;
            });
            units.push({ building: a.building, remaining, rows: [], layout, partner: a.partner || null, zone: a.zone ?? null, pairModes: a.pair_modes || null });
        });
    });

    rows.forEach(step => {
        let remaining = step.facility_count;
        for (const unit of units) {
            if (remaining <= 0) break;
            const available = unit.remaining[step.facility] || 0;
            const take = Math.min(remaining, available);
            if (take <= 0) continue;
            unit.remaining[step.facility] -= take;
            unit.rows.push({ ...step, facility_count: take });
            remaining -= take;
        }
    });

    // A building's geometric layout is capacity, not a production guarantee; a facility type can
    // sit unused in a unit's coverage if there wasn't enough demand to fill every plot the fill
    // loop above offered it. Drawing that unused capacity in the diagram would show the player
    // squares they shouldn't actually place anything in (and that don't match this unit's own
    // table), so trim `layout` down to just the placements this unit's `rows` actually accounted
    // for, per facility type.
    units.forEach(unit => {
        const totalByFacility = {};
        unit.layout.forEach(p => {
            totalByFacility[p.facility] = (totalByFacility[p.facility] || 0) + 1;
        });
        const takenSoFar = {};
        unit.layout = unit.layout.filter(p => {
            const unused = unit.remaining[p.facility] || 0;
            const used = (totalByFacility[p.facility] || 0) - unused;
            takenSoFar[p.facility] = takenSoFar[p.facility] || 0;
            if (takenSoFar[p.facility] < used) {
                takenSoFar[p.facility]++;
                return true;
            }
            return false;
        });
    });

    return units.filter(u => u.rows.length > 0);
}

// Fixed color per environment-gated facility type, used by the layout diagram below; purely
// categorical (not theme-dependent), so it stays distinguishable in both light and dark mode.
const ENVIRONMENT_FACILITY_COLORS = {
    'Farmland': '#8b5e34',
    'Woodland': '#4caf50',
    'Starfall Hammock': '#42a5f5',
    'Tidewhisper Sandcastle': '#26c6da',
    'Floral Windmill': '#ab47bc',
    'Dewy House': '#ef8a80',
};

// Matches the confirmed geometry in src/coverage.rs: every environment building is a 2x2
// footprint, radiating coverage as a square of side 2*radius centered on its own center.
// Footprints, matching `ENVIRONMENT_BUILDING_SIZES` in coverage.rs: a Cooling Unit takes a 2x2
// like a Farmland, a Heat Furnace and a Sunlamp a single tile. All three cover the same 9x9 from
// their own center, so the smaller ones' squares land on tile lines and the Cooling Unit's sits
// half a tile off.
const ENVIRONMENT_BUILDING_SIZES = { 'Heat Furnace': 1.0, 'Cooling Unit': 2.0, 'Sunlamp': 1.0 };
const DEFAULT_ENVIRONMENT_BUILDING_SIZE = 2.0;
const environmentBuildingSize = name => ENVIRONMENT_BUILDING_SIZES[name] ?? DEFAULT_ENVIRONMENT_BUILDING_SIZE;
const ENVIRONMENT_COVERAGE_RADIUS = 4.5;

// Coverage tint for each growing environment, used to shade a building's coverage area.
// Adequate's yellow carries further than the others at the same opacity, so it's laid on lighter.
const ENVIRONMENT_MODE_SHADE = { Adequate: 0.55 };

const ENVIRONMENT_MODE_COLORS = {
    Warm: '#f59e0b',
    Scorching: '#ef4444',
    Cool: '#67e8f9',
    Freeze: '#2563eb',
    Adequate: '#facc15',
};

// Renders one building's layout as an SVG: faint one-tile gridlines, the building, its coverage
// area shaded in the environment's color, and every plot the plan puts in it, nearest the
// building first. `rows` are this building's plan rows; each plot is matched to one of them so
// hovering a plot names its crop, and when one facility type grows more than one crop here (so
// color alone can't tell them apart) each plot shows its crop's number from the legend.
// Positions are the solver's own, in game tiles.
// What each environment building does, drawn on it in the layout diagram, after the game's own
// symbols: a flame for Warm and two for Scorching, a six-armed snowflake for Cool and two for
// Freeze, a sun for Adequate. Paths rather than emoji, which some systems render in their own
// colours.
const ENVIRONMENT_ICON_INK = 'rgba(255, 255, 255, 0.92)';

function flameIcon(cx, cy, size) {
    const s = size;
    return `<path d="M ${cx} ${cy - 0.62 * s}
                     C ${cx + 0.12 * s} ${cy - 0.3 * s} ${cx + 0.42 * s} ${cy - 0.16 * s} ${cx + 0.4 * s} ${cy + 0.12 * s}
                     C ${cx + 0.38 * s} ${cy + 0.42 * s} ${cx + 0.16 * s} ${cy + 0.6 * s} ${cx} ${cy + 0.6 * s}
                     C ${cx - 0.16 * s} ${cy + 0.6 * s} ${cx - 0.4 * s} ${cy + 0.42 * s} ${cx - 0.4 * s} ${cy + 0.1 * s}
                     C ${cx - 0.4 * s} ${cy - 0.1 * s} ${cx - 0.24 * s} ${cy - 0.18 * s} ${cx - 0.18 * s} ${cy - 0.36 * s}
                     C ${cx - 0.1 * s} ${cy - 0.22 * s} ${cx - 0.04 * s} ${cy - 0.3 * s} ${cx} ${cy - 0.62 * s} Z"
                   fill="${ENVIRONMENT_ICON_INK}" />`;
}

function snowflakeIcon(cx, cy, size) {
    const arms = [0, 60, 120].map(angle => {
        const radians = angle * Math.PI / 180;
        const [dx, dy] = [Math.cos(radians) * 0.62 * size, Math.sin(radians) * 0.62 * size];
        return `<line x1="${cx - dx}" y1="${cy - dy}" x2="${cx + dx}" y2="${cy + dy}" />`;
    }).join('');
    return `<g stroke="${ENVIRONMENT_ICON_INK}" stroke-width="${0.17 * size}" stroke-linecap="round">${arms}</g>`;
}

function sunIcon(cx, cy, size) {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
        const radians = angle * Math.PI / 180;
        const [dx, dy] = [Math.cos(radians), Math.sin(radians)];
        return `<line x1="${cx + dx * 0.42 * size}" y1="${cy + dy * 0.42 * size}"
                      x2="${cx + dx * 0.64 * size}" y2="${cy + dy * 0.64 * size}" />`;
    }).join('');
    return `<circle cx="${cx}" cy="${cy}" r="${0.28 * size}" fill="${ENVIRONMENT_ICON_INK}" />
            <g stroke="${ENVIRONMENT_ICON_INK}" stroke-width="${0.15 * size}" stroke-linecap="round">${rays}</g>`;
}

// A building's symbol, drawn to fit whatever footprint it has: a Heat Furnace and a Sunlamp sit
// on one tile, so their symbols are half the size of a Cooling Unit's.
function environmentBuildingIcon(building, mode, cx, cy) {
    const scale = environmentBuildingSize(building) / 2;
    // The stronger of a building's two modes shows its symbol twice, as the game does: the main
    // one low and left, a smaller one off its top right, both clear of the building's edge.
    const twice = draw => `${draw(cx - 0.12 * scale, cy + 0.14 * scale, 0.92 * scale)}${draw(cx + 0.38 * scale, cy - 0.32 * scale, 0.56 * scale)}`;
    if (building === 'Heat Furnace') {
        return mode === 'Scorching' ? twice(flameIcon) : flameIcon(cx, cy, scale);
    }
    if (building === 'Cooling Unit') {
        return mode === 'Freeze' ? twice(snowflakeIcon) : snowflakeIcon(cx, cy, scale);
    }
    if (building === 'Sunlamp') {
        return sunIcon(cx, cy, scale);
    }
    return '';
}

function renderEnvironmentDiagram(layout, mode, building, rows = [], unit = null, zones = null) {
    if (!layout || layout.length === 0) return '';
    const margin = 5;
    const half = ENVIRONMENT_COVERAGE_RADIUS + margin;
    const buildingSize = environmentBuildingSize(building);
    const buildingCenter = buildingSize / 2;
    // Centered on the building's own center (it sits at (0,0)-(size,size)), not world origin.
    const viewMin = buildingCenter - half;
    const viewSize = half * 2;
    const coverageMin = buildingCenter - ENVIRONMENT_COVERAGE_RADIUS;
    const coverageSize = ENVIRONMENT_COVERAGE_RADIUS * 2;
    const tint = ENVIRONMENT_MODE_COLORS[mode] || '#9aa0a8';
    // Two buildings placed to overlap: the plots shown are one of the three zones they make, in
    // a frame with this building at the origin and its partner dx tiles along and dy tiles up.
    const dx = unit && unit.partner ? unit.partner[1] : 0;
    const dy = unit && unit.partner ? unit.partner[2] : 0;
    const zone = unit && unit.partner ? unit.zone : null;
    const partnerSize = unit && unit.partner ? environmentBuildingSize(unit.partner[0]) : buildingSize;
    const partnerCenter = partnerSize / 2;
    const partnerMin = {
        x: partnerCenter - ENVIRONMENT_COVERAGE_RADIUS + dx,
        y: partnerCenter - ENVIRONMENT_COVERAGE_RADIUS + dy,
    };
    const viewWidth = Math.max(viewSize, partnerMin.x + coverageSize + margin - viewMin);
    const viewHeight = Math.max(viewSize, partnerMin.y + coverageSize + margin - viewMin);
    // Each building covers its own 9x9 square; this zone is the part of them that gives this
    // temperature: only the first's, only the second's, or where the two meet.
    const modes = unit && unit.pairModes ? unit.pairModes : null;
    const tintOf = m => ENVIRONMENT_MODE_COLORS[m] || '#9aa0a8';
    const shadeOf = (m, opacity) => (opacity * (ENVIRONMENT_MODE_SHADE[m] ?? 1)).toFixed(3);
    // Where the two coverage squares cross. It is always a rectangle; each building's own zone is
    // its square with that rectangle taken out, which is an L unless the buildings line up.
    const shared = {
        x: Math.max(coverageMin, partnerMin.x),
        y: Math.max(coverageMin, partnerMin.y),
        w: Math.min(coverageMin, partnerMin.x) + coverageSize - Math.max(coverageMin, partnerMin.x),
        h: Math.min(coverageMin, partnerMin.y) + coverageSize - Math.max(coverageMin, partnerMin.y),
    };
    const box = (x, y, w, h) => `M${x} ${y}h${w}v${h}h${-w}Z`;
    // A zone as one path: the shared rectangle on its own, or a square with it cut out (two
    // subpaths, which the even-odd rule reads as the difference).
    const zonePath = z => {
        if (z === 1) return box(shared.x, shared.y, shared.w, shared.h);
        const own = z === 2 ? box(partnerMin.x, partnerMin.y, coverageSize, coverageSize)
            : box(coverageMin, coverageMin, coverageSize, coverageSize);
        return `${own}${box(shared.x, shared.y, shared.w, shared.h)}`;
    };

    // Gridlines like the game's: stronger on whole tiles, very faint on the quarter tiles
    // facilities snap to.
    const gridLines = [];
    for (let t = Math.ceil(viewMin * 4) / 4; t <= viewMin + Math.max(viewWidth, viewHeight); t += 0.25) {
        // Every other tile line is a major one, in step with the 2x2 buildings.
        const cls = !Number.isInteger(t) ? 'quarter' : t % 2 === 0 ? 'tile major' : 'tile';
        if (t <= viewMin + viewWidth) {
            gridLines.push(`<line class="${cls}" x1="${t}" y1="${viewMin}" x2="${t}" y2="${viewMin + viewHeight}" />`);
        }
        if (t <= viewMin + viewHeight) {
            gridLines.push(`<line class="${cls}" x1="${viewMin}" y1="${t}" x2="${viewMin + viewWidth}" y2="${t}" />`);
        }
    }

    // Plots nearest the building first, each matched to a plan row of its facility type. On a
    // shared map every zone matches its own rows to its own plots.
    const distance = p => Math.hypot(p.x + p.size / 2 - buildingCenter, p.y + p.size / 2 - buildingCenter);
    const matchCrops = (plots, plotRows) => {
        const queue = {};
        plotRows.forEach(r => {
            if (!r.item_name) return;
            (queue[r.facility] = queue[r.facility] || []).push({ item: r.item_name, left: r.facility_count });
        });
        return [...plots].sort((a, b) => distance(a) - distance(b)).map(p => {
            const q = queue[p.facility];
            while (q && q.length && q[0].left <= 0) q.shift();
            if (!q || !q.length) return { ...p, crop: null };
            q[0].left--;
            return { ...p, crop: q[0].item };
        });
    };
    const assigned = zones ? zones.flatMap(z => matchCrops(z.layout, z.rows)) : matchCrops(layout, rows);
    const crops = [...new Set(assigned.map(p => `${p.facility}|${p.crop}`))];
    const cropsPerFacility = {};
    crops.forEach(key => {
        const facility = key.split('|')[0];
        cropsPerFacility[facility] = (cropsPerFacility[facility] || 0) + 1;
    });
    const numbered = Object.values(cropsPerFacility).some(n => n > 1);
    const numberOf = key => crops.indexOf(key) + 1;

    // A small inset keeps edge-touching plots visibly separate; purely cosmetic.
    const inset = 0.08;
    const rects = assigned.map(p => {
        const color = ENVIRONMENT_FACILITY_COLORS[p.facility] || '#888888';
        const size = p.size - inset * 2;
        const initials = numbered && p.crop
            ? `<text x="${p.x + p.size / 2}" y="${p.y + p.size / 2}" font-size="${Math.min(0.9, p.size * 0.4)}">${numberOf(`${p.facility}|${p.crop}`)}</text>`
            : '';
        return `<g class="env-plot" ${tipAttrs(p.facility, { detail: p.crop ? prettyItem(p.crop) : '', color })}>
            <rect x="${p.x + inset}" y="${p.y + inset}" width="${size}" height="${size}" rx="0.25" fill="${color}" fill-opacity="0.85" stroke="${color}" stroke-width="0.06" />${initials}</g>`;
    }).join('');

    const counts = {};
    assigned.forEach(p => {
        const key = `${p.facility}|${p.crop}`;
        counts[key] = (counts[key] || 0) + 1;
    });
    // What the colours mean: the coverage, then each crop with how many plots it gets here.
    const swatch = (color, label) => `
        <span class="env-legend-item">
            <span class="env-legend-swatch coverage" style="background:${color}33;border-color:${color}"></span>${label}
        </span>`;
    // On a shared map the heading already names both buildings and what they're set to; the
    // legend only has to say what the middle is and which crop is which.
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const coverageLegend = modes
        ? (zones
            ? []
            : [
                swatch(tintOf(modes[0]), `${getFacilityDisplayName(building)}: ${isVi && window.VI_ENV_MODES[modes[0]] ? window.VI_ENV_MODES[modes[0]] : modes[0]}`),
                swatch(tintOf(modes[1]), `${getFacilityDisplayName(unit.partner[0])}: ${isVi && window.VI_ENV_MODES[modes[1]] ? window.VI_ENV_MODES[modes[1]] : modes[1]}`),
                swatch(tint, zone === 1
                    ? (isVi ? `${window.VI_ENV_MODES[mode] || mode} nơi cả hai bao phủ` : `${mode} where both reach`)
                    : (isVi ? `${window.VI_ENV_MODES[mode] || mode}, ô đất kế hoạch này` : `${mode}, this plan's plots`)),
            ])
        : [swatch(tint, isVi ? `Phạm vi ${window.VI_ENV_MODES[mode] || mode}` : `${mode} coverage`)];
    const legend = coverageLegend.concat(Object.entries(counts).map(([key, n]) => {
        const [facility, crop] = key.split('|');
        const facName = getFacilityDisplayName(facility);
        // The number a plot carries in the diagram reads as part of the facility's name, as the
        // plots themselves do: "Farmland 1: Sugarcane".
        const named = `${facName}${numbered ? ` <b>${numberOf(key)}</b>` : ''}`;
        const name = crop && crop !== 'null' ? `${named}: ${prettyItem(crop)}` : named;
        return `
        <span class="env-legend-item">
            <span class="env-legend-swatch" style="background:${ENVIRONMENT_FACILITY_COLORS[facility] || '#888888'}"></span>${name} ×${n}
        </span>`;
    })).join('');

    return `
        <div class="env-diagram">
            <svg viewBox="${viewMin} ${viewMin} ${viewWidth} ${viewHeight}" role="img" aria-label="${building} layout, ${mode} coverage">
                <g class="env-grid">${gridLines.join('')}</g>
                <rect x="${coverageMin}" y="${coverageMin}" width="${coverageSize}" height="${coverageSize}"
                      fill="${modes ? tintOf(modes[0]) : tint}" fill-opacity="${shadeOf(modes ? modes[0] : mode, 0.12)}" />
                ${modes ? `<rect x="${partnerMin.x}" y="${partnerMin.y}" width="${coverageSize}" height="${coverageSize}"
                      fill="${tintOf(modes[1])}" fill-opacity="${shadeOf(modes[1], 0.12)}" />` : ''}
                ${rects}
                ${(zones || [{ mode, zone }]).map(z => {
        const path = z.zone === null || z.zone === undefined
            ? box(coverageMin, coverageMin, coverageSize, coverageSize)
            : zonePath(z.zone);
        const zoneTint = tintOf(z.mode);
        return `<path class="env-coverage-top" d="${path}" fill-rule="evenodd"
                      fill="${zoneTint}" fill-opacity="${shadeOf(z.mode, 0.3)}" stroke="${zoneTint}" stroke-opacity="0.9" stroke-dasharray="0.35,0.25" stroke-width="0.1" />`;
    }).join('')}
                ${modes ? `<rect x="${coverageMin}" y="${coverageMin}" width="${coverageSize}" height="${coverageSize}" fill="none"
                      stroke="${tintOf(modes[0])}" stroke-opacity="0.55" stroke-width="0.07" />
                    <rect x="${partnerMin.x}" y="${partnerMin.y}" width="${coverageSize}" height="${coverageSize}" fill="none"
                      stroke="${tintOf(modes[1])}" stroke-opacity="0.55" stroke-width="0.07" />` : ''}
                <g class="env-building" ${tipAttrs(building, { detail: modes ? modes[0] : mode, color: modes ? tintOf(modes[0]) : tint })}>
                    <rect x="0.05" y="0.05" width="${buildingSize - 0.1}" height="${buildingSize - 0.1}" rx="0.3"
                          fill="${modes ? tintOf(modes[0]) : tint}" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.08" />
                    ${environmentBuildingIcon(building, modes ? modes[0] : mode, buildingCenter, buildingCenter)}
                </g>
                ${unit && unit.partner ? `<g class="env-building" ${tipAttrs(unit.partner[0], { detail: modes ? modes[1] : mode, color: tintOf(modes ? modes[1] : mode) })}>
                    <rect x="${dx + 0.05}" y="${dy + 0.05}" width="${partnerSize - 0.1}" height="${partnerSize - 0.1}" rx="0.3"
                          fill="${modes ? tintOf(modes[1]) : tint}" stroke="currentColor" stroke-opacity="0.6" stroke-width="0.08" />
                    ${environmentBuildingIcon(unit.partner[0], modes ? modes[1] : mode, dx + partnerCenter, dy + partnerCenter)}
                </g>` : ''}
            </svg>
            <div class="env-legend">${legend}</div>
        </div>
    `;
}

// Renders `plan.coin_items` (one row per facility+product; see `PlanStep` in models.rs). Rows
// for a crop that needs a growing environment (Cool/Warm/Freeze/Scorching/Adequate) are pulled
// out into their own "Environment: X" group first; regardless of whether they're grown on
// Farmland or Woodland; so it's obvious at a glance which facilities share the same environment
// building, instead of that connection being spelled out in each row's own text. When a mode
// needs more than one building unit, that group splits into one table per unit (see
// `splitByEnvironmentUnit`) so it's clear which crops go in which physical building. Everything
// else falls back to the original per-facility-category grouping (FACILITY_CATEGORIES).
function renderFacilityPlan(plan) {
    const container = document.getElementById('facility-plan-container');
    const steps = plan.coin_items || [];

    if (steps.length === 0) {
        container.innerHTML = '<p class="hint">Nothing profitable to produce with the current facilities.</p>';
        return;
    }

    const envGroups = new Map();
    const ungatedSteps = [];
    steps.forEach(step => {
        if (step.environment) {
            if (!envGroups.has(step.environment)) envGroups.set(step.environment, []);
            envGroups.get(step.environment).push(step);
        } else {
            ungatedSteps.push(step);
        }
    });

    const assignments = plan.environment_assignments || [];
    // Split every mode's crops across the buildings covering them, then show one map per
    // building: two that overlap share a single map, since they're one place on the homeland.
    const byMode = new Map();
    ENVIRONMENT_MODE_ORDER.filter(mode => envGroups.has(mode)).forEach(mode => {
        byMode.set(mode, splitByEnvironmentUnit(envGroups.get(mode), assignments.filter(a => a.mode === mode)));
    });
    const pairs = new Map();
    const singles = [];
    byMode.forEach((units, mode) => {
        units.forEach(unit => {
            if (!unit.partner) {
                singles.push({ mode, unit });
                return;
            }
            const key = `${unit.building}|${unit.partner[0]}|${unit.partner[1]},${unit.partner[2]}`;
            if (!pairs.has(key)) pairs.set(key, { unit, zones: [] });
            pairs.get(key).zones.push({ mode, layout: unit.layout, rows: unit.rows, zone: unit.zone });
        });
    });

    const pairSections = [...pairs.values()].map(({ unit, zones }) => {
        zones.sort((a, b) => a.zone - b.zone);
        const modes = unit.pairModes || [unit.mode, unit.mode];
        const middle = zones.find(z => z.zone === 1)?.mode;
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        const overlapText = isVi ? 'Giao thoa' : 'Overlap';
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${getFacilityDisplayName(unit.building)} ${modeTag(modes[0])}<span class="env-head-sep">|</span>${getFacilityDisplayName(unit.partner[0])} ${modeTag(modes[1])}${middle ? `<span class="env-head-sep">|</span>${overlapText} ${modeTag(middle)}` : ''}</h4>
                <div class="env-unit">
                    ${renderEnvironmentDiagram(zones.flatMap(z => z.layout), zones[0].mode, unit.building, zones.flatMap(z => z.rows), unit, zones)}
                    <div class="env-unit-table">${facilityPlanTableOf(zones.map(z => ({ label: modeTag(z.mode), rows: z.rows })))}</div>
                </div>
            </div>
        `;
    }).join('');

    const modeSections = ENVIRONMENT_MODE_ORDER.map(mode => {
        const units = singles.filter(s => s.mode === mode).map(s => s.unit);
        const isVi = window.i18n && window.i18n.getLang() === 'vi';
        if (units.length === 0) {
            // Crops wanting this mode that no building's map accounted for, if any: the units
            // hold copies of each row, so compare by how many plots each one placed.
            const placed = {};
            (byMode.get(mode) || []).forEach(u => u.rows.forEach(r => {
                placed[`${r.facility}|${r.item_name}`] = (placed[`${r.facility}|${r.item_name}`] || 0) + r.facility_count;
            }));
            const orphans = (envGroups.get(mode) || [])
                .map(step => ({ ...step, facility_count: step.facility_count - (placed[`${step.facility}|${step.item_name}`] || 0) }))
                .filter(step => step.facility_count > 0);
            return orphans.length === 0 ? '' : `
                <div class="facility-category">
                    <h4 class="facility-category-title">${modeTag(mode)}</h4>
                    ${facilityPlanTable(orphans)}
                </div>`;
        }
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${getFacilityDisplayName(units[0].building)} ${modeTag(mode)}</h4>
                ${units.map((unit, i) => `
                    ${units.length > 1 ? `<p class="hint small">${getFacilityDisplayName(unit.building)} ${i + 1}</p>` : ''}
                    <div class="env-unit">
                        ${renderEnvironmentDiagram(unit.layout, mode, unit.building, unit.rows, unit)}
                        <div class="env-unit-table">${facilityPlanTable(unit.rows)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }).join('');
    const environmentSections = pairSections + modeSections;

    const byCategory = new Map(FACILITY_CATEGORIES.map(c => [c, []]));
    ungatedSteps.forEach(step => {
        const category = FACILITY_CATEGORY_BY_NAME.get(step.facility) || 'Materials Processing';
        if (!byCategory.has(category)) byCategory.set(category, []);
        byCategory.get(category).push(step);
    });

    const isVi = window.i18n && window.i18n.getLang() === 'vi';

    // Gộp Nguyên liệu & Nguyên liệu Aniimo thành "Sản xuất nguyên liệu" (chạy 24/7), tách riêng Gỗ & Gạch quặng và Cơ sở chế biến
    const PLAN_DISPLAY_CATEGORIES = [
        {
            titleVi: 'Sản xuất nguyên liệu',
            titleEn: 'Materials Production',
            sourceCategories: ['Materials', 'Aniimo Materials']
        },
        {
            titleVi: 'Sản xuất gỗ và gạch quặng',
            titleEn: 'Wood & Ore Processing',
            sourceCategories: ['Wood & Ore Processing']
        },
        {
            titleVi: 'Cơ sở chế biến',
            titleEn: 'Processing Facilities',
            sourceCategories: ['Materials Processing']
        }
    ];

    const categorySections = PLAN_DISPLAY_CATEGORIES.map(cat => {
        let categorySteps = [];
        cat.sourceCategories.forEach(sc => {
            const list = byCategory.get(sc) || [];
            categorySteps.push(...list);
        });
        // Chỉ liệt kê cơ sở cần dùng, cái nào không dùng thì không show
        categorySteps = categorySteps.filter(step => step.status === 'producing' && Boolean(step.item_name));
        if (categorySteps.length === 0) return '';
        const catName = isVi ? cat.titleVi : cat.titleEn;
        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${catName}</h4>
                ${facilityPlanTable(categorySteps)}
            </div>
        `;
    }).join('');

    container.innerHTML = environmentSections + categorySections;
}

// Re-renders "Your Rate" from `lastPlan` at whichever unit is currently selected in the
// `#rate-unit` dropdown; called after a fresh plan and again whenever the user switches units, so
// switching units never needs a facility-allocation re-solve. `pickUnit` is for a fresh plan
// only: it chooses the unit the plan reads best at. Switching units must never do that, or the
// choice would be undone the moment it's made.
function updateRateDisplay(pickUnit = false) {
    if (!lastPlan || !lastPlan.success) return;
    const select = document.getElementById('rate-unit');
    const rows = planContext && !planContext.levelUp ? priorityRows(lastPlan) : null;
    // Step the unit up until the smallest rate reads at least 1 (Aniipods per hour, Rough Lumber
    // per hour, not 0.01 per second); a plain coin rate only needs to read above zero.
    const costRates = (lastPlan.level_up?.requirements || []).map(r => r.per_second);
    const rates = (rows ? rows.map(r => r.perSecond) : costRates).filter(r => r > 1e-9);
    const smallest = rates.length ? Math.min(...rates) : lastPlan.rate_per_second;
    const least = rates.length ? 1 : 0.05;
    while (pickUnit && smallest * RATE_UNIT_SECONDS[select.value].multiplier < least) {
        const next = { second: 'minute', minute: 'hour', hour: 'day' }[select.value];
        if (!next) break;
        select.value = next;
    }
    const { multiplier, suffix } = RATE_UNIT_SECONDS[select.value] || RATE_UNIT_SECONDS.second;
    const rateLine = document.getElementById('rate-line');
    const table = document.getElementById('priority-rates');
    if (!rows) {
        if (select.closest('#priority-rates')) rateLine.appendChild(select);
        const label = CURRENCY_LABELS[lastPlan.currency] || lastPlan.currency;
        const points = lastPlan.season_points > 1e-12 ? ` + ${formatRate(lastPlan.season_points * multiplier)} ${SEASON.points}` : '';
        document.getElementById('plan-rate').textContent = `${formatRate(lastPlan.rate_per_second * multiplier)} ${label}${points}${suffix}`;
        document.getElementById('rate-label').textContent = 'Your Rate';
        rateLine.style.display = '';
        table.innerHTML = '';
        return;
    }
    // Priorities: one row each, in the player's order, at the selected unit.
    const amount = formatRate;
    const body = rows.map(r => {
        const why = r.perSecond <= 1e-9 && r.missing ? `<span class="hint small">${r.missing}</span>` : '';
        // Aniimo EXP names the Growth items making it; an Aniipod row is already named by tier.
        const made = r.target === 'aniimo_exp'
            ? r.items.filter(([, n]) => n > 1e-9).map(([item, n]) => `${amount(n * multiplier)} ${prettyItem(item)}`).join(', ')
            : '';
        return `<tr${r.rank === 1 ? ' class="top"' : ''}>
            <td>${r.rank ?? ''}</td>
            <td>${r.label}</td>
            <td>${why ? 'none' : amount(r.perSecond * multiplier)}</td>
            <td>${why || made}</td>
        </tr>`;
    }).join('');
    table.innerHTML = `
        <table class="level-up-lines rate-table">
            <thead><tr><th>#</th><th>Priority</th><th id="priority-rate-head"></th><th></th></tr></thead>
            <tbody>${body}</tbody>
        </table>`;
    document.getElementById('priority-rate-head').appendChild(select);
    document.getElementById('rate-label').textContent = 'Your Rates';
    rateLine.style.display = 'none';
}

// A Priorities plan's rate rows, in the player's order: each priority, then coins from what's
// left if coins wasn't one of them. A priority the homeland can't make yet says why.
function priorityRows(plan) {
    const missing = {
        aniimo_exp: planContext?.hasPolisher ? null : 'No Dance Pad Polisher yet',
        aniipods: planContext?.aniipod ? null : 'No Aniipod Maker yet',
    };
    const rows = (plan.priorities || []).map((p, i) => ({
        rank: i + 1,
        target: p.target,
        label: priorityLabel(p.target, planContext?.aniipod),
        perSecond: p.per_second,
        items: p.items || [],
        streams: p.streams || [],
        missing: missing[p.target] || null,
    }));
    if (!rows.some(r => r.target === 'coins')) {
        rows.push({ rank: null, target: 'coins', label: rows.length ? "Home Coins, from what's left" : 'Home Coins', perSecond: plan.rate_per_second, items: [], missing: null });
    }
    // During the season, points come with every season item sold, ranked or not.
    if (plan.season_points != null && !rows.some(r => r.target === 'season_points')) {
        rows.push({ rank: null, target: 'season_points', label: SEASON.points, perSecond: plan.season_points, items: [], missing: null });
    }
    return rows;
}

// Re-renders every rate-unit-dependent display ("Your Rate" and the Product Breakdown table's
// Profit column) from the already-computed `lastPlan`/`lastGoalResult`; the `#rate-unit` change
// listener target, so switching units never needs a re-solve.
function updateRateUnitDisplays() {
    updateRateDisplay();
    renderImprovements();
    if (lastPlan && lastPlan.success) {
        renderSeedTable(lastPlan);
        renderLevelUp(lastPlan);
    }
    if (lastGoalResult) {
        renderProductBreakdown(lastGoalResult);
    }
}

// Render a successfully computed plan: rate summary + facility plan table. Goal-independent,
// called once per Calculate click (or facility/currency/module change), not on every goal
// keystroke.
export function displayPlan(plan) {
    const resultsSection = document.getElementById('results-section');
    const errorEl = document.getElementById('error-message');
    const resultsContent = document.getElementById('results-content');
    const goalSection = document.getElementById('goal-section');

    resultsSection.style.display = 'block';

    const infeasibleEl = document.getElementById('infeasible-explanation-section');

    const isLevelUpRequested = planContext ? planContext.levelUp : isLevelUpStrategy();
    if (!plan.success || (isLevelUpRequested && !plan.level_up)) {
        goalSection.style.display = 'none';
        resultsContent.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        renderInfeasibleExplanation(plan);
        return;
    }

    if (infeasibleEl) infeasibleEl.style.display = 'none';
    if (errorEl) errorEl.style.display = 'none';
    resultsContent.style.display = 'block';
    resultsContent.classList.remove('setup-only');
    // A level-up plan's own card says how long it takes; the goal is for coin plans.
    goalSection.style.display = plan.level_up ? 'none' : 'block';

    updateRateDisplay(!rateUnitChosen);
    renderGoalTargets(plan);
    renderHomelandLayout(plan);
    renderInsights(plan);
    evaluatePlotsOptimization(plan);

    // Said only when the plan might not be the best: the solver ran out of time, or the backup
    // planner made it.
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const explored = document.getElementById('plan-explored-hint');
    explored.style.display = plan.proven_optimal === true ? 'none' : '';
    if (plan.proven_optimal === true) {
        explored.textContent = '';
    } else if (plan.proven_optimal === false && plan.upper_bound > 0) {
        const gap = Math.max(0, (plan.upper_bound - plan.rate_per_second) / plan.upper_bound * 100);
        explored.textContent = isVi
            ? `Kế hoạch tối ưu nhất tìm thấy trong thời gian cho phép; mức tối đa lý thuyết cao hơn nhiều nhất ${gap.toFixed(1)}%.`
            : `Best plan found in the time allowed; the best possible is at most ${gap.toFixed(1)}% higher.`;
    } else {
        const reason = plan.fallback_reason ? ` (${plan.fallback_reason})` : '';
        explored.textContent = isVi
            ? `Bộ giải chuẩn xác không thể hoàn tất${reason}, kế hoạch này được tạo từ bộ giải dự phòng. Tải lại trang thường sẽ giải quyết được.`
            : `The exact planner couldn't run${reason}, so this plan comes from the backup planner and may not be the very best. Reloading the page usually fixes this.`;
    }

    const unverifiedEl = document.getElementById('plan-unverified');
    const unverified = plan.unverified || [];
    unverifiedRowKeys = new Set(unverified.map(u => `${u.facility}|${u.item_name}`));
    if (unverified.length) {
        unverifiedEl.textContent = isVi
            ? `${unverified.length} công thức trong kế hoạch này chưa được kiểm chứng trong game (được đánh dấu bên dưới). Nếu thông số game thực tế khác, kết quả có thể thay đổi.`
            : `${unverified.length} recipe${unverified.length === 1 ? '' : 's'} in this plan ${unverified.length === 1 ? "hasn't" : "haven't"} been checked in game yet (tagged below). If any of those numbers are off, so is this plan.`;
        unverifiedEl.style.display = 'block';
    } else {
        unverifiedEl.style.display = 'none';
    }

    const skippedEl = document.getElementById('plan-skipped');
    const skipped = planContext?.skipped || [];
    skippedEl.style.display = skipped.length ? 'block' : 'none';
    skippedEl.textContent = skipped.length
        ? (isVi ? `Đang bỏ qua: ${skipped.map(prettyItem).join(', ')}.` : `Skipping ${skipped.map(prettyItem).join(', ')}.`)
        : '';

    renderSeedTable(plan);
    renderLevelUp(plan);
    renderProfitBreakdown(plan);
    renderFacilityPlan(plan);
    renderAniimoSummary(plan);
    // The page stays where the player is; the results appear without scrolling to them.
}

// Render a time-to-goal result: Total Time / Amount Produced summary + Product Breakdown. Called
// live on every goal-field keystroke once a plan exists; cheap, no facility-allocation re-solve.
function displayGoal(goalResult) {
    if (!goalResult.success) {
        lastGoalResult = null;
        document.getElementById('total-time').textContent = '-';
        document.getElementById('amount-produced').textContent = '-';
        document.getElementById('product-breakdown-section').style.display = 'none';
        document.getElementById('seeds-needed-section').style.display = 'none';
        console.warn('Goal calculation failed:', goalResult.error);
        return;
    }

    lastGoalResult = goalResult;
    document.getElementById('total-time').textContent = goalResult.total_time_seconds > 0 ? formatDuration(goalResult.total_time_seconds) : '0m';
    document.getElementById('amount-produced').textContent = formatNumber(goalResult.amount_produced);

    renderProductBreakdown(goalResult);
    renderSeedsNeeded(goalResult);
}

// Solve for the best achievable plan (facilities + currency + modules); the heavier computation,
// triggered explicitly by the Calculate button or Enter in a facility/module field.
async function runFindPlan() {
    if (!wasmReady) {
        showError('Optimizer not ready. Please wait...');
        return;
    }

    const btn = document.getElementById('optimize-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoading = btn.querySelector('.btn-loading');
    const progressBar = document.getElementById('progress-bar-container');
    const progressFill = document.getElementById('progress-bar-fill');
    const progressCaption = document.getElementById('progress-bar-caption');

    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline';
    // The progress card below the button follows each step; the bar only shows if the backup
    // planner runs, since that one counts its trials.
    progressBar.style.display = 'none';
    progressCaption.style.display = 'none';
    progressFill.style.width = '';

    const runId = ++planRunId;
    plansBySetup = {};
    rankingsBySetup = {};
    stopRanking();
    stopSetupSolve();
    stopLayout();
    if (pendingWorkerRequests.size > 0) restartWorker();
    try {
        const input = getPlanInputValues();
        lastPlanInput = input;
        planContext = {
            levelUp: isLevelUpStrategy(),
            target: levelUpTarget(),
            unavailable: levelUpUnavailable(),
            ready: !!(input.level_up && input.level_up.cost.every(([name, need]) => stockAmount(name) >= need)),
            aniipod: wantsAniipods() ? bestAniipod() : null,
            hasPolisher: (input.facilities['Dance Pad Polisher'] || []).some(t => t.count > 0),
            // Only what the player skipped; locked special recipes are the default, not news.
            skipped: [...skippedRecipes].sort((a, b) => prettyItem(a).localeCompare(prettyItem(b))),
            simple: isSimpleMode(),
        };
        startProgress(input, runId);

        // Runs in the worker (see worker.js); the main thread stays free to paint the progress
        // bar above for however long this takes, instead of freezing. `onTrialProgress` receives
        // the solver's own real, running trial-solve count after every trial solve; converted to
        // a fill percentage by `trialCountToPercent` below.
        // Only the backup planner reports progress (see worker.js); the exact planner is quick.
        // Whichever Best the player has asked for; the other one waits until they switch to it.
        const bestSetup = selectedAniimoSetup() === 'minimum' ? bestAniimoSetup() : selectedAniimoSetup();
        Object.assign(input, aniimoInput(bestSetup));

        const emodeSimpleOn = document.getElementById('emode-simple-on')?.checked ?? true;
        const currentRv = selectedHomeLevel();
        const useEmode = emodeSimpleOn && currentRv >= 12;

        let bestPlan = null;
        let finalEmodeCounts = {};

        if (useEmode) {
            // STEP 1: Base solve with all manual (emode_facility_counts: {}, power_grid_rate: 1.0)
            // to find highest-yielding products and actively producing facilities.
            input.emode_facilities = [];
            input.emode_facility_counts = {};
            input.power_grid_rate = 1.0;

            const baseJson = await callWorker('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }), (count) => {
                if (typeof count === 'object') {
                    setStep(count.step, count.state, undefined, count.proven);
                    return;
                }
                setStep('backup', 'start', `trial ${count}`);
                progressBar.style.display = 'block';
                progressFill.style.width = `${trialCountToPercent(count)}%`;
            });
            progressFill.style.width = '100%';
            if (runId !== planRunId) return;

            const basePlan = JSON.parse(baseJson);

            // STEP 2: Dynamically allocate E-mode to top active producing facilities within power budget
            const generatorCapacity = getGeneratorCapacity();
            const chosenRate = getPowerGridRate();
            const targetWatts = getTargetEmodeWatts(generatorCapacity, chosenRate);
            const allocatedCounts = allocateDynamicEmode(basePlan, currentRv, targetWatts);

            if (Object.keys(allocatedCounts).length > 0) {
                // STEP 3: Re-solve with optimal E-mode allocation and user's supply rate
                input.emode_facilities = Object.keys(allocatedCounts);
                input.emode_facility_counts = allocatedCounts;
                input.power_grid_rate = chosenRate;

                const emodeJson = await callWorker('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }));
                if (runId !== planRunId) return;

                const emodePlan = JSON.parse(emodeJson);
                const emodeViable = emodePlan && emodePlan.success && (!planContext?.levelUp || Boolean(emodePlan.level_up));
                if (emodeViable) {
                    bestPlan = emodePlan;
                    finalEmodeCounts = allocatedCounts;
                } else {
                    console.warn('Emode solve was not viable for level-up or failed; safely keeping basePlan.');
                    bestPlan = basePlan;
                    finalEmodeCounts = {};
                    input.emode_facilities = [];
                    input.emode_facility_counts = {};
                }
            } else {
                bestPlan = basePlan;
                finalEmodeCounts = {};
            }
        } else {
            // E-mode off or RV < 12: single manual solve
            input.emode_facilities = [];
            input.emode_facility_counts = {};
            input.power_grid_rate = 1.0;

            const bestJson = await callWorker('find_plan', JSON.stringify({ ...input, aniimo: bestSetup }), (count) => {
                if (typeof count === 'object') {
                    setStep(count.step, count.state, undefined, count.proven);
                    return;
                }
                setStep('backup', 'start', `trial ${count}`);
                progressBar.style.display = 'block';
                progressFill.style.width = `${trialCountToPercent(count)}%`;
            });
            progressFill.style.width = '100%';
            if (runId !== planRunId) return;
            bestPlan = JSON.parse(bestJson);
            finalEmodeCounts = {};
        }

        // STEP 4: Tự động loại bỏ các nguyên liệu thô/phụ có tỷ lệ doanh thu <= 2% (như Thạch hương, Ngôi sao, Muối biển khi không dùng)
        // để giải phóng công nhân Aniimo và tránh đề xuất cơ sở sản xuất thô lãng phí nhân lực.
        // Chạy multi-pass (tối đa 3 vòng) để triệt tiêu các nguyên liệu thô bị thừa sau khi chuỗi cấp cao bị cắt đứt.
        // Ngoại lệ: Gạo xay/gạo xát (milled_rice) từ Cối xay Carousel là sản phẩm chế biến từ lúa nước dôi dư, đem bán là hợp lệ nên luôn giữ lại.
        if (bestPlan && bestPlan.success && bestPlan.income_streams && bestPlan.rate_per_second > 0) {
            const userPicks = new Set([
                ...(unlockedSpecial || []),
                ...(selectedSeasonDishes || []),
                ...activePriorities()
            ]);

            // Nếu Lễ hội Trung Thu đang bật và có món cần Muối biển hoặc Kẹo đá, bảo vệ chúng khỏi auto-pruning
            if (seasonActive()) {
                if (selectedSeasonDishes.has('roasted_waxing_moon_pepper') || selectedSeasonDishes.has('harvest_platter') || selectedSeasonDishes.has('umbral_sweet_and_spicy_sauce')) {
                    userPicks.add('sea_salt');
                    userPicks.add('quick_sea_salt');
                }
                if (selectedSeasonDishes.has('moondew_radish_slices') || selectedSeasonDishes.has('harvest_platter')) {
                    userPicks.add('rock_candy');
                    userPicks.add('quick_rock_candy');
                    userPicks.add('sugarcane');
                    userPicks.add('fresh_water');
                    userPicks.add('quick_fresh_water');
                }
                if (selectedSeasonDishes.has('umbral_hot_pot')) {
                    userPicks.add('fresh_water');
                    userPicks.add('quick_fresh_water');
                }
            }

            const RAW_ANIIMO_MATERIALS = new Set([
                'aromathyst', 'quick_aromathyst',
                'star', 'quick_star',
                'sea_salt', 'quick_sea_salt', 'pearl',
                'wool', 'quick_wool', 'petals',
                'scales', 'quick_scales'
            ]);

            const shouldPruneItem = (itemName, share) => {
                const baseName = itemName.replace(/^quick_/, '');
                if (userPicks.has(itemName) || userPicks.has(baseName)) return false;

                // Gạo xát (milled_rice) là sản phẩm chế biến từ lúa nước dư thừa của cối xay, giữ lại dù <= 2%
                if (baseName === 'milled_rice') return false;

                // Chỉ prune nguyên liệu thô từ cơ sở Aniimo Materials bán trực tiếp <= 2% (Thạch hương, Ngôi sao, Muối biển khi không dùng)
                // để tránh đề xuất xây dựng cơ sở thô lãng phí nhân lực và đất.
                if (RAW_ANIIMO_MATERIALS.has(itemName) || RAW_ANIIMO_MATERIALS.has(baseName)) {
                    return share <= 0.02;
                }

                // Tuyệt đối KHÔNG prune bừa bãi các sản phẩm chế biến dôi dư (nhân sâm khô, bột nhân sâm...)
                // vì chúng là mắt xích của các chuỗi chế biến cao cấp mà solver đang vận hành.
                return false;
            };

            for (let pass = 1; pass <= 3; pass++) {
                const totalRate = bestPlan.rate_per_second;
                if (!totalRate || totalRate <= 0) break;

                const lowShareItems = [];
                for (const stream of (bestPlan.income_streams || [])) {
                    const share = stream.rate_per_second / totalRate;
                    if (shouldPruneItem(stream.item_name, share)) {
                        const baseName = stream.item_name.replace(/^quick_/, '');
                        lowShareItems.push(stream.item_name);
                        lowShareItems.push(baseName);
                        lowShareItems.push(`quick_${baseName}`);
                    }
                }

                const uniqueToPrune = [...new Set(lowShareItems)].filter(x => !(input.exclude || []).includes(x));
                if (uniqueToPrune.length === 0) break;

                const newExclusions = [...new Set([...(input.exclude || []), ...uniqueToPrune])];
                const prunedInput = { ...input, exclude: newExclusions };

                const prunedJson = await callWorker('find_plan', JSON.stringify({ ...prunedInput, aniimo: bestSetup }));
                if (runId !== planRunId) return;

                const prunedPlan = JSON.parse(prunedJson);
                // Kiểm tra: Kế hoạch mới phải khả thi, bảo toàn level-up (nếu có) và không làm mất bất kỳ món đặc biệt nào mà user đã tích chọn
                const keepsUserSelections = [...(unlockedSpecial || [])].every(spec =>
                    (prunedPlan?.income_streams || []).some(s => s.item_name === spec || s.item_name.replace(/^quick_/, '') === spec)
                );
                const prunedViable = prunedPlan && prunedPlan.success && (!planContext?.levelUp || Boolean(prunedPlan.level_up)) && keepsUserSelections;
                if (prunedViable) {
                    bestPlan = prunedPlan;
                    input.exclude = newExclusions;
                } else {
                    break;
                }
            }
        }

        bestPlan = integrateSeasonPlan(bestPlan);

        lastEmodeCounts = finalEmodeCounts;
        lastPlanInput = input;
        finishSolveSteps();
        plansBySetup[bestSetup] = bestPlan;
        showSelectedPlan();
        updatePowerGauge(finalEmodeCounts);
        // With no plan there's nothing to lay out or improve on.
        const effectiveSuccess = plansBySetup[bestSetup].success && (!planContext?.levelUp || plansBySetup[bestSetup].level_up);
        if (!effectiveSuccess && progress) {
            progress.steps.forEach(s => { if ((s.key === 'layout' || s.key === 'improve') && s.state === 'pending') s.state = 'skipped'; });
            renderProgress();
        }

        // The Minimum setup solves after Best is already on screen; switching to it before it's
        // done shows a short "still working" note until it arrives.
        setStep('minimum', 'start');
        callWorker('find_plan', JSON.stringify({ ...input, aniimo: 'minimum' }))
            .then(json => {
                if (runId !== planRunId) return;
                setStep('minimum', 'done');
                plansBySetup.minimum = integrateSeasonPlan(JSON.parse(json));
                if (selectedAniimoSetup() === 'minimum') showSelectedPlan();
            })
            .catch(error => {
                if (runId !== planRunId) return;
                setStep('minimum', 'fail');
                console.error('Minimum Aniimo plan failed:', error);
                plansBySetup.minimum = { success: false, error: `The Minimum team plan failed: ${error.message}` };
                if (selectedAniimoSetup() === 'minimum') showSelectedPlan();
            });
    } catch (error) {
        // A run a newer one cancelled leaves the screen to it.
        if (runId !== planRunId) return;
        if (progress) {
            progress.steps.forEach(s => { if (s.state === 'running') s.state = 'fail'; else if (s.state === 'pending') s.state = 'skipped'; });
            renderProgress();
        }
        console.error('Plan calculation error:', error);
        lastPlan = null;
        showError(`Plan calculation failed: ${error.message}`);
    } finally {
        if (runId !== planRunId) return;
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        progressBar.style.display = 'none';
        progressCaption.style.display = 'none';
        progressFill.classList.remove('indeterminate');
    }
}

// Compute time-to-goal against the already-computed `lastPlan`; cheap, safe to call on every
// keystroke of the goal-amount fields. No-op until a plan exists.
async function runTimeToGoal() {
    if (!lastPlan || !lastPlan.success || planContext?.levelUp) return;
    const rows = priorityRows(lastPlan);
    const chosen = rows.find(r => r.target === document.getElementById('goal-target').value) || rows[0];
    const name = goalName(chosen);
    document.getElementById('target-amount-label').textContent = `Target ${name}`;
    document.getElementById('current-amount-label').textContent = `Current ${name}`;
    document.getElementById('amount-produced-label').textContent = `${name} produced`;

    const target = floatOrDefault(document.getElementById('target-amount').value, 0);
    const current = floatOrDefault(document.getElementById('current-amount').value, 0);

    if (chosen.target === 'coins') {
        // Coins account for each product's start-up delay and list what's sold along the way.
        try {
            const resultJson = await callWorker('time_to_reach', JSON.stringify({ plan: lastPlan, target, current }));
            const result = JSON.parse(resultJson);
            displayGoal(result);
            renderGoalAlso(rows, chosen, result.success ? result.total_time_seconds : null, result);
        } catch (error) {
            console.error('Goal calculation error:', error);
        }
        return;
    }
    // Anything else waits on each item's first batch too (see `madeBy`). The breakdown covers
    // that long.
    const needed = Math.max(0, target - current);
    const seconds = needed <= 0 ? 0 : chosen.perSecond <= 1e-12 ? null : timeToMake(chosen, needed);
    if (seconds === null) {
        lastGoalResult = null;
        document.getElementById('total-time').textContent = chosen.missing || 'Not made by this plan';
        document.getElementById('amount-produced').textContent = '-';
        document.getElementById('product-breakdown-section').style.display = 'none';
        document.getElementById('seeds-needed-section').style.display = 'none';
        renderGoalAlso(rows, chosen, null);
        return;
    }
    try {
        const result = JSON.parse(await callWorker('time_to_reach', JSON.stringify({ plan: lastPlan, seconds })));
        displayGoal(result);
        document.getElementById('amount-produced').textContent = formatNumber(Math.round(needed));
        renderGoalAlso(rows, chosen, seconds, result);
    } catch (error) {
        console.error('Goal calculation error:', error);
    }
}

// How much of a rates row the plan has made after `seconds`: each item counts from its first batch
// on (see `production_over` in optimizer.rs, which does the same for Home Coins). Season points
// not ranked as a priority come from the income streams, which carry each item's points.
function madeBy(row, seconds) {
    const streams = row.streams?.length ? row.streams
        : row.target === 'season_points'
            ? (lastPlan?.income_streams || []).map(s => [(s.points || 0) * s.units_per_second, s.lead_time_seconds])
            : [[row.perSecond, 0]];
    return streams.reduce((sum, [rate, lead]) => sum + rate * Math.max(0, seconds - lead), 0);
}

// Seconds until the plan has made `needed` of a rates row, or null if it never does.
function timeToMake(row, needed) {
    let lo = 0;
    let hi = 3600;
    while (madeBy(row, hi) < needed) {
        hi *= 2;
        if (hi > 1e10) return null;
    }
    for (let i = 0; i < 100; i++) {
        const mid = (lo + hi) / 2;
        if (madeBy(row, mid) >= needed) hi = mid; else lo = mid;
    }
    return hi;
}

// What else the plan makes by the time the goal is met, e.g. "4.6M Home Coins, 39 Aniipod Mega",
// each counted from its first batch as the goal itself is.
function renderGoalAlso(rows, chosen, seconds, result) {
    const el = document.getElementById('goal-also');
    const made = r => r.target === 'coins' && result?.success ? result.amount_produced : madeBy(r, seconds);
    const also = seconds > 0
        ? rows.filter(r => r !== chosen && r.perSecond > 1e-12)
            .map(r => `${formatNumber(Math.floor(made(r)))} ${goalName(r)}`)
        : [];
    el.style.display = also.length ? 'block' : 'none';
    el.innerHTML = also.length ? `<span>By then you'll also have:</span> <strong>${also.join(', ')}</strong>` : '';
}

// --- Facility recipe reference modal ----------------------------------------------------
// A static reference table of every recipe in the game data, grouped by facility. Unlike the
// facility input cards, this isn't tied to owned facility counts or levels; it just lists what's
// possible to unlock. Recipe data comes from `get_all_items()` (see wasm.rs), which dumps every
// `ProductionItem` unfiltered.

const RECIPE_MODULE_LABELS = {
    ecological_module: 'Ecological Module',
    kitchen_module: 'Kitchen Module',
    resource_detector: 'Resource Detector',
    crafting_module: 'Crafting Module',
};

const VI_JOB_STEPS = {
    'Sowing': 'Gieo hạt',
    'Watering': 'Tưới nước',
    'Reaping': 'Thu hoạch',
    'Logging': 'Đốn gỗ',
    'Collecting': 'Thu thập'
};

const VI_PERSONALITIES = {
    'Instinctive': 'Bản năng',
    'Practical': 'Thực tế',
    'Energetic': 'Nhiệt huyết',
    'Nimble': 'Nhanh nhẹn',
    'Faithful': 'Trung thành',
    'Tenacious': 'Kiên trì',
    'Playful': 'Nghịch ngợm',
    'Judicious': 'Cẩn trọng'
};

// Cached after the first render, since the underlying data never changes for a given wasm build.
let recipesRendered = false;

// Mirrors the Rust `format_time` helper in wasm.rs (hours/minutes/seconds, dropping leading
// zero units) so times read the same way here as they would in-game.
function formatRecipeTime(seconds) {
    const total = Math.round(seconds);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
}

function formatRecipeInputs(recipe) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (recipe.raw_materials && recipe.raw_materials.length > 0) {
        const amounts = recipe.required_amount || [];
        return recipe.raw_materials
            .map((mat, i) => `${amounts[i] ?? '?'}× ${prettyItem(mat)}`)
            .join(', ');
    }
    if (recipe.cost && recipe.cost > 0) {
        return isVi ? `Chi phí hạt: ${recipe.cost} Home Coin` : `Plant cost: ${recipe.cost}`;
    }
    return '-';
}

function formatRecipeYield(recipe) {
    let text = `${recipe.yield_amount}`;
    if (recipe.byproduct) {
        const [name, amount] = recipe.byproduct;
        text += ` <span class="hint small">(+${amount} ${prettyItem(name)})</span>`;
    }
    return text;
}

// "Fire Lv.2+, best Lv.4 Practical": the minimum ability level a recipe accepts, then the best
// Aniimo for it. Crops and trees list the ability of each job (sowing, reaping and so on).
function formatRecipeAniimo(recipe, facility) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (!recipe.aniimo) {
        const jobs = [];
        (recipe.jobs || []).forEach(job => {
            const last = jobs[jobs.length - 1];
            // Watering is listed once per time it happens; show it as one job done twice.
            if (last && last.job[0] === job[0]) last.times += 1;
            else jobs.push({ job, times: 1 });
        });
        if (jobs.length === 0) return '-';
        return `<span class="job-list">${jobs.map(({ job: [step, ability, level], times }) => {
            const stepName = isVi && VI_JOB_STEPS[step] ? VI_JOB_STEPS[step] : step;
            return `<span class="job"><span class="job-step">${stepName}${times > 1 ? ` &times;${times}` : ''}</span> ${abilityTag(ability)}${level > 1 ? ` Lv.${level}+` : ''}</span>`;
        }).join('')}</span>`;
    }
    const [ability, minLevel] = recipe.aniimo;
    const persName = facility.personality ? (isVi && VI_PERSONALITIES[facility.personality] ? VI_PERSONALITIES[facility.personality] : facility.personality) : '';
    const best = isVi
        ? `Tối ưu Lv.${bestAniimoLevel(ability)}${persName ? ' ' + persName : ''}`
        : `best Lv.${bestAniimoLevel(ability)}${facility.personality ? ' ' + facility.personality : ''}`;
    return `<span>${abilityTag(ability)} Lv.${minLevel}+<span class="recipe-best">${best}</span></span>`;
}

// "44 Home Coins", or what a level-up material is for.
function formatRecipeSell(recipe) {
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (recipe.sell_currency === 'none') return `<span class="hint small">${isVi ? 'Nâng cấp RV' : 'RV level-ups'}</span>`;
    return `${formatNumber(recipe.sell_value)} ${recipe.sell_value === 1 ? 'Home Coin' : 'Home Coins'}`;
}

function formatRecipeModule(recipe) {
    if (!recipe.module_requirement) return '-';
    const [name, level] = recipe.module_requirement;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const label = (isVi && window.VI_MODULE_NAMES && window.VI_MODULE_NAMES[name]) || RECIPE_MODULE_LABELS[name] || name;
    return `${label} Lv.${level}`;
}

// Renders one table per facility (grouped into category sections, same grouping/order as the
// facility input cards), each listing every recipe available at that facility sorted by required
// level then name.
function renderRecipeTables(recipes) {
    const container = document.getElementById('facilities-modal-container');
    const isVi = window.i18n && window.i18n.getLang() === 'vi';

    const VI_CATEGORIES = {
        'Materials': 'Nguyên liệu',
        'Environment': 'Cơ sở môi trường',
        'Aniimo Materials': 'Nguyên liệu Aniimo',
        'Wood & Ore Processing': 'Sản xuất gỗ và gạch quặng',
        'Materials Processing': 'Cơ sở chế biến'
    };

    const thItem = isVi ? 'Vật phẩm' : 'Item';
    const thLevel = isVi ? 'Cấp' : 'Level';
    const thInputs = isVi ? 'Nguyên liệu' : 'Inputs';
    const thYield = isVi ? 'Sản lượng' : 'Yield';
    const thTime = isVi ? 'Thời gian' : 'Time';
    const thSell = isVi ? 'Giá bán' : 'Sell';
    const thModule = isVi ? 'Mô-đun' : 'Module';
    const thAniimo = isVi ? 'Aniimo' : 'Aniimo';
    const tipTime = isVi
        ? 'Thời gian phát triển của cây trồng và cây lấy gỗ (mỗi lần tưới nước giảm 1/8 thời gian còn lại, tối đa 2 lần). Với các xưởng chế biến và cơ sở thu thập, thời gian hiển thị khối lượng công việc (Workload): ở 100% Hiệu suất, máy hoàn thành 1 khối lượng công việc/giây. Với Chế độ điện (⚡ E-mode), máy tự vận hành theo thời gian cơ bản mà không cần Aniimo.'
        : 'Grow time for crops and trees, before watering takes an eighth off it twice. Everything else lists workload: at 100% Efficiency a processor gets through one workload a second, a gathering facility 1.25 on a level-2 recipe and 1.5 on a level-3 one. An Aniimo at the level a recipe needs works at 100%; higher levels are faster, up to level 4. E-mode runs without Aniimo workers.';
    const tipAniimo = isVi
        ? 'Cấp độ kỹ năng tối thiểu để chế tạo, cùng với Aniimo tối ưu nhất (Lv.4 với tính cách tương thích tăng +20% tốc độ). Đối với cây trồng/lâm nghiệp, hiển thị kỹ năng cần cho từng công đoạn (Gieo hạt, Tưới nước, Thu hoạch...).'
        : 'The lowest ability level that can make this, and the best Aniimo for it: level 4, the top, with the facility\'s personality (+20% speed). For crops and trees, the ability each job needs, in order.';

    const byFacility = new Map();
    recipes.forEach(r => {
        if (!byFacility.has(r.facility)) byFacility.set(r.facility, []);
        byFacility.get(r.facility).push(r);
    });
    byFacility.forEach(list => {
        list.sort((a, b) => a.facility_level - b.facility_level || a.name.localeCompare(b.name));
    });

    container.innerHTML = FACILITY_CATEGORIES.map(category => {
        const facilitiesInCategory = FACILITIES.filter(f => f.category === category && byFacility.has(f.name));
        if (facilitiesInCategory.length === 0) return '';
        const catTitle = isVi && VI_CATEGORIES[category] ? VI_CATEGORIES[category] : category;

        const tables = facilitiesInCategory.map(f => {
            // `data-label` names each cell when rows stack on phones; empty cells are left out there.
            const cell = (label, value) => `<td data-label="${label}"${value === '-' ? ' class="empty"' : ''}>${value}</td>`;
            const rows = byFacility.get(f.name).map(r => `
                <tr${r.verified === false ? ' class="unverified"' : ''}>
                    <td class="recipe-name">${prettyItem(r.name)}${SPECIAL_NAMES.has(r.name) ? ` <span class="tag special" title="${isVi ? 'Cần tiền tệ hiếm để mở khóa' : 'Takes a rare currency to unlock'}">${isVi ? 'đặc biệt' : 'special'}</span>` : ''}${r.season ? ` <span class="tag special" title="${SEASON.name} only">${isVi ? 'mùa vụ' : 'season'}</span>` : ''}${r.verified === false ? ` <span class="info-icon" data-tooltip="${isVi ? 'Chưa kiểm chứng trong game' : 'Not yet checked in game.'}">?</span>` : ''}</td>
                    ${cell(thLevel, r.facility_level)}
                    ${cell(thInputs, formatRecipeInputs(r))}
                    ${cell(thYield, formatRecipeYield(r))}
                    ${cell(thTime, r.workload ? `${r.workload} workload${r.emode_base_time ? ` <span class="tag emode-tag-small" title="${isVi ? 'Thời gian gốc Chế độ điện: ' : 'E-mode base time: '}${formatRecipeTime(r.emode_base_time)}">⚡${formatRecipeTime(r.emode_base_time)}</span>` : ''}` : formatRecipeTime(r.production_time))}
                    ${cell(thSell, formatRecipeSell(r))}
                    ${cell(thModule, formatRecipeModule(r))}
                    ${cell(thAniimo, formatRecipeAniimo(r, f))}
                </tr>
            `).join('');

            return `
                <div class="facility-recipe-table">
                    <h4>${getFacilityDisplayName(f.name)}</h4>
                    <div class="table-wrapper">
                        <table class="recipe-table">
                            <thead>
                                <tr>
                                    <th>${thItem}</th>
                                    <th>${thLevel}</th>
                                    <th>${thInputs}</th>
                                    <th>${thYield}</th>
                                    <th>${thTime} <span class="info-icon" data-tooltip="${tipTime}">?</span></th>
                                    <th>${thSell}</th>
                                    <th>${thModule}</th>
                                    <th>${thAniimo} <span class="info-icon" data-tooltip="${tipAniimo}">?</span></th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="facility-category">
                <h4 class="facility-category-title">${catTitle}</h4>
                ${tables}
            </div>
        `;
    }).join('');
}

window.showFacilities = async function () {
    document.getElementById('facilitiesModal').classList.add('show');
    if (recipesRendered) return;
    if (!wasmReady) {
        document.getElementById('facilities-loading-hint').textContent = 'Optimizer not ready. Please wait...';
        return;
    }
    try {
        const recipesJson = await callWorker('get_all_items');
        const recipes = JSON.parse(recipesJson);
        renderRecipeTables(recipes);
        recipesRendered = true;
        document.getElementById('facilities-loading-hint').style.display = 'none';
    } catch (error) {
        console.error('Failed to load recipe data:', error);
        document.getElementById('facilities-loading-hint').textContent = 'Failed to load recipe data. Please refresh the page.';
    }
}

window.closeFacilities = function () {
    document.getElementById('facilitiesModal').classList.remove('show');
}

window.closeFacilitiesOnBackdrop = function (event) {
    if (event.target.id === 'facilitiesModal') {
        closeFacilities();
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
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
    attachLayoutHandlers();
    attachPriorityHandlers();
    showAniimoSetup();
    applyConfigMode();
    updateSimpleEmodeState();
    initWasm();

    document.getElementById('optimize-btn').addEventListener('click', runFindPlan);
    document.getElementById('clear-saved-btn').addEventListener('click', clearSavedInputs);
    document.getElementById('rate-unit').addEventListener('change', () => {
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
    const setupPanel = document.getElementById('aniimo-setup-panel');
    if (setupPanel) {
        setupPanel.addEventListener('change', event => {
            const { name, value, checked } = event.target;
            const unheardOf = event.target.dataset?.confirm;
            if (unheardOf && checked) {
                const ok = window.confirm(
                    `No level-${value} ${unheardOf} Aniimo is known in the game yet. Plan as though you have one?`
                );
                if (!ok) {
                    showAniimoSetup();
                    return;
                }
            }
            if (name?.startsWith('level-')) {
                aniimoLevels[name.slice('level-'.length)] = Number(value);
            } else {
                return;
            }
            saveInputsToStorage();
            switchAniimoSetup();
        });
    }

    // Goal fields update live; no need to re-run the facility-allocation solve just because the
    // goal amount changed.
    document.getElementById('target-amount').addEventListener('input', runTimeToGoal);
    document.getElementById('current-amount').addEventListener('input', runTimeToGoal);
    document.getElementById('goal-target').addEventListener('change', runTimeToGoal);

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
});

// --- Hover tips --------------------------------------------------------------------------
// One card for hover tips, shown at once instead of after the browser's delay. Diagram pieces
// carry `data-tip` (see `tipAttrs`); anything else with a `title` shows it in the same card, the
// title moved aside so the browser's own tip doesn't show as well. (The info icons' `data-tooltip`
// is a CSS tip of its own; see style.css.)
const tipCard = document.createElement('div');
tipCard.className = 'tip-card';
tipCard.setAttribute('role', 'tooltip');
tipCard.hidden = true;
document.body.appendChild(tipCard);
let tipTarget = null;
const TIP_SELECTOR = '[data-tip], [data-tip-text], [title]';

// The attributes for a diagram piece's tip: its name, then what it's doing and its numbers.
function tipAttrs(title, { detail = '', stats = '', color = '' } = {}) {
    const attr = (name, value) => value ? ` ${name}="${escapeText(value)}"` : '';
    const label = [title, detail, stats].filter(Boolean).join(', ');
    return `data-tip="${escapeText(title)}"${attr('data-tip-detail', detail)}${attr('data-tip-stats', stats)}${attr('data-tip-color', color)} aria-label="${escapeText(label)}"`;
}

function showTip(el) {
    // A title set since the last hover replaces the one kept aside.
    if (el.hasAttribute('title')) {
        const text = el.getAttribute('title');
        el.removeAttribute('title');
        el.dataset.tipText = text;
        if (!el.hasAttribute('aria-label')) el.setAttribute('aria-description', text);
    }
    if (!el.dataset.tip && !el.dataset.tipText) return hideTip();
    const line = (className, text) => {
        const div = document.createElement('div');
        div.className = className;
        div.textContent = text;
        return tipCard.appendChild(div);
    };
    tipCard.replaceChildren();
    tipCard.classList.toggle('has-swatch', !!el.dataset.tipColor);
    if (el.dataset.tip) {
        const title = line('tip-title', el.dataset.tip);
        if (el.dataset.tipColor) {
            const swatch = document.createElement('span');
            swatch.className = 'tip-swatch';
            swatch.style.background = el.dataset.tipColor;
            title.prepend(swatch);
        }
        if (el.dataset.tipDetail) line('tip-detail', el.dataset.tipDetail);
        if (el.dataset.tipStats) line('tip-stats', el.dataset.tipStats);
    } else {
        line('tip-text', el.dataset.tipText);
    }
    tipTarget = el;
    tipCard.hidden = false;
}

function hideTip() {
    tipTarget = null;
    tipCard.hidden = true;
}

// Above the point, centered on it and kept on screen; below it where there's no room above.
function placeTip(x, y, below = y) {
    const margin = 12;
    const { width, height } = tipCard.getBoundingClientRect();
    const left = Math.min(Math.max(margin, x - width / 2), window.innerWidth - width - margin);
    const top = y - height - 14 >= margin ? y - height - 14 : Math.min(below + 18, window.innerHeight - height - margin);
    tipCard.style.left = `${left}px`;
    tipCard.style.top = `${top}px`;
}

document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.(TIP_SELECTOR);
    if (!el) return hideTip();
    if (el !== tipTarget || el.hasAttribute('title')) showTip(el);
    if (tipTarget) placeTip(e.clientX, e.clientY);
});
document.addEventListener('pointermove', (e) => {
    if (!tipTarget) return;
    if (!tipTarget.isConnected) return hideTip();
    placeTip(e.clientX, e.clientY);
}, { passive: true });
// A tap's tip stays until the next tap; a mouse's goes when it leaves.
document.addEventListener('pointerout', (e) => {
    if (e.pointerType !== 'touch' && tipTarget && !tipTarget.contains(e.relatedTarget)) hideTip();
});
document.addEventListener('focusin', (e) => {
    const el = e.target.closest?.(TIP_SELECTOR);
    if (!el || !e.target.matches(':focus-visible')) return;
    showTip(el);
    const box = el.getBoundingClientRect();
    if (tipTarget) placeTip(box.left + box.width / 2, box.top, box.bottom);
});
document.addEventListener('focusout', hideTip);
window.addEventListener('scroll', hideTip, { passive: true, capture: true });


// Dynamically generates the "Why this Plan? & Insights" rationale in the right sidebar
function renderInsights(plan) {
    const container = document.getElementById('insights-content');
    if (!container) return;
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    if (!plan || !plan.success) {
        container.innerHTML = `<p class="hint">${isVi ? 'Chưa có kế hoạch được tính toán. Nhấn "Tìm kế hoạch tối ưu" để xem phân tích chuyên sâu.' : 'No plan calculated yet. Click "Generate the best plan" to see optimization insights.'}</p>`;
        return;
    }

    const producing = (plan.coin_items || []).filter(s => s.status === 'producing');

    // 1. Real top revenue streams from plan.income_streams (sorted by rate_per_second descending)
    const streams = (plan.income_streams || []).filter(s => (s.units_per_second || 0) > 0);
    const sortedStreams = [...streams].sort((a, b) => (b.rate_per_second || 0) - (a.rate_per_second || 0));
    const totalCoinRate = plan.rate_per_second || 0;
    const totalHourlyCoins = Math.round(totalCoinRate * 3600);
    const unitRateDisplay = formatRate(totalCoinRate);

    const top1 = sortedStreams[0];
    const top2 = sortedStreams[1];

    const top1Name = top1 ? prettyItem(top1.item_name) : (isVi ? 'Sản phẩm chủ lực' : 'Core Product');
    const top1Hourly = top1 ? Math.round(top1.rate_per_second * 3600) : 0;
    const top1Pct = totalHourlyCoins > 0 ? Math.round((top1Hourly / totalHourlyCoins) * 100) : 0;
    const top1FacilityRaw = top1?.facility ? top1.facility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '') : '';
    const top1Facility = getFacilityDisplayName(top1FacilityRaw);
    const top1UnitsPerHour = top1 ? perHour(top1.units_per_second) : '0';

    const top2Name = top2 ? prettyItem(top2.item_name) : '';
    const top2Hourly = top2 ? Math.round(top2.rate_per_second * 3600) : 0;
    const top2Pct = totalHourlyCoins > 0 ? Math.round((top2Hourly / totalHourlyCoins) * 100) : 0;
    const top2FacilityRaw = top2?.facility ? top2.facility.replace(/ \(Manual\)$/, '').replace(/ \(Electric\)$/, '') : '';
    const top2Facility = getFacilityDisplayName(top2FacilityRaw);

    const homeLevel = selectedHomeLevel();
    const { facilities: setupFacilities } = simpleSetup(homeLevel);
    const woodlandTier = setupFacilities['Woodland']?.[0]?.level || 1;

    // Wood block yield by Woodland facility tier (from data/woodland.csv byproduct_yield)
    const WOOD_YIELDS_BY_TIER = { 1: 1, 2: 8, 3: 21, 4: 47, 5: 75, 6: 122 };
    const maxYieldPerTree = WOOD_YIELDS_BY_TIER[woodlandTier] || 47;
    const lowerTierMaxYield = WOOD_YIELDS_BY_TIER[woodlandTier - 1] || 1;

    // Lower tier tree examples by current woodland tier
    const lowerTierTreesExampleVi = {
        2: 'Liễu',
        3: 'Liễu, Tre, Chanh',
        4: 'Liễu, Tre, Anh đào, Táo',
        5: 'Liễu, Tre, Hạt dẻ, Quả óc chó',
        6: 'Liễu, Tre, Cao su, Cây dừa'
    }[woodlandTier] || 'Liễu, Tre';

    const lowerTierTreesExampleEn = {
        2: 'Willow',
        3: 'Willow, Bamboo, Lemon',
        4: 'Willow, Bamboo, Cherry Blossom, Apple',
        5: 'Willow, Bamboo, Chestnut, Walnut',
        6: 'Willow, Bamboo, Rubber, Coconut'
    }[woodlandTier] || 'Willow, Bamboo';

    // 2. Farmland distribution
    const farmSteps = producing.filter(s => s.facility === 'Farmland');
    const farmPlotsByCrop = {};
    for (const s of farmSteps) {
        if (s.item_name) {
            farmPlotsByCrop[s.item_name] = (farmPlotsByCrop[s.item_name] || 0) + (s.facility_count || 1);
        }
    }
    const farmSummaryParts = Object.entries(farmPlotsByCrop).map(([crop, count]) => `${count} ô ${prettyItem(crop)}`);
    const farmSummary = farmSummaryParts.join(', ') || (isVi ? 'Đất nông nghiệp' : 'Farmland');

    // 3. Woodland distribution
    const woodlandSteps = producing.filter(s => s.facility === 'Woodland');
    const woodlandPlotsByCrop = {};
    for (const s of woodlandSteps) {
        if (s.item_name) {
            woodlandPlotsByCrop[s.item_name] = (woodlandPlotsByCrop[s.item_name] || 0) + (s.facility_count || 1);
        }
    }
    const woodlandSummaryParts = Object.entries(woodlandPlotsByCrop).map(([crop, count]) => `${count} cây ${prettyItem(crop)}`);
    const woodlandSummary = woodlandSummaryParts.join(', ');
    const totalTrees = Object.values(woodlandPlotsByCrop).reduce((sum, n) => sum + n, 0);
    const totalHourlyWood = totalTrees * maxYieldPerTree * 2; // 2 harvests/hr with watering

    // 4. Level-up context
    const hasLevelUp = !!(plan.level_up && planContext?.levelUp);
    const targetRv = planContext?.target || (plan.level_up ? homeLevel + 1 : null);
    const levelUpReport = plan.level_up;
    const levelUpDurationText = levelUpReport ? formatDuration(levelUpReport.seconds) : '';

    // Identify target RV wood material requirement
    const targetRvReqs = LEVEL_UP_COSTS[targetRv]?.items || [];
    const targetWoodItemEntry = targetRvReqs.find(([name]) =>
        ['wood_block', 'rough_lumber', 'standard_planks', 'laminated_beams', 'densified_timber_component'].includes(name)
    );
    const targetWoodItemKey = targetWoodItemEntry ? targetWoodItemEntry[0] : (targetRv <= 6 ? 'wood_block' : targetRv <= 10 ? 'rough_lumber' : targetRv <= 14 ? 'standard_planks' : targetRv <= 18 ? 'laminated_beams' : 'densified_timber_component');
    const targetWoodItemName = prettyItem(targetWoodItemKey);
    const woodCostRow = (levelUpReport?.requirements || []).find(r => r.name === targetWoodItemKey || r.name.includes(targetWoodItemKey));
    const woodItemHourly = woodCostRow ? perHour(woodCostRow.per_second) : '';

    // Check specific items in plan for targeted explanations
    const hasGinseng = Object.keys(farmPlotsByCrop).some(c => c.includes('ginseng'));
    const hasQuickRice = Object.keys(farmPlotsByCrop).some(c => c.includes('quick_rice') || c.includes('rice'));
    const hasWoodland = woodlandSteps.length > 0;

    // CARD 1: Core Profit Driver (What was selected & Why)
    const titleProfit = isVi ? '🎯 Đã chọn: Nguồn lợi nhuận cốt lõi' : '🎯 Selected: Core Profit Drivers';
    const descProfit = isVi
        ? `• <strong>${top1Name}</strong> tại <strong>${top1Facility}</strong> là trụ cột lợi nhuận số 1: sản xuất <strong>${top1UnitsPerHour}/giờ</strong>, đem về <strong>${top1Hourly.toLocaleString()} coin / giờ</strong> (chiếm <strong>${top1Pct}%</strong> tổng doanh thu).<br>` +
        (top2 ? `• <strong>${top2Name}</strong> tại <strong>${top2Facility}</strong> là nguồn thu lớn thứ 2: đem về <strong>${top2Hourly.toLocaleString()} coin / giờ</strong> (${top2Pct}%).<br>` : '') +
        `• <strong>Tổng sản lượng Homeland:</strong> đạt <strong>${totalHourlyCoins.toLocaleString()} coin / giờ</strong> (${unitRateDisplay}).<br>` +
        `<em><strong>Tại sao chọn:</strong> Có tỷ suất lợi nhuận ròng trên nguyên liệu và thời gian gia công cao nhất trong toàn bộ các công thức đã mở khóa tại RV ${homeLevel}.</em>`
        : `• <strong>${top1Name}</strong> at <strong>${top1Facility}</strong> is the #1 profit driver: producing <strong>${top1UnitsPerHour}/hr</strong>, yielding <strong>${top1Hourly.toLocaleString()} coins/hour</strong> (<strong>${top1Pct}%</strong> share).<br>` +
        (top2 ? `• <strong>${top2Name}</strong> at <strong>${top2Facility}</strong> is #2: earning <strong>${top2Hourly.toLocaleString()} coins/hour</strong> (${top2Pct}%).<br>` : '') +
        `• <strong>Total Homeland output:</strong> <strong>${totalHourlyCoins.toLocaleString()} coins/hour</strong> (${unitRateDisplay}).<br>` +
        `<em><strong>Why selected:</strong> Highest net coin yield per processing second and ingredient cost among all unlocked recipes at RV ${homeLevel}.</em>`;

    // CARD 2: Farmland & Supply Chain Strategy (What & Why)
    const titleFarm = isVi ? '🌾 Đã chọn: Chiến lược nông trại & Chuỗi cung ứng' : '🌾 Selected: Farmland & Supply Strategy';
    let descFarm = '';
    const isGinsengPorridgeCore = (top1Name.toLowerCase().includes('cháo') || top1Name.toLowerCase().includes('porridge')) && (top1FacilityRaw.includes('Pot') || top1FacilityRaw.includes('hầm'));
    if (hasGinseng && isGinsengPorridgeCore) {
        const ginsengPlots = farmPlotsByCrop['ginseng'] || farmPlotsByCrop['quick_ginseng'] || 0;
        const ricePlots = farmPlotsByCrop['rice'] || farmPlotsByCrop['quick_rice'] || 0;
        descFarm = isVi
            ? `Bố trí <strong>${farmSummary}</strong>.<br>` +
            `<em><strong>Tại sao chọn:</strong> Nhờ Aniimo tưới nước giảm 25% thời gian sinh trưởng (2 vụ/giờ), các ô Nhân sâm (${ginsengPlots} ô) và Lúa nước (${ricePlots} ô) cung cấp vừa khít nguồn nguyên liệu sạch cho Nồi hầm nấu liên tục <strong>${top1UnitsPerHour} ${top1Name}/giờ</strong>, đồng bộ 100% giữa khâu trồng trọt và khâu chế biến mà không gây ùn ứ hay thiếu hụt nguyên liệu.</em>`
            : `Deployed <strong>${farmSummary}</strong>.<br>` +
            `<em><strong>Why selected:</strong> With Aniimo watering cutting growth time by 25% (2 cycles/hr), Ginseng plots (${ginsengPlots}) and Rice plots (${ricePlots}) provide perfectly synchronized inputs to keep Simmering Pot crafting <strong>${top1UnitsPerHour} ${top1Name}/hr</strong> with zero idle waste.</em>`;
    } else {
        descFarm = isVi
            ? `Bố trí <strong>${farmSummary}</strong>.<br>` +
            `<em><strong>Tại sao chọn:</strong> Chuỗi cây trồng được tối ưu theo thời gian thu hoạch có tưới nước và khả năng hấp thụ nguyên liệu trực tiếp của <strong>${top1Facility}</strong> (${top1UnitsPerHour} ${top1Name}/giờ) cùng các cơ sở chế biến trên đảo.</em>`
            : `Deployed <strong>${farmSummary}</strong>.<br>` +
            `<em><strong>Why selected:</strong> Crop mix calibrated to watered harvest timings and downstream processing throughput at <strong>${top1Facility}</strong> (${top1UnitsPerHour} ${top1Name}/hr).</em>`;
    }

    // CARD 3: Level-up Progression (if applicable)
    let cardLevelUpHtml = '';
    if (hasLevelUp && targetRv) {
        const titleLevelUp = isVi ? `🚀 Đã chọn: Tiến độ nâng cấp RV ${targetRv} & Lâm nghiệp` : `🚀 Selected: RV ${targetRv} Progression & Woodland`;
        const woodRateText = woodItemHourly ? `<strong>${woodItemHourly} ${targetWoodItemName} / giờ</strong>` : `<strong>${targetWoodItemName}</strong>`;
        const descLevelUp = isVi
            ? `Mục tiêu hoàn thành trong <strong>${levelUpDurationText || 'kế hoạch tối ưu'}</strong>.<br>` +
            `• Vườn ươm bố trí <strong>${woodlandSummary || `${totalTrees} cây cấp cao nhất`}</strong>.<br>` +
            `<em><strong>Tại sao chọn:</strong> Khóa Vườn ươm ở cây cấp cao nhất (Cấp ${woodlandTier}) để tối đa hóa <strong>${maxYieldPerTree} Vụn gỗ / cây / vụ</strong> (~${totalHourlyWood.toLocaleString()} vụn gỗ/giờ nhờ 2 vụ/h có tưới nước). Nguồn gỗ này duy trì Bàn mộc ép liên tục ${woodRateText}, giải quyết nút thắt chậm nhất để cán đích RV ${targetRv} sớm nhất.</em>`
            : `Target RV ${targetRv} completion in <strong>${levelUpDurationText || 'optimal time'}</strong>.<br>` +
            `• Woodland deployed with <strong>${woodlandSummary || `${totalTrees} top-tier trees`}</strong>.<br>` +
            `<em><strong>Why selected:</strong> Locked strictly to highest unlocked trees (Tier ${woodlandTier}) for max <strong>${maxYieldPerTree} Wood Blocks/tree/cycle</strong> (~${totalHourlyWood.toLocaleString()} blocks/hr via watered 2 cycles/hr). Feeds Woodworking Bench to craft ${woodRateText}, clearing the longest bottleneck to RV ${targetRv}.</em>`;
        cardLevelUpHtml = `
            <div class="insight-item insight-selected">
                <div class="insight-label">${titleLevelUp}</div>
                <div class="insight-desc">${descLevelUp}</div>
            </div>`;
    }

    // CARD 4: WHY ALTERNATIVES WERE REJECTED (Tailored strictly to current RV)
    const titleRejected = isVi ? '🚫 Tại sao không chọn các phương án khác?' : '🚫 Why Alternatives Were Rejected';
    const rejectedBullets = [];

    // 1. Woodland lower tier rejection (only when woodland is available, level-up is active, and there are lower tiers)
    if (hasWoodland && hasLevelUp && woodlandTier > 1) {
        if (isVi) {
            rejectedBullets.push(`<strong>Không trồng cây cấp thấp ở Vườn ươm:</strong> Cây cấp thấp (${lowerTierTreesExampleVi}...) chỉ cho từ 1 đến ${lowerTierMaxYield} vụn gỗ/ô (thấp hơn nhiều so với ${maxYieldPerTree} vụn gỗ của cây Cấp ${woodlandTier} cao nhất), sẽ làm sụt giảm sản lượng ${targetWoodItemName} và kéo dài thời gian lên RV ${targetRv}.`);
        } else {
            rejectedBullets.push(`<strong>No lower-tier Woodland trees:</strong> Lower-tier trees (${lowerTierTreesExampleEn}...) yield only 1–${lowerTierMaxYield} wood blocks vs ${maxYieldPerTree} from top Tier ${woodlandTier}, severely throttling ${targetWoodItemName} output and delaying RV ${targetRv}.`);
        }
    }

    // 2. Ginseng alternatives (only at RV >= 12 where Ginseng exists, and Ginseng is part of the plan)
    if (homeLevel >= 12 && hasGinseng) {
        if (isVi) {
            rejectedBullets.push(`<strong>Không làm Bột nhân sâm (Ginseng Powder):</strong> 3 sâm thô làm 1 bột sâm bán có lợi nhuận ròng thấp hơn nhiều so với nấu Cháo nhân sâm. Các món chế biến sâu từ bột sâm như Bánh sâm hạt dẻ lại đòi hỏi cây cấp thấp làm giảm sản lượng gỗ.`);
            rejectedBullets.push(`<strong>Không làm Nước nhân sâm số lượng lớn:</strong> Tiêu tốn thêm tài nguyên nước từ Giếng và có tỷ suất lợi nhuận trên thời gian chế biến thấp hơn so với Cháo nhân sâm.`);
        } else {
            rejectedBullets.push(`<strong>No Ginseng Powder:</strong> Selling powder directly yields lower net profit than Porridge, and downstream products like Chestnut Cake require lower-tier trees that hurt wood block yields.`);
            rejectedBullets.push(`<strong>No bulk Ginseng Water:</strong> Consumes scarce well water and has lower coin yield per worker second than Porridge.`);
        }
    }

    // 3. Pearl check: Only applies when Sandcastle Lv.3 (Pearl) is unlocked (RV 13-14) but Crafting Table Lv.6 (Pearl Necklace) is not yet unlocked (RV 15)
    if (homeLevel >= 13 && homeLevel < 15) {
        if (isVi) {
            rejectedBullets.push(`<strong>Không chế ngọc trai (Lâu đài cát):</strong> Chưa mở khóa Bàn chế tạo Lv.6 ở RV 15 để làm Vòng cổ ngọc trai; bán ngọc trai thô giá thấp, thời gian lâu (45 phút) và lãng phí khu vực ấm áp.`);
        } else {
            rejectedBullets.push(`<strong>No Pearls from Sandcastle:</strong> Pearl Necklace requires Crafting Table Lv.6 (unlocked at RV 15); raw pearls have low margins and waste warm aura slots.`);
        }
    }

    // 4. Harvest Moon event dish prioritization (if festival active)
    if (seasonActive() && selectedSeasonDishes.size > 0) {
        if (isVi) {
            rejectedBullets.push(`<strong>Ưu tiên công thức Lễ hội Trung thu:</strong> Khóa các ô nông trại chuyên dụng cho Củ cải và Ớt sự kiện để gom nguyên liệu đổi thưởng mùa vụ, chủ động chấp nhận điều chỉnh nhẹ doanh thu coin thuần túy để hoàn thành nhiệm vụ sự kiện.`);
        } else {
            rejectedBullets.push(`<strong>Prioritizing Harvest Moon dishes:</strong> Dedicated plots reserved for festival crops to farm event rewards, intentionally trading off pure coin optimization for season progression.`);
        }
    }

    // 5. Idle facilities
    const idleCount = (plan.coin_items || []).filter(s => s.status === 'not_needed' || s.status === 'idle').length;
    if (idleCount > 0) {
        if (isVi) {
            rejectedBullets.push(`<strong>Các cơ sở chế biến để trống (${idleCount}):</strong> Bộ giải LP đã loại bỏ các công thức phụ có biên lợi nhuận thấp để dồn trọn vẹn nhân công Aniimo và điện năng cho chuỗi sản phẩm chủ lực.`);
        } else {
            rejectedBullets.push(`<strong>Idle processing facilities (${idleCount}):</strong> The LP simplex solver pruned low-margin secondary recipes to concentrate worker labor and watts on peak-profit drivers.`);
        }
    }

    const descRejected = `<ul class="insight-bullets">${rejectedBullets.map(b => `<li>${b}</li>`).join('')}</ul>`;

    // CARD 5: Power & Logistics
    const titleLogistics = isVi ? '⚡ Vận hành điện lưới & Hậu cần đa kho' : '⚡ Power Grid & Multi-SU Logistics';
    const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
    const emodeMachinesCount = producing
        .filter(s => s.is_emode || (s.facility && s.facility.includes('(Electric)')))
        .reduce((sum, s) => sum + (s.facility_count || 1), 0);
    const emodeActive = emodeMachinesCount > 0 || (lastPlanInput?.emode_facility_counts && Object.values(lastPlanInput.emode_facility_counts).some(c => c > 0));
    let emodeDetail = isVi ? 'Đang vận hành ở Chế độ thủ công tiêu chuẩn với Aniimo.' : 'Operating in Standard Manual Mode.';
    if (emodeActive) {
        const genWatts = getGeneratorCapacity();
        const activeWatts = calculatePowerWatts(lastPlanInput?.emode_facility_counts || {});
        const countDisplay = emodeMachinesCount > 0 ? emodeMachinesCount : Object.values(lastPlanInput?.emode_facility_counts || {}).reduce((a, b) => a + b, 0);
        emodeDetail = isVi
            ? `Đã kích hoạt Chế độ điện trên <strong>${countDisplay} máy móc & cơ sở</strong> (${activeWatts}W / ${genWatts}W), giải phóng Aniimo chuyển sang <strong>Tưới nước nông trại/lâm nghiệp</strong> (giúp tăng 25% tốc độ phát triển toàn đảo).`
            : `Electric Mode active on <strong>${countDisplay} machines & facilities</strong> (${activeWatts}W / ${genWatts}W), freeing Aniimo workers for <strong>island-wide crop watering</strong> (25% faster growth).`;
    }
    const suDetail = isVi
        ? `Homeland bố trí <strong>${suCount} Kho lưu trữ phân tán (SU)</strong> (Nông trại, Xưởng, Trung tâm), giúp giảm ~58% quãng đường di chuyển của Aniimo.`
        : `Homeland deployed with <strong>${suCount} distributed Storage Units</strong>, cutting Aniimo hauling walk-time by ~58%.`;
    const descLogistics = `• ${emodeDetail}<br>• ${suDetail}`;

    container.innerHTML = `
        <div class="insight-item insight-selected">
            <div class="insight-label">${titleProfit}</div>
            <div class="insight-desc">${descProfit}</div>
        </div>
        <div class="insight-item insight-selected">
            <div class="insight-label">${titleFarm}</div>
            <div class="insight-desc">${descFarm}</div>
        </div>
        ${cardLevelUpHtml}
        <div class="insight-item insight-logistics">
            <div class="insight-label">${titleLogistics}</div>
            <div class="insight-desc">${descLogistics}</div>
        </div>
        <div class="insight-item insight-rejected">
            <div class="insight-label">${titleRejected}</div>
            <div class="insight-desc">${descRejected}</div>
        </div>
    `;
}

// React dynamically to language changes without losing state or re-running the solver
window.addEventListener('languageChanged', () => {
    recipesRendered = false;
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
});
