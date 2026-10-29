export const LEGACY_STORAGE_KEY = 'aniimax-config-v1';
export const STORAGE_KEY = 'aniimolab-config-v1';

export function getPersistedFieldIds() {
    return [
        'target-amount', 'current-amount',
        'strategy-level-up', 'strategy-priorities', 'level-up-target',
        'mode-simple', 'mode-advanced', 'home-level',
        'ecological-module-level', 'kitchen-module-level',
        'resource-detector-level', 'crafting-module-level',
        'rate-unit', 'season-on', 'layout-sim-on', 'power-grid-rate',
        'emode-simple-on', 'simple-power-grid-rate',
        'generator-capacity', 'simple-generator-capacity',
        'season-radish-plots', 'season-pepper-plots'
    ];
}

export function migrateSavedConfig(data) {
    if (!data || typeof data !== 'object') return data;
    if (data['mode-simple'] === undefined && data.facilityTiers) {
        data['mode-simple'] = false;
        data['mode-advanced'] = true;
    }
    const tiers = data.facilityTiers;
    if (tiers && tiers.Mine === undefined && tiers['Mineral Pile'] !== undefined) {
        tiers.Mine = tiers['Mineral Pile'];
    }
    if (data['resource-detector-level'] === undefined && data['mineral-detector-level'] !== undefined) {
        data['resource-detector-level'] = data['mineral-detector-level'];
    }
    // Season migration: detect season transition when season config exists
    const currentSeasonId = 'magical_wonder_night';
    if (data.seasonId !== undefined || data['season-on'] !== undefined || data.seasonRadishPlots !== undefined) {
        if (data.seasonId !== currentSeasonId) {
            data.seasonId = currentSeasonId;
            data['season-on'] = false;
            data.seasonRadishPlots = 2;
            data.seasonPepperPlots = 2;
            data['season-radish-plots'] = '2';
            data['season-pepper-plots'] = '2';
            delete data.selectedSeasonDishes;
        }
    }
    return data;
}

export function readSavedConfig({ storage, onError = () => {} }) {
    try {
        const raw = storage.getItem(STORAGE_KEY) || storage.getItem(LEGACY_STORAGE_KEY);
        return raw ? migrateSavedConfig(JSON.parse(raw)) : null;
    } catch (error) {
        onError(error);
        return null;
    }
}

export function buildSavedConfig(state, { document, fieldIds = getPersistedFieldIds(), seasonExpired = false }) {
    const data = { ...state };
    fieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        data[id] = (element.type === 'checkbox' || element.type === 'radio') ? element.checked : element.value;
    });
    if (seasonExpired) data['season-on'] = false;
    return data;
}

export function persistSavedConfig({ storage, key = STORAGE_KEY, data, onError = () => {} }) {
    try {
        storage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        onError(error);
        return false;
    }
}

export function attachPersistedFieldAutosave({ document, fieldIds = getPersistedFieldIds(), save }) {
    fieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (!element) return;
        const eventName = (element.type === 'checkbox' || element.type === 'radio' || element.tagName === 'SELECT')
            ? 'change'
            : 'input';
        element.addEventListener(eventName, save);
    });
}

export function removeSavedConfig({ storage, key = STORAGE_KEY, onError = () => {} }) {
    try {
        storage.removeItem(key);
        return true;
    } catch (error) {
        onError(error);
        return false;
    }
}

export function applySavedFields(data, { document, fieldIds = getPersistedFieldIds() }) {
    if (!data) return;
    fieldIds.forEach(id => {
        if (!(id in data)) return;
        const element = document.getElementById(id);
        if (!element) return;
        if (element.type === 'checkbox' || element.type === 'radio') {
            element.checked = !!data[id];
        } else {
            element.value = data[id];
        }
    });
}

export function restoreSavedState(data, { abilityNames, priorityTargets, personalityPairs }) {
    if (!data) return null;
    const restored = {};
    if (typeof data.seasonRadishPlots === 'number') restored.seasonRadishPlots = data.seasonRadishPlots;
    if (typeof data.seasonPepperPlots === 'number') restored.seasonPepperPlots = data.seasonPepperPlots;
    if (Array.isArray(data.selectedSeasonDishes)) restored.selectedSeasonDishes = data.selectedSeasonDishes.filter(name => typeof name === 'string');
    if (Array.isArray(data.emodeFacilities)) restored.emodeFacilities = [...data.emodeFacilities];
    if (data.levelUpStock && typeof data.levelUpStock === 'object') restored.levelUpStock = { ...data.levelUpStock };
    if (Array.isArray(data.skippedRecipes)) restored.skippedRecipes = data.skippedRecipes.filter(name => typeof name === 'string');
    if (Array.isArray(data.unlockedSpecial)) restored.unlockedSpecial = data.unlockedSpecial.filter(name => typeof name === 'string');

    if (Array.isArray(data.priorities)) {
        const validIds = priorityTargets.map(target => target.id);
        const saved = data.priorities.filter(priority => validIds.includes(priority?.target));
        const missing = priorityTargets.filter(target => !saved.some(priority => priority.target === target.id))
            .map(target => ({ target: target.id, on: false }));
        restored.priorities = saved.length === 0
            ? priorityTargets.map(target => ({ target: target.id, on: false }))
            : [...saved.map(priority => ({ target: priority.target, on: !!priority.on })), ...missing];
    } else {
        restored.priorities = priorityTargets.map(target => ({ target: target.id, on: false }));
    }

    if (data.aniimoLevels && typeof data.aniimoLevels === 'object') {
        restored.aniimoLevels = Object.fromEntries(Object.entries(data.aniimoLevels)
            .filter(([ability, level]) => abilityNames.has(ability) && Number.isInteger(Number(level)) && level >= 1 && level <= 4)
            .map(([ability, level]) => [ability, Number(level)]));
    }
    if (Array.isArray(data.roster)) {
        restored.roster = data.roster
            .filter(member => member && typeof member === 'object' && member.abilities && typeof member.abilities === 'object')
            .map(member => ({
                name: typeof member.name === 'string' ? member.name : '',
                count: Math.max(1, Math.round(Number(member.count)) || 1),
                abilities: Object.fromEntries(Object.entries(member.abilities)
                    .filter(([ability, level]) => abilityNames.has(ability) && Number.isInteger(Number(level)) && level >= 1 && level <= 4)
                    .map(([ability, level]) => [ability, Number(level)])),
                personalities: personalityPairs.map((pair, index) => pair.names.includes(member.personalities?.[index]) ? member.personalities[index] : pair.names[0]),
            }));
    }
    return restored;
}
