import test from 'node:test';
import assert from 'node:assert/strict';
import { renderAniimoStandardSummary } from '../aniimo-standard-summary-renderer.js';

const fixture = overrides => ({
    isVi: false,
    detailsExpanded: false,
    farmTotal: 5,
    totalFarmPlots: 12,
    statTotal: 4,
    effectiveGuardCount: 1,
    procTotal: 2,
    craftTotal: 3,
    farmingRowsHtml: '<tr id="farm"></tr>',
    statRowsHtml: '<tr id="stationary"></tr>',
    procRowsHtml: '<tr id="processing"></tr>',
    craftRowsHtml: '<tr id="crafting"></tr>',
    capNote: '<p id="cap">cap</p>',
    ...overrides,
});

test('renders English group cards, collapsed toggle, table rows, and cap note', () => {
    const html = renderAniimoStandardSummary(fixture());
    assert.match(html, /Group 1: Farming/);
    assert.match(html, /Group 4: Processing & Craft/);
    assert.match(html, /Click here to show full worker details for all groups/);
    assert.match(html, /display: none/);
    assert.match(html, /id="farm"/);
    assert.match(html, /Group 3: Wood & Ore Processing Crew/);
    assert.match(html, /id="cap"/);
    assert.match(html, /window\.toggleRosterDetails\(\)/);
});

test('renders Vietnamese labels and expanded state', () => {
    const html = renderAniimoStandardSummary(fixture({ isVi: true, detailsExpanded: true, capNote: '' }));
    assert.match(html, /Nhóm 1: Đồng Áng/);
    assert.match(html, /Nhóm 4: Chế Biến Thành Phẩm/);
    assert.match(html, /Thu gọn danh sách chi tiết các nhóm công nhân/);
    assert.match(html, /display: block/);
    assert.match(html, /Tên cơ sở \/ Nhiệm vụ/);
    assert.match(html, /Loại Aniimo/);
    assert.match(html, /Số lượng/);
    assert.doesNotMatch(html, /id="cap"/);
});
