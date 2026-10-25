export function mergeAniimoSummaryMembers(members) {
    if (!Array.isArray(members) || members.length <= 1) return members || [];
    const merged = [];
    const byKey = new Map();
    for (const member of members) {
        const key = `${member.facility}|${member.worker}|${member.ability}|${member.level}|${member.specific || ''}`;
        if (byKey.has(key)) {
            const existing = byKey.get(key);
            existing.count = (existing.count || 0) + (member.count || 0);
        } else {
            const copy = { ...member };
            byKey.set(key, copy);
            merged.push(copy);
        }
    }
    return merged;
}

export function renderAniimoSummaryMemberRow(member, options) {
    const badge = options.renderBadge(
        member.ability,
        member.level,
        member.count,
        `${member.worker || member.name} · ${member.desc || ''}`,
        false,
        member.specific || ''
    );
    const workerDisplayName = member.worker || member.name;
    const abilityTheme = options.abilityThemes[member.ability] || { color: '#888', icon: '🐾', vi: member.ability };
    const abilityName = options.isVi && options.viAbilities[member.ability]
        ? options.viAbilities[member.ability]
        : (abilityTheme.vi || member.ability);
    const countDisplay = typeof member.count === 'number' ? `${member.count}×` : member.count;

    return `
            <tr>
                <td class="col-facility" data-label="${options.isVi ? 'Tên cơ sở / Nhiệm vụ' : 'Facility / Task'}">
                    <div style="display: flex; flex-direction: column; gap: 2px;">
                        <strong>${member.facility}</strong>
                        ${member.desc ? `<span class="hint small" style="font-size: 0.73rem; opacity: 0.85;">${member.desc}</span>` : ''}
                    </div>
                </td>
                <td class="col-worker" data-label="${options.isVi ? 'Loại Aniimo' : 'Aniimo Worker'}">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        ${badge}
                        <div>
                            <div><strong>${workerDisplayName}</strong></div>
                            <span class="crew-ability-pill" style="--ability-color: ${abilityTheme.color}; font-size: 0.68rem; padding: 1px 5px; border-radius: 4px;">
                                <span>${abilityTheme.icon || '🐾'}</span>
                                <span class="elem-name">${abilityName} Lv.${member.level}</span>
                            </span>
                        </div>
                    </div>
                </td>
                <td class="col-count" data-label="${options.isVi ? 'Số lượng' : 'Count'}">
                    <span class="crew-count-badge" style="font-size: 0.82rem; padding: 0.15rem 0.5rem;">${countDisplay}</span>
                </td>
            </tr>
        `;
}

export function renderAniimoEmptySummaryRow(text) {
    return `
        <tr>
            <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 0.75rem; font-style: italic;">
                ${text}
            </td>
        </tr>
    `;
}

export function renderAniimoAbilityStrip(options) {
    const needed = new Map(options.abilities.map(ability => [ability.name, 0]));
    for (const member of options.members) needed.set(member.ability, (needed.get(member.ability) || 0) + member.count);

    return options.abilities.map(ability => {
        const countNeeded = needed.get(ability.name) || 0;
        const allMembers = options.members.filter(member => member.ability === ability.name);
        const badges = allMembers.map(member => {
            const tip = `${member.count > 1 ? `${member.count}× ` : ''}${member.name || member.worker} · ${member.desc || ''}`;
            return options.renderBadge(member.ability, member.level, member.count, tip, false, member.specific || '');
        });
        if (ability.name === 'Hauling' && badges.length === 0) {
            badges.push(options.renderBadge('Hauling', '·', 1,
                options.isVi ? 'Rookey kiêm nhiệm đưa nông sản vào kho' : 'Rookey handles warehouse hauling', false, 'Rookey'));
        }
        const stack = badges.length ? `<div class="ability-stack">${badges.join('')}</div>` : '';
        const abilityName = options.isVi && options.viAbilities[ability.name] ? options.viAbilities[ability.name] : ability.name;
        return `<div class="ability-col" style="--ability:${ability.color}">
            <div class="ability-cell${countNeeded === 0 ? ' zero' : ''}" title="${abilityName}: ${ability.about}">
                <span class="ability-count">${countNeeded}</span><span class="ability-name">${abilityName}</span>
            </div>${stack}</div>`;
    }).join('');
}
