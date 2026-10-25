export const ABILITY_DEFAULTS = { Perfumery: 3 };

export function createAniimoSetupUIController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    facilities = [],
    abilities = [],
    maxAniimoLevel = 4,
    getWorkerForLevel,
    abilityTag = ability => ability,
    rosterPayload,
    saveInputsToStorage,
    switchAniimoSetup,
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
    confirmPrompt = msg => win?.confirm?.(msg) ?? true,
    initialAniimoLevels = {},
} = {}) {
    let aniimoLevels = { ...initialAniimoLevels };

    const defaultLevelFor = ability => ABILITY_DEFAULTS[ability] ?? maxAniimoLevel;

    function levelledAbilities() {
        const used = new Set(facilities.map(f => f.ability).filter(Boolean));
        const list = typeof abilities === 'function' ? abilities() : abilities;
        return list.map(a => (typeof a === 'string' ? a : a.name)).filter(name => used.has(name));
    }

    function bestAniimoLevel(ability) {
        return aniimoLevels[ability] ?? defaultLevelFor(ability);
    }

    function getAniimoLevels() {
        return { ...aniimoLevels };
    }

    function setAniimoLevels(levels) {
        aniimoLevels = { ...(levels || {}) };
    }

    function aniimoInput(setup) {
        if (setup && setup.startsWith('roster')) {
            const payload = typeof rosterPayload === 'function' ? rosterPayload() : null;
            return { aniimo: 'roster', roster: payload, aniimo_levels: {} };
        }
        const levels = {};
        levelledAbilities().forEach(ability => {
            levels[ability] = bestAniimoLevel(ability);
        });
        return { aniimo: (setup || 'best').split(':')[0], aniimo_levels: levels };
    }

    function selectedSetupTab() {
        if (document?.getElementById?.('aniimo-minimum')?.checked) return 'minimum';
        if (document?.getElementById?.('aniimo-custom')?.checked) return 'custom';
        return 'best';
    }

    function levelPicker(group, chosen, ability, label) {
        const usual = defaultLevelFor(ability);
        return `<span class="tabs level-picker" role="radiogroup" aria-label="${label}">${[1, 2, 3, 4]
            .map(level => {
                const unheardOf = level > usual;
                const w = typeof getWorkerForLevel === 'function' ? getWorkerForLevel(ability, level) : null;
                const wName = w ? ` · ${w.name}${w.is_prismana && level >= 4 ? ' (Prismana)' : ''}` : '';
                const mark = unheardOf
                    ? ` class="unheard-of" title="Chưa có Aniimo ${ability} cấp ${level} trong dữ liệu game"`
                    : ` title="Cấp ${level}${wName}"`;
                const confirm = unheardOf ? ` data-confirm="${ability}"` : '';
                return `<label${mark}><input type="radio" name="${group}" value="${level}"${chosen === level ? ' checked' : ''}${confirm}> ${level}</label>`;
            })
            .join('')}</span>`;
    }

    function renderAbilityLevels() {
        const list = document?.getElementById?.('ability-levels');
        if (!list) return;
        list.innerHTML = levelledAbilities().map(ability => {
            const chosen = bestAniimoLevel(ability);
            const w = typeof getWorkerForLevel === 'function' ? getWorkerForLevel(ability, chosen) : null;
            const isPrismana = w && w.is_prismana && chosen >= 4;
            const avatarHtml = w ? `
            <span class="ability-chosen-avatar ${isPrismana ? 'is-prismana' : ''}" title="${w.name} · Cấp ${chosen}${isPrismana ? ' (Prismana)' : ''}">
                <img class="chosen-avatar-img" src="${w.img_url}" alt="${w.name}" loading="lazy" onerror="this.src='https://aniimoguide.com/images/aniimo/head_round/${w.number || '10011'}.webp'">
                <span class="chosen-worker-name">${w.name}</span>
            </span>` : '';
            return `
            <div class="ability-level">
                <div class="ability-level-info">
                    ${abilityTag(ability)}
                    ${avatarHtml}
                </div>
                ${levelPicker(`level-${ability}`, chosen, ability, `${ability} level`)}
            </div>`;
        }).join('');
    }

    function showAniimoSetup() {
        const isVi = isVietnamese();
        const panel = document?.getElementById?.('aniimo-setup-panel');
        if (panel) panel.hidden = true;
        const levels = document?.getElementById?.('ability-levels');
        if (levels) levels.hidden = true;
        const editor = document?.getElementById?.('roster-editor');
        if (editor) editor.hidden = true;
        const hint = document?.getElementById?.('aniimo-setup-hint');
        if (hint) {
            hint.textContent = isVi ? 'Tổ đội công nhân luôn được tối ưu tự động theo các Aniimo cấp cao nhất.' : 'Workers automatically optimized with best Aniimos.';
        }
        if (typeof switchAniimoSetup === 'function') switchAniimoSetup();
    }

    function attachAniimoSetupHandlers(panelElement) {
        const setupPanel = panelElement || document?.getElementById?.('aniimo-setup-panel');
        if (!setupPanel || !setupPanel.addEventListener) return;

        setupPanel.addEventListener('change', event => {
            const { name, value, checked } = event.target || {};
            const unheardOf = event.target?.dataset?.confirm;
            if (unheardOf && checked) {
                const ok = confirmPrompt(
                    `No level-${value} ${unheardOf} Aniimo is known in the game yet. Plan as though you have one?`
                );
                if (!ok) {
                    showAniimoSetup();
                    return;
                }
            }
            if (name?.startsWith('level-')) {
                aniimoLevels[name.slice('level-'.length)] = Number(value);
            } else {
                return;
            }
            if (typeof saveInputsToStorage === 'function') saveInputsToStorage();
            if (typeof switchAniimoSetup === 'function') switchAniimoSetup();
        });
    }

    return {
        defaultLevelFor,
        levelledAbilities,
        bestAniimoLevel,
        getAniimoLevels,
        setAniimoLevels,
        aniimoInput,
        selectedSetupTab,
        levelPicker,
        renderAbilityLevels,
        showAniimoSetup,
        attachAniimoSetupHandlers,
    };
}
