import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAniimoSummaryMembers, renderAniimoAbilityStrip, renderAniimoSummaryMemberRow } from '../aniimo-summary-roster-renderer.js';

test('merges duplicate rows by facility, worker, ability, level, and specific worker without mutating input', () => {
    const members = [
        { facility: 'Mine', worker: 'Shrubclaw', ability: 'Earth', level: 3, specific: 'Shrubclaw', count: 1 },
        { facility: 'Mine', worker: 'Shrubclaw', ability: 'Earth', level: 3, specific: 'Shrubclaw', count: 2 },
        { facility: 'Mine', worker: 'Waleetle', ability: 'Earth', level: 4, specific: 'Waleetle', count: 1 },
    ];
    const before = structuredClone(members);
    assert.deepEqual(mergeAniimoSummaryMembers(members).map(member => [member.worker, member.count]), [['Shrubclaw', 3], ['Waleetle', 1]]);
    assert.deepEqual(members, before);
    assert.deepEqual(mergeAniimoSummaryMembers(null), []);
});

test('renders member row with localized column labels, theme, and injected worker badge', () => {
    const badgeCalls = [];
    const html = renderAniimoSummaryMemberRow({
        facility: 'Mine (ore)', worker: 'Shrubclaw', ability: 'Earth', level: 3, count: 2, desc: 'Mining', specific: 'Shrubclaw'
    }, {
        isVi: true,
        abilityThemes: { Earth: { color: '#9a6', icon: '🪨', vi: 'Thổ' } },
        viAbilities: { Earth: 'Thổ' },
        renderBadge: (...args) => { badgeCalls.push(args); return '<badge />'; },
    });

    assert.match(html, /Tên cơ sở \/ Nhiệm vụ/);
    assert.match(html, /Mine \(ore\)/);
    assert.match(html, /🪨/);
    assert.match(html, /Thổ Lv\.3/);
    assert.match(html, /2×/);
    assert.deepEqual(badgeCalls, [['Earth', 3, 2, 'Shrubclaw · Mining', false, 'Shrubclaw']]);
});

test('renders ability totals, stacks member badges, and preserves the default hauling badge', () => {
    const badgeCalls = [];
    const html = renderAniimoAbilityStrip({
        abilities: [{ name: 'Earth', color: '#9a6', about: 'Mining' }, { name: 'Hauling', color: '#777', about: 'Carry' }],
        members: [{ ability: 'Earth', level: 3, count: 2, name: 'Shrubclaw', desc: 'Mining', specific: 'Shrubclaw' }],
        isVi: true,
        viAbilities: { Earth: 'Thổ', Hauling: 'Khuân vác' },
        renderBadge: (...args) => { badgeCalls.push(args); return `<badge>${args[0]}</badge>`; },
    });

    assert.match(html, /ability-count">2/);
    assert.match(html, /ability-name">Thổ/);
    assert.match(html, /ability-name">Khuân vác/);
    assert.equal(badgeCalls.length, 2);
    assert.deepEqual(badgeCalls[1], ['Hauling', '·', 1, 'Rookey kiêm nhiệm đưa nông sản vào kho', false, 'Rookey']);
});
