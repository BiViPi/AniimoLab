export function buildProgressMarkup(progress, { searchNote }) {
    const icon = state => ({
        running: '<span class="step-spinner" aria-label="Running"></span>',
        done: '<span class="step-icon done" aria-label="Done">✓</span>',
        fail: '<span class="step-icon fail" aria-label="Failed">✕</span>',
        skipped: '<span class="step-icon skipped" aria-label="Skipped">–</span>',
    }[state] || '<span class="step-icon pending" aria-label="Waiting">•</span>');
    const time = ms => ms == null ? '' : ms < 1000 ? `${Math.max(1, Math.round(ms))} ms` : `${(ms / 1000).toFixed(1)} s`;
    const rows = progress.steps.map(step => {
        const finished = step.state === 'done' || step.state === 'fail';
        const note = [step.detail, finished ? searchNote(step.proven) : '', finished ? time(step.ms) : ''].filter(Boolean).join(' · ');
        return `
        <li class="progress-step ${step.state}">${icon(step.state)}<span class="step-label">${step.label}</span>
            <span class="step-note">${note}</span></li>`;
    }).join('');
    return `<ol class="progress-steps">${rows}</ol>`;
}
