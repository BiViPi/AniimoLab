import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgressController, trialCountToPercent, searchNote } from '../progress-controller.js';

function createMockElement(id, initialProps = {}) {
    return {
        id,
        tagName: 'DIV',
        innerHTML: '',
        style: {},
        ...initialProps,
    };
}

function createMockDocument(elements = {}) {
    return {
        getElementById(id) {
            return elements[id] || null;
        },
    };
}

test('progress-controller: trialCountToPercent maps trial counts across two phases', () => {
    assert.equal(trialCountToPercent(0), 0);
    assert.equal(trialCountToPercent(15), 25);
    const p100 = trialCountToPercent(100);
    assert.ok(p100 > 25 && p100 < 96);
});

test('progress-controller: searchNote produces formatted badges', () => {
    assert.equal(searchNote(undefined), '');
    const noteTrue = searchNote(true, { window: { i18n: { getLang: () => 'vi' } } });
    assert.match(noteTrue, /tối ưu chuẩn xác/);

    const noteFalse = searchNote(false, { window: { i18n: { getLang: () => 'en' } } });
    assert.match(noteFalse, /best found in time/);
});

test('progress-controller: manages step transitions, backup insertion, and finish steps', () => {
    let rendered = false;
    const card = createMockElement('solve-progress');
    const doc = createMockDocument({ 'solve-progress': card });

    const controller = createProgressController({
        document: doc,
        getPlanRunId: () => 1,
        getPlanContext: () => ({ levelUp: false, ready: true }),
        priorityLabel: target => target,
        buildProgressMarkup: p => `<div>Steps:${p.steps.length}</div>`,
    });

    // Start progress
    controller.startProgress({ priorities: [] }, 1);
    const progress = controller.getProgress();
    assert.equal(progress.runId, 1);
    assert.equal(progress.steps.length, 3); // plan, layout, minimum

    // Advance step
    controller.setStep('plan', 'start');
    assert.equal(progress.steps[0].state, 'running');

    // Backup planner appears when invoked
    controller.setStep('backup', 'start');
    assert.equal(progress.steps.length, 4);
    assert.equal(progress.steps.some(s => s.key === 'backup'), true);

    // Finish steps
    controller.finishSolveSteps();
    const backupStep = progress.steps.find(s => s.key === 'backup');
    assert.equal(backupStep.state, 'done');
});

test('progress-controller: renderProgress manages card visibility and content', () => {
    const card = createMockElement('solve-progress');
    const doc = createMockDocument({ 'solve-progress': card });

    const controller = createProgressController({
        document: doc,
        getPlanRunId: () => 1,
        getPlanContext: () => ({}),
        buildProgressMarkup: p => `<div>Active:${p.runId}</div>`,
    });

    // No progress yet
    controller.renderProgress();
    assert.equal(card.style.display, 'none');

    // With active progress
    controller.startProgress({}, 1);
    assert.equal(card.style.display, 'block');
    assert.equal(card.innerHTML, '<div>Active:1</div>');
});
