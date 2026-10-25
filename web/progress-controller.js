import { buildProgressMarkup as defaultBuildProgressMarkup } from './progress-renderer.js?v=aniimolab_v1';

export const EARLY_PHASE_TRIALS = 15;
export const EARLY_PHASE_PERCENT = 25;
export const LATE_PHASE_HALFWAY_TRIALS = 120;

export function trialCountToPercent(count) {
    if (count <= EARLY_PHASE_TRIALS) {
        return Math.round((EARLY_PHASE_PERCENT * count) / EARLY_PHASE_TRIALS);
    }
    const trialsIntoLatePhase = count - EARLY_PHASE_TRIALS;
    const latePhasePercentRange = 96 - EARLY_PHASE_PERCENT;
    const latePhaseFraction = trialsIntoLatePhase / (trialsIntoLatePhase + LATE_PHASE_HALFWAY_TRIALS);
    return Math.round(EARLY_PHASE_PERCENT + latePhasePercentRange * latePhaseFraction);
}

export const PLAN_SOLVES = ['level_up', 'final', 'stock_up', 'check'];

export const PROVEN_MEANS = 'No plan the model allows does better. Some of its options, such as how plots can be arranged around an environment building, come from a shortlist rather than every possibility.';
export const PROVEN_MEANS_VI = 'Không phương án nào trong mô hình toán đạt hiệu suất cao hơn. Các phương án bố trí ô đất quanh cơ sở môi trường đã được tối ưu hóa.';

export function searchNote(proven, { window: win = typeof window !== 'undefined' ? window : null } = {}) {
    if (proven === undefined) return '';
    const isVi = win?.i18n && win.i18n.getLang?.() === 'vi';
    return proven
        ? `<span title="${isVi ? PROVEN_MEANS_VI : PROVEN_MEANS}">${isVi ? 'tối ưu chuẩn xác' : 'proven best'}</span>`
        : `<span title="${isVi ? 'Bộ giải đạt thời gian giới hạn.' : 'The solver ran out of time before it could prove nothing does better.'}">${isVi ? 'tốt nhất theo thời gian' : 'best found in time'}</span>`;
}

export function createProgressController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    getPlanRunId = () => 0,
    getPlanContext = () => null,
    priorityLabel = (target, aniipod) => target,
    buildProgressMarkup = defaultBuildProgressMarkup,
    now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
} = {}) {
    let progress = null;

    function getProgress() {
        return progress;
    }

    function setProgress(val) {
        progress = val;
    }

    function startProgress(input = {}, runId) {
        const isVi = win?.i18n && win.i18n.getLang?.() === 'vi';
        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const levelUp = !!input.level_up && planContext?.levelUp && !planContext?.ready && !planContext?.unavailable;
        const priorities = input.priorities || [];

        const steps = [
            ...priorities.map(target => ({
                key: `priority:${target}`,
                label: isVi
                    ? `Nhiều ${priorityLabel(target, planContext?.aniipod)} nhất`
                    : `Most ${priorityLabel(target, planContext?.aniipod)}`,
            })),
            {
                key: 'plan',
                label: levelUp
                    ? (isVi ? 'Lên cấp nhanh nhất' : 'Fastest Level-Up')
                    : priorities.length
                        ? (isVi ? 'Home Coin từ phần còn lại' : "Home Coins with What's Left")
                        : (isVi ? 'Nhiều Home Coin nhất' : 'Most Home Coins'),
            },
            { key: 'layout', label: isVi ? 'Bố cục Homeland' : 'Homeland Layout' },
            { key: 'minimum', label: isVi ? 'Tổ đội Aniimo tối thiểu' : 'Minimum Team Plan' },
        ];

        progress = { runId, steps: steps.map(step => ({ ...step, state: 'pending' })) };
        renderProgress();
    }

    function setStep(key, state, detail, proven) {
        const currentRunId = typeof getPlanRunId === 'function' ? getPlanRunId() : 0;
        if (!progress || progress.runId !== currentRunId) return;

        if (PLAN_SOLVES.includes(key)) {
            const plan = progress.steps.find(s => s.key === 'plan');
            if (plan) {
                if (proven === false) plan.unproven = true;
                if (state === 'start' && plan.state !== 'running') setStep('plan', 'start');
                else if (state === 'done' && key === 'check') setStep('plan', 'done', undefined, !plan.unproven);
                else renderProgress();
            }
            return;
        }

        let step = progress.steps.find(s => s.key === key);
        if (!step && key === 'backup') {
            const isVi = win?.i18n && win.i18n.getLang?.() === 'vi';
            step = { key, label: isVi ? 'Bộ giải dự phòng' : 'Backup Planner', state: 'pending' };
            const layoutIdx = progress.steps.findIndex(s => s.key === 'layout');
            if (layoutIdx >= 0) {
                progress.steps.splice(layoutIdx, 0, step);
            } else {
                progress.steps.push(step);
            }
        }
        if (!step) return;

        const currentTime = now();
        if (state === 'start') {
            if (step.state !== 'running') step.started = currentTime;
            step.state = 'running';
        } else if (state === 'done' || state === 'fail') {
            step.ms = step.started ? currentTime - step.started : null;
            step.state = state;
        } else if (state === 'skip') {
            step.state = 'skipped';
        }
        if (detail !== undefined) step.detail = detail;
        if (proven !== undefined) step.proven = proven;
        renderProgress();
    }

    function finishSolveSteps() {
        if (!progress) return;
        progress.steps
            .filter(s => s.key === 'plan' || s.key.startsWith('priority:'))
            .forEach(s => {
                if (s.state === 'pending' || s.state === 'running') s.state = 'skipped';
            });
        if (progress.steps.some(s => s.key === 'backup')) setStep('backup', 'done');
        renderProgress();
    }

    function renderProgress() {
        const card = document?.getElementById?.('solve-progress');
        if (!progress) {
            if (card?.style) card.style.display = 'none';
            return;
        }
        if (card?.style) card.style.display = 'block';
        if (card) {
            card.innerHTML = buildProgressMarkup(progress, {
                searchNote: p => searchNote(p, { window: win }),
            });
        }
    }

    return {
        getProgress,
        setProgress,
        startProgress,
        setStep,
        finishSolveSteps,
        renderProgress,
        searchNote: p => searchNote(p, { window: win }),
        trialCountToPercent,
    };
}
