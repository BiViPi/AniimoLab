export function buildRosterEditorMarkup(options) {
    const cards = options.roster.map((aniimo, index) => {
        const abilities = Object.entries(aniimo.abilities).map(([ability, level]) => `
            <span class="roster-ability">${options.abilityTag(ability)}<span class="tabs level-picker">${[1, 2, 3, 4].map(value =>
            `<label><input type="radio" name="roster-${index}-${ability}" data-level="${index}|${ability}" value="${value}"${value === level ? ' checked' : ''}> ${value}</label>`).join('')}</span><button type="button" class="roster-x" data-drop="${index}|${ability}" aria-label="Remove ${ability}" title="Remove ${ability}">✕</button></span>`).join('');
        const missing = options.abilities.map(ability => ability.name).filter(name => !(name in aniimo.abilities));
        const add = missing.length
            ? `<select class="roster-add-ability" data-add="${index}" aria-label="Add an ability"><option value="">+ Ability</option>${missing.map(name => `<option>${name}</option>`).join('')}</select>`
            : '';
        const personalities = options.personalityPairs.map((pair, pairIndex) => `<span class="tabs level-picker roster-pair" role="radiogroup" aria-label="${pair.names.join(' or ')}">${pair.names.map((name, optionIndex) =>
            `<label title="${name}"><input type="radio" name="roster-${index}-pair-${pairIndex}" data-personality="${index}|${pairIndex}" value="${name}"${aniimo.personalities[pairIndex] === name ? ' checked' : ''}> ${pair.letters[optionIndex]}</label>`).join('')}</span>`).join('');
        return `
            <div class="roster-card">
                <div class="roster-head">
                    <input type="text" class="roster-name" data-name="${index}" value="${options.escapeText(aniimo.name)}" placeholder="Aniimo ${index + 1}" aria-label="Name">
                    <span class="roster-count" title="How many you have that are alike"><button type="button" data-count="${index}|-1" aria-label="One fewer">−</button><span>×${aniimo.count}</span><button type="button" data-count="${index}|1" aria-label="One more">+</button></span>
                    <button type="button" class="roster-x" data-remove="${index}" aria-label="Remove this Aniimo" title="Remove">✕</button>
                </div>
                <div class="roster-abilities">${abilities}${add}</div>
                <div class="roster-personalities">${personalities}</div>
            </div>`;
    }).join('');
    return `${cards || '<p class="hint small">No Aniimo yet. Add the ones you have, or start from the Best plan\'s team.</p>'}
        <div class="roster-actions">
            <button type="button" class="skip-add-btn" data-roster="add">+ Add Aniimo</button>
            ${options.lastBestTeam?.length ? '<button type="button" class="skip-add-btn" data-roster="from-best">Start from the Best team</button>' : ''}
        </div>`;
}
