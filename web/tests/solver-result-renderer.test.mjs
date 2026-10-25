import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSolverResultViewModel } from '../solver-result-renderer.js';

test('builds two-stage solver labels and benchmark in Vietnamese', () => {
    assert.deepEqual(buildSolverResultViewModel({
        plan: { solver_source: 'smart_two_stage', proven_optimal: true, benchmark_breakdown: { t_base_solve: 10, t_allocator: 20, t_final_solve: 30, t_total: 60 } },
        isVi: true
    }), {
        exploredDisplay: 'block',
        exploredText: '⚡ Tối ưu chuẩn xác cho cấu hình E-mode đã phân bổ (Heuristic Two-Stage; không cam kết tối ưu toàn cục mọi tổ hợp).',
        solverInfoDisplay: 'flex',
        solverBadgeText: '⚡ Smart Two-Stage (Heuristic Allocation + Re-Solve Exact)',
        benchmarkDisplay: 'inline-flex',
        benchmarkText: '⏱️ Base: 10ms | Alloc: 20ms | Final: 30ms | Tổng: 60ms'
    });
});

test('shows bounded optimality gap for a non-optimal exact result', () => {
    const model = buildSolverResultViewModel({ plan: { proven_optimal: false, upper_bound: 125, rate_per_second: 100 }, isVi: false });
    assert.equal(model.exploredDisplay, '');
    assert.match(model.exploredText, /20\.0% higher/);
});

test('reports fallback reason when exact solver could not run', () => {
    const model = buildSolverResultViewModel({ plan: { proven_optimal: false, solver_source: 'backup', fallback_reason: 'timeout' }, isVi: false });
    assert.equal(model.exploredDisplay, '');
    assert.match(model.exploredText, /couldn't run \(timeout\)/);
});

test('leaves benchmark and solver badges untouched when source-specific data is absent', () => {
    const model = buildSolverResultViewModel({ plan: { solver_source: 'fast_resolve_exact' }, isVi: false });
    assert.equal(model.solverInfoDisplay, 'flex');
    assert.equal(model.solverBadgeText, '⚡ Exact Re-Solve');
    assert.equal(model.benchmarkDisplay, undefined);
    assert.equal(model.benchmarkText, undefined);
});
