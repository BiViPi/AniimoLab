import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRosterEditorMarkup } from '../roster-editor-renderer.js';

const escapeText = text => String(text).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char]);
const options = {
    roster: [{ name: 'A<One', count: 2, abilities: { Earth: 3 }, personalities: ['Bold', 'Gentle'] }],
    abilities: [{ name: 'Earth' }, { name: 'Water' }],
    personalityPairs: [{ names: ['Bold', 'Gentle'], letters: ['B', 'G'] }],
    lastBestTeam: [{ ability: 'Earth', count: 1 }],
    abilityTag: name => `<b>${name}</b>`,
    escapeText,
};

test('roster editor renders editable ability levels, available additions, personality radios, and escaped names', () => {
    const before = structuredClone(options.roster);
    const html = buildRosterEditorMarkup(options);
    assert.match(html, /value="A&lt;One"/);
    assert.match(html, /data-level="0\|Earth" value="3" checked/);
    assert.match(html, /data-add="0"/);
    assert.match(html, /<option>Water<\/option>/);
    assert.match(html, /data-personality="0\|0" value="Bold" checked/);
    assert.match(html, /data-count="0\|-1"/);
    assert.match(html, /data-drop="0\|Earth"/);
    assert.deepEqual(options.roster, before);
});

test('roster editor omits ability chooser when full and conditionally offers Best team import', () => {
    const fullRoster = [{ name: '', count: 1, abilities: { Earth: 1, Water: 2 }, personalities: ['Bold', 'Gentle'] }];
    const html = buildRosterEditorMarkup({ ...options, roster: fullRoster, abilities: [{ name: 'Earth' }, { name: 'Water' }], lastBestTeam: [] });
    assert.doesNotMatch(html, /roster-add-ability/);
    assert.doesNotMatch(html, /data-roster="from-best"/);
    assert.match(html, /placeholder="Aniimo 1"/);
});

test('roster editor shows the empty-roster guidance and add action', () => {
    const html = buildRosterEditorMarkup({ ...options, roster: [], lastBestTeam: null });
    assert.match(html, /No Aniimo yet/);
    assert.match(html, /data-roster="add"/);
});
