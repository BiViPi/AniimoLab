// Coordinates lazy solves for Aniimo setup tabs without owning page or solver state.
export function createAniimoSetupController(deps) {
    let setupSolve = null;

    function ensurePlanFor(setup) {
        const plans = deps.getPlans();
        const lastPlanInput = deps.getLastPlanInput();
        if (plans[setup] || !lastPlanInput || setupSolve?.setup === setup) return;
        stopSetupSolve();
        const runId = deps.getRunId();
        const worker = new deps.WorkerImpl(deps.workerUrl, { type: 'module' });
        setupSolve = { setup, worker };

        const done = plan => {
            if (setupSolve?.worker !== worker) return;
            worker.terminate();
            setupSolve = null;
            if (runId !== deps.getRunId()) return;
            deps.normalizePlan(plan);
            deps.getPlans()[setup] = plan;
            if (deps.getSelectedSetup() === setup) deps.showSelectedPlan();
        };

        worker.onmessage = event => {
            const { type, ok, result, error } = event.data;
            if (type === 'progress') return;
            done(ok ? JSON.parse(result) : { success: false, error });
        };
        worker.onerror = event => done({ success: false, error: event.message || 'The planner stopped' });
        worker.postMessage({
            id: 1,
            type: 'find_plan',
            payload: JSON.stringify({ ...lastPlanInput, ...deps.getAniimoInput(setup) }),
        });
    }

    function stopSetupSolve() {
        setupSolve?.worker.terminate();
        setupSolve = null;
    }

    function switchAniimoSetup() {
        deps.showSelectedPlan();
        ensurePlanFor(deps.getSelectedSetup());
    }

    return { ensurePlanFor, stopSetupSolve, switchAniimoSetup };
}
