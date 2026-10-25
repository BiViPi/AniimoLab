export function buildSolverResultViewModel({ plan, isVi }) {
    const model = {};
    const isTwoStage = plan.solver_source && plan.solver_source.includes('smart_two_stage');
    const gap = plan.upper_bound > 0
        ? Math.max(0, (plan.upper_bound - plan.rate_per_second) / plan.upper_bound * 100)
        : null;

    if (isTwoStage) {
        model.exploredDisplay = 'block';
        if (plan.proven_optimal === true) {
            model.exploredText = isVi
                ? '⚡ Tối ưu chuẩn xác cho cấu hình E-mode đã phân bổ (Heuristic Two-Stage; không cam kết tối ưu toàn cục mọi tổ hợp).'
                : '⚡ Exact optimal for the selected E-mode allocation (Heuristic Two-Stage; global optimality across all permutations is not guaranteed).';
        } else if (plan.proven_optimal === false && gap !== null) {
            model.exploredText = isVi
                ? `Kế hoạch tốt nhất tìm thấy trong thời gian cho phép; mức tối đa lý thuyết của cấu hình này cao hơn tối đa ${gap.toFixed(1)}%.`
                : `Best plan found in the time allowed; theoretical upper bound for this configuration is at most ${gap.toFixed(1)}% higher.`;
        }
    } else {
        model.exploredDisplay = plan.proven_optimal === true ? 'none' : '';
        if (plan.proven_optimal === true) {
            model.exploredText = '';
        } else if (plan.proven_optimal === false && gap !== null) {
            model.exploredText = isVi
                ? `Kế hoạch tối ưu nhất tìm thấy trong thời gian cho phép; mức tối đa lý thuyết cao hơn nhiều nhất ${gap.toFixed(1)}%.`
                : `Best plan found in the time allowed; the best possible is at most ${gap.toFixed(1)}% higher.`;
        } else {
            const reason = plan.fallback_reason ? ` (${plan.fallback_reason})` : '';
            model.exploredText = isVi
                ? `Bộ giải chuẩn xác không thể hoàn tất${reason}, kế hoạch này được tạo từ bộ giải dự phòng. Tải lại trang thường sẽ giải quyết được.`
                : `The exact planner couldn't run${reason}, so this plan comes from the backup planner and may not be the very best. Reloading the page usually fixes this.`;
        }
    }

    if (plan.solver_source) {
        model.solverInfoDisplay = 'flex';
        if (isTwoStage) {
            model.solverBadgeText = isVi
                ? '⚡ Smart Two-Stage (Heuristic Allocation + Re-Solve Exact)'
                : '⚡ Smart Two-Stage (Heuristic Allocation + Exact Re-Solve)';
            if (plan.benchmark_breakdown) {
                const b = plan.benchmark_breakdown;
                model.benchmarkDisplay = 'inline-flex';
                model.benchmarkText = isVi
                    ? `⏱️ Base: ${b.t_base_solve}ms | Alloc: ${b.t_allocator}ms | Final: ${b.t_final_solve}ms | Tổng: ${b.t_total}ms`
                    : `⏱️ Base: ${b.t_base_solve}ms | Alloc: ${b.t_allocator}ms | Final: ${b.t_final_solve}ms | Total: ${b.t_total}ms`;
            }
        } else if (plan.solver_source === 'fast_resolve_exact') {
            model.solverBadgeText = isVi ? '⚡ Exact Re-Solve' : '⚡ Exact Re-Solve';
            if (plan.elapsed_ms != null) {
                model.benchmarkDisplay = 'inline-flex';
                model.benchmarkText = `⚡ ${plan.elapsed_ms}ms`;
            }
        } else if (plan.solver_source === 'base_plan_fallback') {
            model.solverBadgeText = isVi
                ? `⚠️ Dự phòng Base Plan (${plan.fallback_reason})`
                : `⚠️ Fallback to Base Plan (${plan.fallback_reason})`;
            if (plan.benchmark_breakdown) {
                model.benchmarkDisplay = 'inline-flex';
                model.benchmarkText = `⏱️ ${plan.benchmark_breakdown.t_total}ms`;
            }
        } else {
            model.solverBadgeText = plan.solver_source;
        }
    } else {
        model.solverInfoDisplay = 'none';
    }

    return model;
}
