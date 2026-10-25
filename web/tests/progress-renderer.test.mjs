import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProgressMarkup } from '../progress-renderer.js';

test('progress renderer emits status icons, notes, proof labels, and durations without mutating steps', () => {
    const progress = { steps: [
        { state: 'running', label: 'Solve', detail: 'Searching', ms: 900 },
        { state: 'done', label: 'Plan', detail: 'Complete', proven: true, ms: 1250 },
        { state: 'fail', label: 'Priority', proven: false, ms: 4 },
        { state: 'skipped', label: 'Backup' },
        { state: 'pending', label: 'Next' },
    ] };
    const before = structuredClone(progress);
    const result = buildProgressMarkup(progress, { searchNote: proven => proven ? '<strong>Proven</strong>' : '<em>Best found</em>' });

    assert.match(result, /step-spinner/);
    assert.match(result, /step-icon done/);
    assert.match(result, /step-icon fail/);
    assert.match(result, /step-icon skipped/);
    assert.match(result, /step-icon pending/);
    assert.match(result, /<span class="step-note">Searching<\/span>/);
    assert.match(result, /Complete · <strong>Proven<\/strong> · 1\.3 s/);
    assert.match(result, /<em>Best found<\/em> · 4 ms/);
    assert.deepEqual(progress, before);
});

test('progress renderer handles an empty step list', () => {
    assert.equal(buildProgressMarkup({ steps: [] }, { searchNote: () => '' }), '<ol class="progress-steps"></ol>');
});
