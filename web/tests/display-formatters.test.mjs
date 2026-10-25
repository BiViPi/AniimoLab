import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ITEM_NAMES,
    numberOrDefault,
    floatOrDefault,
    formatNumber,
    formatRate,
    getFacilityDisplayName,
    getModeDisplayName,
    getModuleDisplayName,
    getItemDisplayName,
    prettyItem,
    prettyReason,
    goalName,
} from '../display-formatters.js';

test('display-formatters: parses numbers with defaults', () => {
    assert.equal(numberOrDefault('42', 10), 42);
    assert.equal(numberOrDefault('invalid', 10), 10);
    assert.equal(floatOrDefault('3.14', 1.0), 3.14);
    assert.equal(floatOrDefault('invalid', 1.0), 1.0);
});

test('display-formatters: formats numbers and rates', () => {
    assert.equal(formatNumber(1234567), (1234567).toLocaleString(undefined, { maximumFractionDigits: 2 }));
    assert.equal(formatRate(120), formatNumber(120));
    assert.equal(formatRate(0.0123), '0.012');
});

test('display-formatters: resolves display names with window.i18n or fallback', () => {
    assert.equal(getFacilityDisplayName('Mine'), 'Mine');
    assert.equal(getModeDisplayName('Warm'), 'Warm');
    assert.equal(getModuleDisplayName('speed_module'), 'Speed Module');
    assert.equal(getItemDisplayName('wood_block'), 'Wood Blocks');

    const mockWin = {
        i18n: {
            getFacilityDisplayName: name => `[Vi:${name}]`,
            getModeDisplayName: mode => `[Mode:${mode}]`,
            getModuleDisplayName: name => `[Mod:${name}]`,
            getItemDisplayName: name => `[Item:${name}]`,
        },
    };
    assert.equal(getFacilityDisplayName('Mine', mockWin), '[Vi:Mine]');
    assert.equal(getModeDisplayName('Warm', mockWin), '[Mode:Warm]');
    assert.equal(getModuleDisplayName('speed_module', mockWin), '[Mod:speed_module]');
    assert.equal(getItemDisplayName('wood_block', mockWin), '[Item:wood_block]');
});

test('display-formatters: prettyItem translates items and handles suffixes', () => {
    assert.equal(prettyItem('coins'), 'Home Coins');
    assert.equal(prettyItem('wood_block'), 'Wood Blocks');
    assert.equal(prettyItem('wood_block__specialist'), 'Wood Blocks');

    const mockWinVi = {
        i18n: { getLang: () => 'vi' },
        VI_ITEM_NAMES: { wood_block: 'Khối gỗ' },
    };
    assert.equal(prettyItem('wood_block', { window: mockWinVi }), 'Khối gỗ');
    assert.equal(prettyItem('wood_block__specialist', { window: mockWinVi }), 'Khối gỗ');
});

test('display-formatters: prettyReason localizes reason strings', () => {
    const enReason = 'Used for wood_block; the rest sells directly';
    const mockWinEn = { i18n: { getLang: () => 'en' } };
    assert.equal(prettyReason(enReason, { window: mockWinEn }), 'Used for Wood Blocks; the rest sells directly');

    const mockWinVi = {
        i18n: { getLang: () => 'vi' },
        VI_ITEM_NAMES: { wood_block: 'Khối gỗ' },
    };
    assert.equal(prettyReason(enReason, { window: mockWinVi }), 'Dùng cho Khối gỗ; phần còn lại bán trực tiếp');
});

test('display-formatters: goalName resolves coins or row label', () => {
    assert.equal(goalName({ target: 'coins', label: 'Tiền vàng' }), 'Home Coins');
    assert.equal(goalName({ target: 'wood_block', label: 'Khối gỗ' }), 'Khối gỗ');
});
