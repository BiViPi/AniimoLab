import test from 'node:test';
import assert from 'node:assert/strict';
import {
    renderGoalTargetOptions,
    renderProductBreakdown,
    renderSeedRequirements,
} from '../goal-details-renderer.js';

const formatNumber = value => `N${value}`;
const formatRate = value => `R${value}`;

test('goal target renderer emits options in priority order without changing the rows', () => {
    const rows = [{ target: 'coins', label: 'Home Coins' }, { target: 'pods', label: 'Aniipods' }];
    const before = structuredClone(rows);

    assert.equal(renderGoalTargetOptions(rows, row => row.label), '<option value="coins">Home Coins</option><option value="pods">Aniipods</option>');
    assert.deepEqual(rows, before);
});

test('product renderer formats income rows, season points, and positive byproducts', () => {
    const result = renderProductBreakdown({
        products: [{ item_name: 'Jam', facility: 'Pot', total_units: 4.9, sell_value: 3, rate_per_second: 2 }],
        byproducts: [['Wood Blocks', 2.9], ['Sand', 0.9]],
    }, {
        unit: 'hour',
        rateUnitSeconds: { hour: { multiplier: 3600, suffix: '/h' } },
        lastPlan: { season_points: 1, income_streams: [{ item_name: 'Jam', points: 5 }] },
        prettyItem: name => `Item ${name}`,
        formatRate,
        formatNumber,
    });

    assert.equal(result.visible, true);
    assert.equal(result.pointsHidden, false);
    assert.equal(result.rateHeaderHtml, 'Profit <span class="th-unit">Home Coins/h</span>');
    assert.match(result.rowsHtml, /Item Jam/);
    assert.match(result.rowsHtml, /<td>4<\/td>\s*<td>R7200<\/td>\s*<td>N12<\/td>\s*<td>N20<\/td>/);
    assert.match(result.rowsHtml, /Wood Blocks <span class="hint small">\(bonus\)<\/span>/);
    assert.doesNotMatch(result.rowsHtml, />Sand</);
    assert.match(result.rowsHtml, /<td>2<\/td>/);
});

test('product renderer hides an empty breakdown and hides points outside season plans', () => {
    const empty = renderProductBreakdown({ products: [], byproducts: [['dust', 0.5]] }, {
        unit: 'second', rateUnitSeconds: {}, lastPlan: null, prettyItem: name => name, formatRate, formatNumber,
    });
    assert.equal(empty.visible, false);
    assert.equal(empty.rowsHtml, '');

    const noSeason = renderProductBreakdown({ products: [{ item_name: 'Tea', facility: 'Pot', total_units: 1, sell_value: 2, rate_per_second: 1 }] }, {
        unit: 'second', rateUnitSeconds: { second: { multiplier: 1, suffix: '/s' } }, lastPlan: null,
        prettyItem: name => name, formatRate, formatNumber,
    });
    assert.equal(noSeason.pointsHidden, true);
    assert.doesNotMatch(noSeason.rowsHtml, /<td>N0<\/td>/);
});

test('seed requirement renderer emits one row per crop and hides empty requirements', () => {
    const rendered = renderSeedRequirements({ seed_requirements: [{ item_name: 'Apple', facility: 'Farmland', facility_count: 2, seeds_per_plot: 3, total_seeds: 6 }] }, {
        prettyItem: name => `Item ${name}`,
    });
    assert.equal(rendered.visible, true);
    assert.match(rendered.rowsHtml, /Item Apple/);
    assert.match(rendered.rowsHtml, /<td>Farmland<\/td>\s*<td>2<\/td>\s*<td>3<\/td>\s*<td>6<\/td>/);
    assert.deepEqual(renderSeedRequirements({ seed_requirements: [] }, { prettyItem: name => name }), { visible: false, rowsHtml: '' });
});
