import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPriorityListMarkup } from '../priority-renderer.js';

const targets = [
    { id: 'coins', icon: '🪙', labelVi: 'Xu', labelEn: 'Coins', subVi: 'Mô tả xu', subEn: 'Coin detail' },
    { id: 'food', icon: '🍲', labelVi: 'Món ăn', labelEn: 'Food', subVi: '', subEn: '' },
];

test('renders ordered priorities, on/off ranks, toggle and move data contracts', () => {
    const order = [{ target: 'coins', on: true }, { target: 'food', on: false }];
    const html = buildPriorityListMarkup({ shown: order, priorityOrder: order, priorityTargets: targets, arrowUp: 'UP', arrowDown: 'DOWN' });
    assert.match(html, /data-index="0"/);
    assert.match(html, /data-toggle="0"[^>]* checked/);
    assert.match(html, /priority-rank-badge">1/);
    assert.match(html, /data-index="1"/);
    assert.match(html, /priority-rank-empty">-/);
    assert.match(html, /data-move="0" data-to="-1" data-by="-1"[^>]* disabled>UP/);
    assert.match(html, /data-move="0" data-to="1" data-by="1"[^>]*>DOWN/);
});

test('localizes copy and omits coin notice unless multiple priorities are enabled', () => {
    const order = [{ target: 'coins', on: true }, { target: 'food', on: false }];
    const html = buildPriorityListMarkup({
        shown: order, priorityOrder: order, priorityTargets: targets, isVietnamese: true,
        arrowUp: 'UP', arrowDown: 'DOWN',
    });
    assert.match(html, /Xu/);
    assert.match(html, /Mô tả xu/);
    assert.doesNotMatch(html, /coins-top-priority-notice/);
    assert.match(html, /Kéo để sắp xếp/);
    const enabledOrder = [{ target: 'coins', on: true }, { target: 'food', on: true }];
    const multipleEnabled = buildPriorityListMarkup({
        shown: enabledOrder, priorityOrder: enabledOrder, priorityTargets: targets, isVietnamese: true,
    });
    assert.match(multipleEnabled, /coins-top-priority-notice/);
    assert.match(multipleEnabled, /Lưu ý thứ tự ưu tiên/);
});

test('supports unknown priority metadata and empty list', () => {
    const order = [{ target: 'legacy', on: false }];
    const html = buildPriorityListMarkup({ shown: order, priorityOrder: order, priorityTargets: [], arrowUp: '', arrowDown: '' });
    assert.match(html, /legacy/);
    assert.match(buildPriorityListMarkup({ shown: [], priorityOrder: [], priorityTargets: [] }), /^$/);
});
