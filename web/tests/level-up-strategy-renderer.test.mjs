import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLevelUpStrategyViewModel, getLevelUpStockAmount, getLevelUpStockNames } from '../level-up-strategy-renderer.js';

test('derives stock rows from required recipe chains while preserving order and duplicates', () => {
    const cost = { coins: 500, items: [['planks', 4], ['timber', 2], ['unmapped', 1]] };
    assert.deepEqual(getLevelUpStockNames(cost, [['wood', 'planks', 'timber']]), ['coins', 'wood', 'planks', 'wood', 'planks', 'timber']);
});

test('normalizes stock amount to finite positive numbers only', () => {
    assert.equal(getLevelUpStockAmount({ wood: '2.5' }, 'wood'), 2.5);
    assert.equal(getLevelUpStockAmount({ wood: -1 }, 'wood'), 0);
    assert.equal(getLevelUpStockAmount({ wood: 'bad' }, 'wood'), 0);
    assert.equal(getLevelUpStockAmount({}, 'wood'), 0);
});

test('builds localized unavailable note without stock fields', () => {
    const view = buildLevelUpStrategyViewModel({ unavailable: 'Not available.', isVietnamese: true });
    assert.match(view.costHtml, /Not available\. Kế hoạch sẽ ưu tiên kiếm nhiều Home Coin nhất\./);
    assert.equal(view.stockVisible, false);
    assert.equal(view.stockGridHtml, '');
});

test('renders cost chips and stock input rows with injected formatters', () => {
    const view = buildLevelUpStrategyViewModel({
        titleText: 'RV 13 costs',
        cost: { coins: 1200, items: [['wood', 6]] },
        stockRows: [{ name: 'coins', amount: 15 }, { name: 'wood', amount: 2 }],
        formatNumber: value => `N${value}`,
        getItemDisplayName: name => `Item ${name}`,
    });
    assert.match(view.costHtml, /RV 13 costs/);
    assert.match(view.costHtml, /N1200/);
    assert.match(view.costHtml, /Item wood/);
    assert.equal(view.stockVisible, true);
    assert.match(view.stockGridHtml, /id="stock-coins" data-stock="coins" min="0" value="15"/);
    assert.match(view.stockGridHtml, /label for="stock-wood"/);
});
