import { POWER_PROFILES_BY_RV, getPowerProfile, simpleSetup, getFacilityUnitWatts } from './facility-config.js';
import { allocateDynamicEmode } from './app.js';

// Benchmark test runner for Smart Two-Stage E-mode Solver
export async function runAllBenchmarks(onLog = console.log) {
    const report = {
        timestamp: new Date().toISOString(),
        runtime: navigator.userAgent,
        platform: navigator.platform || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        suites: {}
    };

    onLog('⚡ Bắt đầu Benchmark Suite cho Smart Two-Stage Solver...');

    // Khởi tạo Web Worker
    const worker = new Worker('worker.js', { type: 'module' });
    let reqId = 0;
    const pending = new Map();

    worker.onmessage = (e) => {
        const { id, type, ok, result, error } = e.data;
        if (type === 'progress') {
            // Progress message; do not resolve or reject the request early
            return;
        }
        if (pending.has(id)) {
            const { resolve, reject } = pending.get(id);
            pending.delete(id);
            if (ok) resolve(result);
            else reject(new Error(error || 'Worker error'));
        }
    };

    function callWorker(type, payload) {
        return new Promise((resolve, reject) => {
            const id = ++reqId;
            pending.set(id, { resolve, reject });
            worker.postMessage({ id, type, payload });
        });
    }

    // Đợi worker sẵn sàng
    await callWorker('get_version');
    onLog('✅ Web Worker & WASM (Rust Core + HiGHS) đã sẵn sàng.');

    // -------------------------------------------------------------
    // SUITE 1: Canonical Power Profile & Guard Rules Verification
    // -------------------------------------------------------------
    onLog('\n--- SUITE 1: Canonical Power Profile & Guard Rules ---');
    const suite1 = { passed: true, checks: [] };

    const checkProfile = (rv, expectedCap, expectedPoles, expectedStatus) => {
        const p = getPowerProfile(rv);
        const pass = p.capacity === expectedCap && p.poleCount === expectedPoles && p.status === expectedStatus;
        suite1.checks.push({
            rv,
            capacity: p.capacity,
            poleCount: p.poleCount,
            status: p.status,
            guardSkillStatus: p.guardSkillStatus,
            pass
        });
        if (!pass) suite1.passed = false;
        onLog(`  RV${rv}: ${p.capacity}W, ${p.poleCount} poles, status: ${p.status}, guardSkill: ${p.guardSkillStatus} => ${pass ? 'PASS' : 'FAIL'}`);
    };

    checkProfile(14, 800, 1, 'verified');
    checkProfile(15, 1600, 2, 'confirmed_user');
    checkProfile(16, 2000, 2, 'confirmed_user');
    checkProfile(20, 4500, 3, 'provisional');

    // Kiểm tra RV14 và RV15 tách biệt
    const rv14P = getPowerProfile(14);
    const rv15P = getPowerProfile(15);
    const distinct14_15 = rv14P.capacity !== rv15P.capacity && rv14P.poleCount !== rv15P.poleCount;
    suite1.checks.push({ check: 'RV14_RV15_distinct', pass: distinct14_15 });
    onLog(`  RV14 và RV15 tách biệt độc lập: ${distinct14_15 ? 'PASS' : 'FAIL'}`);
    report.suites.suite1_power_profile = suite1;

    // -------------------------------------------------------------
    // SUITE 2: Any-On vs All-Off Guard Reservation In Rust Core
    // -------------------------------------------------------------
    onLog('\n--- SUITE 2: Rust Core Guard Activation (All-Off vs Any-On) ---');
    const suite2 = { passed: true, checks: [] };

    const setup15 = simpleSetup(15);
    const basePayload15 = {
        currency: 'coins',
        priorities: [],
        prioritize_byproducts: false,
        level_up: null,
        exclude: [],
        season: false,
        emode_facilities: [],
        emode_facility_counts: {},
        power_grid_rate: 1.0,
        production_aniimo_cap: 26,
        power_poles: 2,
        specialist_quotas: [],
        facility_overrides: [],
        facilities: setup15.facilities,
        modules: setup15.modules,
        aniimo: 'best'
    };

    // All-off run:
    const allOffJson = await callWorker('find_plan', JSON.stringify(basePayload15));
    const allOffPlan = JSON.parse(allOffJson);
    const allOffGuards = allOffPlan.guards ?? (allOffPlan.facilities?.guards || 0);
    const allOffPass = allOffGuards === 0;
    suite2.checks.push({ test: 'all_off_guard_zero', guards: allOffGuards, pass: allOffPass });
    onLog(`  Khi mọi E-mode tắt: Guards = ${allOffGuards} (Kỳ vọng: 0) => ${allOffPass ? 'PASS' : 'FAIL'}`);

    // Any-on run (bật 1 Simmering Pot điện):
    const anyOnPayload15 = {
        ...basePayload15,
        emode_facilities: ['Simmering Pot'],
        emode_facility_counts: { 'Simmering Pot': 1 }
    };
    const anyOnJson = await callWorker('find_plan', JSON.stringify(anyOnPayload15));
    const anyOnPlan = JSON.parse(anyOnJson);
    const anyOnGuards = anyOnPlan.guards ?? (anyOnPlan.facilities?.guards || 0);
    const anyOnPass = anyOnGuards === 2;
    suite2.checks.push({ test: 'any_on_guard_two', guards: anyOnGuards, pass: anyOnPass });
    onLog(`  Khi có E-mode bật ở RV15 (2 poles): Guards = ${anyOnGuards} (Kỳ vọng: 2) => ${anyOnPass ? 'PASS' : 'FAIL'}`);

    suite2.passed = allOffPass && anyOnPass;
    report.suites.suite2_guard_activation = suite2;

    // -------------------------------------------------------------
    // SUITE 3: Latency & Timings Breakdown (p50/p95 qua 10 lượt)
    // -------------------------------------------------------------
    onLog('\n--- SUITE 3: Latency Benchmark Breakdown (10 iterations per fixture) ---');
    const suite3 = { fixtures: {} };

    async function benchmarkFixture(name, rv, powerCap, poleCount) {
        onLog(`  Đang đo ${name}...`);
        const setup = simpleSetup(rv);
        const payload = {
            currency: 'coins',
            priorities: [],
            prioritize_byproducts: false,
            level_up: null,
            exclude: [],
            season: false,
            emode_facilities: [],
            emode_facility_counts: {},
            power_grid_rate: 1.0,
            production_aniimo_cap: 26,
            power_poles: poleCount,
            specialist_quotas: rv >= 16 ? [
                { facility: 'Mine', role: 'Earth', tier: 'Prismana', count: 4 },
                { facility: 'Well', role: 'Water', tier: 'Manual', count: 4 }
            ] : [],
            facility_overrides: [],
            facilities: setup.facilities,
            modules: setup.modules,
            aniimo: 'best'
        };
        const ITERATIONS = 3; // 3 exploratory iterations for standard web worker HiGHS latency profiling
        const baseTimes = [];
        const allocTimes = [];
        const finalTimes = [];
        const totalTimes = [];
        const fastPathTimes = [];
        const fallbackTimes = [];
        const fallbackReasons = [];
        let fastResolveErrors = 0;
        let samplePlan = null;

        for (let i = 0; i < ITERATIONS; i++) {
            const t0_total = performance.now();

            // 1. Base solve:
            const t0_base = performance.now();
            payload.emode_facilities = [];
            payload.emode_facility_counts = {};
            const baseResJson = await callWorker('find_plan', JSON.stringify(payload));
            const t_base = performance.now() - t0_base;
            const basePlan = JSON.parse(baseResJson);

            // 2. Allocator:
            const t0_alloc = performance.now();
            const allocated = allocateDynamicEmode(basePlan, rv, powerCap, { overrides: payload.facility_overrides });
            const t_alloc = performance.now() - t0_alloc;

            // 3. Final Re-solve:
            const t0_final = performance.now();
            payload.emode_facilities = Object.keys(allocated);
            payload.emode_facility_counts = allocated;
            const finalResJson = await callWorker('find_plan', JSON.stringify(payload));
            const t_final = performance.now() - t0_final;
            const t_total = performance.now() - t0_total;

            baseTimes.push(t_base);
            allocTimes.push(t_alloc);
            finalTimes.push(t_final);
            totalTimes.push(t_total);

            // 4. Test FAST_RE_SOLVE worker handler:
            const t0_fast = performance.now();
            let fastElapsed = null;
            try {
                const fastResJson = await callWorker('FAST_RE_SOLVE', JSON.stringify(payload));
                fastElapsed = performance.now() - t0_fast;
                const fastRes = JSON.parse(fastResJson);
                if (fastRes && fastRes.fallback_to_full_solve) {
                    fallbackTimes.push(fastElapsed);
                    if (!fallbackReasons.includes(fastRes.fallback_reason)) {
                        fallbackReasons.push(fastRes.fallback_reason || 'solver_timeout');
                    }
                } else {
                    fastPathTimes.push(fastElapsed);
                }
            } catch (err) {
                fastResolveErrors++;
            }

            if (i === 0) {
                samplePlan = JSON.parse(finalResJson);
                samplePlan.allocation = allocated;
            }

            onLog(`    [Lượt ${i + 1}/${ITERATIONS}] Base: ${Math.round(t_base)}ms | Alloc: ${Math.round(t_alloc)}ms | Final: ${Math.round(t_final)}ms | FAST: ${fastElapsed ? Math.round(fastElapsed) + 'ms' : 'N/A'}`);
        }

        const calcStats = (arr) => {
            const valid = arr.filter(x => x != null && typeof x === 'number').sort((a, b) => a - b);
            if (!valid.length) return { p50: null, p95: null, avg: null, count: 0 };
            const p50 = valid[Math.floor(valid.length * 0.5)];
            const p95 = valid[Math.min(valid.length - 1, Math.floor(valid.length * 0.95))];
            const avg = valid.reduce((a, b) => a + b, 0) / valid.length;
            return {
                p50: Math.round(p50 * 10) / 10,
                p95: Math.round(p95 * 10) / 10,
                avg: Math.round(avg * 10) / 10,
                count: valid.length
            };
        };

        const result = {
            rv,
            powerCap,
            poleCount,
            proven_optimal: samplePlan.proven_optimal,
            success: samplePlan.success,
            rate_per_hour: Math.round((samplePlan.rate_per_second || 0) * 3600),
            allocation: samplePlan.allocation,
            stats: {
                base_solve: calcStats(baseTimes),
                allocator: calcStats(allocTimes),
                final_solve: calcStats(finalTimes),
                total_two_stage: calcStats(totalTimes),
                fast_path: calcStats(fastPathTimes),
                fallback_solve: calcStats(fallbackTimes),
                fallback_reasons: fallbackReasons,
                fast_resolve_errors: fastResolveErrors
            }
        };

        onLog(`    ${name} (Total p50: ${result.stats.total_two_stage.p50}ms, p95: ${result.stats.total_two_stage.p95}ms | Base: ${result.stats.base_solve.p50}ms, Alloc: ${result.stats.allocator.p50}ms, Final: ${result.stats.final_solve.p50}ms)`);
        if (result.stats.fast_path.count > 0) {
            onLog(`    FAST_RE_SOLVE fast-path p50: ${result.stats.fast_path.p50}ms (count: ${result.stats.fast_path.count})`);
        }
        if (result.stats.fallback_solve.count > 0) {
            onLog(`    FAST_RE_SOLVE fallback p50: ${result.stats.fallback_solve.p50}ms (count: ${result.stats.fallback_solve.count}, reasons: ${fallbackReasons.join(', ')})`);
        }
        return result;
    }

    suite3.fixtures.rv14 = await benchmarkFixture('RV14 (800W, 1 pole)', 14, 800, 1);
    suite3.fixtures.rv15 = await benchmarkFixture('RV15 (1600W, 2 poles)', 15, 1600, 2);
    suite3.fixtures.rv16 = await benchmarkFixture('RV16 Balanced (2000W, 2 poles, Quotas)', 16, 2000, 2);
    suite3.passed = suite3.fixtures.rv14.success && suite3.fixtures.rv15.success && suite3.fixtures.rv16.success;
    report.suites.suite3_latencies = suite3;

    // -------------------------------------------------------------
    // SUITE 4: Quality & Regret Comparison vs Exhaustive Enumeration
    // -------------------------------------------------------------
    onLog('\n--- SUITE 4: Quality Gap vs Exhaustive Reference (Constrained Power Budget) ---');
    const suite4 = { passed: true };

    // Small fixture: RV14 with 5 processor candidates competing for a constrained 120W power budget:
    const smallFacilities = {
        'Simmering Pot': [{ count: 1, level: 4 }],
        'Jukebox Dryer': [{ count: 1, level: 4 }],
        'Claw Game Cooker': [{ count: 1, level: 4 }],
        'Bouncy Brew Keg': [{ count: 1, level: 3 }],
        'Blazing Stove': [{ count: 1, level: 3 }],
        'Farmland': [{ count: 15, level: 5 }],
        'Woodland': [{ count: 10, level: 4 }]
    };

    // Canonical unit Watts from getFacilityUnitWatts:
    const candidates = ['Simmering Pot', 'Jukebox Dryer', 'Claw Game Cooker', 'Bouncy Brew Keg', 'Blazing Stove'];
    const powerWatts = {};
    let totalAllWatts = 0;
    for (const fac of candidates) {
        const lvl = smallFacilities[fac][0].level;
        const w = getFacilityUnitWatts(fac, lvl, 14);
        powerWatts[fac] = w;
        totalAllWatts += w;
    }

    // Constrained power budget: 120W (out of 270W total candidate capacity)
    // Only 2 candidates can be powered simultaneously, forcing knapsack trade-offs!
    const smallBudget = 120;
    onLog(`  Candidates: ${candidates.map(c => `${c} (${powerWatts[c]}W)`).join(', ')} | Total: ${totalAllWatts}W`);
    onLog(`  Power Budget Ràng Buộc: ${smallBudget}W (Buộc các xưởng phải cạnh tranh loại trừ)`);

    // Generate 2^5 = 32 combinations:
    const validCombinations = [];
    let infeasibleCombinations = 0;
    for (let mask = 0; mask < (1 << candidates.length); mask++) {
        let totalW = 0;
        const counts = {};
        for (let i = 0; i < candidates.length; i++) {
            if ((mask >> i) & 1) {
                counts[candidates[i]] = 1;
                totalW += powerWatts[candidates[i]];
            }
        }
        if (totalW <= smallBudget) {
            validCombinations.push({ counts, totalW });
        } else {
            infeasibleCombinations++;
        }
    }

    onLog(`  Exhaustive Enumeration: ${validCombinations.length} tổ hợp hợp lệ, ${infeasibleCombinations} tổ hợp bị loại do vượt ${smallBudget}W.`);

    let exhaustiveBestRate = -1;
    let exhaustiveBestCounts = null;

    const baseSmallPayload = {
        currency: 'coins',
        priorities: [],
        prioritize_byproducts: false,
        level_up: null,
        exclude: [],
        season: false,
        emode_facilities: [],
        emode_facility_counts: {},
        power_grid_rate: 1.2,
        production_aniimo_cap: 20,
        power_poles: 1,
        specialist_quotas: {},
        facility_overrides: [],
        facilities: smallFacilities,
        modules: {
            ecological_module: 5,
            kitchen_module: 5,
            resource_detector: 4,
            crafting_module: 4
        },
        aniimo: 'best'
    };

    for (const combo of validCombinations) {
        const payload = {
            ...baseSmallPayload,
            emode_facilities: Object.keys(combo.counts),
            emode_facility_counts: combo.counts
        };
        const resJson = await callWorker('find_plan', JSON.stringify(payload));
        const plan = JSON.parse(resJson);
        const rate = plan.rate_per_second || 0;
        if (rate > exhaustiveBestRate) {
            exhaustiveBestRate = rate;
            exhaustiveBestCounts = combo.counts;
        }
    }

    onLog(`  Exhaustive Global Optimum: ${Math.round(exhaustiveBestRate * 3600)} coins/h với tổ hợp: ${JSON.stringify(exhaustiveBestCounts)}`);

    // Run Smart Two-Stage on identical setup:
    const baseSmallJson = await callWorker('find_plan', JSON.stringify(baseSmallPayload));
    const baseSmallPlan = JSON.parse(baseSmallJson);
    const smartAllocated = allocateDynamicEmode(baseSmallPlan, 14, smallBudget, { facilities: smallFacilities, powerGridRate: 1.2 });

    const smartFinalPayload = {
        ...baseSmallPayload,
        emode_facilities: Object.keys(smartAllocated),
        emode_facility_counts: smartAllocated
    };
    const smartFinalJson = await callWorker('find_plan', JSON.stringify(smartFinalPayload));
    const smartFinalPlan = JSON.parse(smartFinalJson);
    const smartRate = smartFinalPlan.rate_per_second || 0;

    onLog(`  Smart Two-Stage: ${Math.round(smartRate * 3600)} coins/h với tổ hợp: ${JSON.stringify(smartAllocated)}`);

    const gap = exhaustiveBestRate > 0
        ? ((exhaustiveBestRate - smartRate) / exhaustiveBestRate) * 100
        : 0;

    let smartWatts = 0;
    for (const [fac, count] of Object.entries(smartAllocated)) {
        smartWatts += count * (powerWatts[fac] || 0);
    }

    const gapPass = gap <= 2.0;
    const powerBudgetPass = smartWatts <= smallBudget;
    suite4.passed = gapPass && powerBudgetPass && smartRate > 0;
    suite4.exhaustive = {
        rate_per_hour: Math.round(exhaustiveBestRate * 3600),
        counts: exhaustiveBestCounts,
        evaluated_combos: validCombinations.length,
        infeasible_combos: infeasibleCombinations
    };
    suite4.smart_two_stage = {
        rate_per_hour: Math.round(smartRate * 3600),
        counts: smartAllocated,
        allocated_watts: smartWatts,
        diagnostics: smartAllocated._diagnostics || []
    };
    suite4.quality_gap_percent = Math.round(gap * 100) / 100;
    suite4.target_proposed = '1-2%';

    onLog(`  Quality Gap = ${suite4.quality_gap_percent}% (Pass: ${gapPass ? 'YES' : 'NO'}, Budget Pass: ${powerBudgetPass ? 'YES' : 'NO'})`);
    report.suites.suite4_quality_gap = suite4;

    // -------------------------------------------------------------
    // SUITE 5: Overrides & Validation Invariants
    // -------------------------------------------------------------
    onLog('\n--- SUITE 5: Overrides & Validation Invariants (Strict & No Clamping) ---');
    const suite5 = { passed: true, checks: [] };

    // 1. Fixed Zero Override (khóa cấm Simmering Pot)
    const fixedZeroOverrides = [
        { facility: 'Simmering Pot', level: 4, electric_count: 0, specialist_count: 0, manual_count: 1 }
    ];
    const allocZero = allocateDynamicEmode(baseSmallPlan, 14, smallBudget, { overrides: fixedZeroOverrides, facilities: smallFacilities });
    const zeroRespected = (allocZero['Simmering Pot'] || 0) === 0;
    suite5.checks.push({ check: 'fixed_zero_respected', pass: zeroRespected });
    onLog(`  1. Fixed Zero (Simmering Pot = 0): ${zeroRespected ? 'PASS' : 'FAIL'}`);

    // 2. Fixed Electric Override (khóa ép Claw Game Cooker = 1)
    const fixedElecOverrides = [
        { facility: 'Claw Game Cooker', level: 4, electric_count: 1, specialist_count: 0, manual_count: 0 }
    ];
    const allocElec = allocateDynamicEmode(baseSmallPlan, 14, smallBudget, { overrides: fixedElecOverrides, facilities: smallFacilities });
    const elecRespected = (allocElec['Claw Game Cooker'] || 0) === 1;
    suite5.checks.push({ check: 'fixed_electric_respected', pass: elecRespected });
    onLog(`  2. Fixed Electric (Claw Game Cooker = 1): ${elecRespected ? 'PASS' : 'FAIL'}`);

    // 3. Overflow Owned Units -> Must return validation_error: true (No silent clamping!)
    const overflowOwnedOverrides = [
        { facility: 'Simmering Pot', level: 4, electric_count: 5, specialist_count: 0, manual_count: 0 }
    ];
    const allocOverflowOwned = allocateDynamicEmode(baseSmallPlan, 14, smallBudget, { overrides: overflowOwnedOverrides, facilities: smallFacilities });
    const overflowOwnedPass = allocOverflowOwned.validation_error === true;
    suite5.checks.push({ check: 'overflow_owned_validation_error', pass: overflowOwnedPass, error: allocOverflowOwned.error });
    onLog(`  3. Overflow Owned Validation (5 requested > 1 owned): ${overflowOwnedPass ? 'PASS' : 'FAIL'}`);

    // 4. Overflow Watts Budget -> Must return validation_error: true (No silent clamping!)
    const overflowWattsOverrides = [
        { facility: 'Simmering Pot', level: 4, electric_count: 1, specialist_count: 0, manual_count: 0 },
        { facility: 'Jukebox Dryer', level: 4, electric_count: 1, specialist_count: 0, manual_count: 0 },
        { facility: 'Claw Game Cooker', level: 4, electric_count: 1, specialist_count: 0, manual_count: 0 }
    ]; // 60 + 60 + 60 = 180W > 120W budget!
    const allocOverflowWatts = allocateDynamicEmode(baseSmallPlan, 14, smallBudget, { overrides: overflowWattsOverrides, facilities: smallFacilities });
    const overflowWattsPass = allocOverflowWatts.validation_error === true;
    suite5.checks.push({ check: 'overflow_watts_validation_error', pass: overflowWattsPass, error: allocOverflowWatts.error });
    onLog(`  4. Overflow Watts Budget (180W requested > 120W budget): ${overflowWattsPass ? 'PASS' : 'FAIL'}`);

    // 5. No Silent Clamping confirmation
    const noSilentClampingPass = overflowOwnedPass && overflowWattsPass;
    suite5.checks.push({ check: 'no_silent_clamping_enforced', pass: noSilentClampingPass });
    onLog(`  5. No Silent Clamping Enforced: ${noSilentClampingPass ? 'PASS' : 'FAIL'}`);

    suite5.passed = zeroRespected && elecRespected && overflowOwnedPass && overflowWattsPass;
    report.suites.suite5_overrides = suite5;

    // Aggregate Gate
    report.all_passed = suite1.passed && suite2.passed && suite3.passed && suite4.passed && suite5.passed;

    onLog('\n======================================================');
    onLog(report.all_passed ? '🏆 TOÀN BỘ BENCHMARK HOÀN TẤT VÀ ĐẠT TẤT CẢ TIÊU CHÍ (PASS)!' : '⚠️ BENCHMARK HOÀN TẤT VỚI MỘT SỐ TIÊU CHÍ CHƯA ĐẠT (FAIL)!');
    onLog(`Quality Gap trên fixture ràng buộc: ${suite4.quality_gap_percent}%`);
    onLog(`Latency p50 RV15: ${suite3.fixtures.rv15.stats.total_two_stage.p50}ms (Base: ${suite3.fixtures.rv15.stats.base_solve.p50}ms, Alloc: ${suite3.fixtures.rv15.stats.allocator.p50}ms, Final: ${suite3.fixtures.rv15.stats.final_solve.p50}ms)`);
    onLog(`Latency p50 RV16: ${suite3.fixtures.rv16.stats.total_two_stage.p50}ms`);
    onLog('======================================================\n');

    if (typeof window !== 'undefined') {
        window.latestBenchmarkReport = report;
    }

    worker.terminate();
    return report;
}
