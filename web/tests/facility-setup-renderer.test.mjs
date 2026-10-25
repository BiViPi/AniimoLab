import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFacilityCardsMarkup, buildTierRowsMarkup } from '../facility-setup-renderer.js';

test('tier row renderer honors tier count, level support, and remove controls without mutating data', () => {
    const tiers = [{ count: 2, level: 3 }, { count: 1, level: 4 }];
    const before = structuredClone(tiers);
    const result = buildTierRowsMarkup({ name: 'Mine', hasLevels: true }, tiers);
    assert.equal((result.match(/class="facility-inputs tier-row"/g) || []).length, 2);
    assert.match(result, /class="tier-count" value="2"/);
    assert.match(result, /class="tier-level" value="4"/);
    assert.equal((result.match(/tier-remove-btn/g) || []).length, 2);
    assert.deepEqual(tiers, before);
});

test('tier row renderer omits level inputs for non-level facilities and remove button for a single tier', () => {
    const result = buildTierRowsMarkup({ name: 'Well', hasLevels: false }, [{ count: 2, level: 1 }]);
    assert.match(result, /tier-count/);
    assert.doesNotMatch(result, /tier-level|tier-remove-btn/);
});

test('facility cards group categories, localize labels, and reflect E-mode selection without mutation', () => {
    const facilities = [
        { name: 'Mine', category: 'Materials', tooltip: 'Mine info', hasLevels: true, supportsEmode: true },
        { name: 'Well', category: 'Materials', tooltip: 'Well info', hasLevels: false, supportsEmode: false },
        { name: 'Stove', category: 'Processing', tooltip: 'Stove info', hasLevels: true, supportsEmode: true },
    ];
    const emodeFacilities = new Set(['Mine']);
    const before = [...emodeFacilities];
    const html = buildFacilityCardsMarkup({
        categories: ['Materials', 'Processing'],
        facilities,
        isVietnamese: true,
        emodeFacilities,
        getCategoryDisplayName: category => category === 'Materials' ? 'Nguyên Liệu' : category,
        getFacilityDisplayName: name => `Cơ sở ${name}`,
    });
    assert.equal((html.match(/class="facility-category"/g) || []).length, 2);
    assert.match(html, /class="facility-emode-checkbox" data-facility="Mine" checked/);
    assert.match(html, /Cơ sở Mine/);
    assert.match(html, /\+ Thêm cấp/);
    assert.doesNotMatch(html, /data-facility="Well"><\/div>\s*<button/);
    assert.deepEqual([...emodeFacilities], before);
});
