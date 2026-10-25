import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevelUpViewModel } from '../level-up-renderer.js';

function render(plan, context, overrides = {}) {
    return buildLevelUpViewModel(plan, context, {
        rateUnit: 'hour',
        rateUnitSeconds: { hour: { multiplier: 3600 } },
        isVietnamese: false,
        formatDuration: seconds => `${seconds}sec`,
        formatRate: value => `R${value}`,
        formatNumber: value => `N${value}`,
        getItemDisplayName: name => `Item ${name}`,
        getTableHeading: (_key, fallback) => fallback,
        ...overrides,
    });
}

test('level-up view model hides the card outside a level-up plan', () => {
    assert.deepEqual(render({}, null), { visible: false });
    assert.deepEqual(render({}, { levelUp: false }), { visible: false });
});

test('level-up view model handles unavailable, ready, and missing-report states', () => {
    const context = { levelUp: true, target: 12 };
    const unavailable = render({ level_up: {} }, { ...context, unavailable: 'Missing workshops.' });
    assert.equal(unavailable.visible, true);
    assert.equal(unavailable.labelText, 'RV 12 level-up');
    assert.equal(unavailable.timeText, '-');
    assert.match(unavailable.linesHtml, /Missing workshops\./);
    assert.equal(unavailable.rateUnitInTable, false);

    const ready = render({}, { ...context, ready: true }, { isVietnamese: true });
    assert.equal(ready.timeText, 'Đã đủ nguyên liệu');
    assert.match(ready.linesHtml, /Bạn đã có đủ mọi nguyên liệu cần thiết/);

    const noReport = render({ level_up_note: 'unreachable' }, context);
    assert.equal(noReport.timeText, '-');
    assert.match(noReport.linesHtml, /These facilities can't make everything it costs/);
});

test('level-up view model renders requirement timing, slowest rows, headings, and surplus without mutating report', () => {
    const plan = {
        level_up: {
            seconds: 120,
            requirements: [
                { name: 'wood_block', seconds: 120, per_second: 1, need: 100, have: 0 },
                { name: 'ore', seconds: 60, per_second: 2, need: 50, have: 0 },
            ],
            leftovers: [['apple', 2.8]],
        },
    };
    const before = structuredClone(plan);
    const result = render(plan, { levelUp: true, target: 15 });

    assert.equal(result.labelText, 'RV 15 level-up');
    assert.equal(result.timeText, 'in 120sec');
    assert.equal(result.rateUnitInTable, true);
    assert.equal(result.rateBlockHidden, true);
    assert.match(result.linesHtml, /<th>Cost<\/th>/);
    assert.match(result.linesHtml, /class="slowest"/);
    assert.match(result.linesHtml, /R3600/);
    assert.match(result.linesHtml, /N20 Item wood_block/);
    assert.match(result.linesHtml, /N2 Item apple/);
    assert.deepEqual(plan, before);
});
