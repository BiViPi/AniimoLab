import { buildFacilityCardsMarkup as defaultBuildFacilityCardsMarkup, buildTierRowsMarkup as defaultBuildTierRowsMarkup } from './facility-setup-renderer.js?v=aniimolab_v1';
import { createFacilityTierController as defaultCreateFacilityTierController } from './facility-tier-controller.js?v=aniimolab_v1';

export function createFacilitySetupController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    facilities = [],
    categories = [],
    emodeFacilities = new Set(),
    getFacilityTiers = () => ({}),
    setFacilityTiers = () => {},
    getFacilityDisplayName = name => name,
    getCategoryDisplayName = category => (win?.i18n ? win.i18n.getCategoryDisplayName(category) : undefined),
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
    saveInputsToStorage,
    runFindPlan,
    numberOrDefault = (val, def) => {
        const n = parseInt(val, 10);
        return Number.isNaN(n) ? def : n;
    },
    buildTierRowsMarkup = defaultBuildTierRowsMarkup,
    buildFacilityCardsMarkup = defaultBuildFacilityCardsMarkup,
    createFacilityTierController = defaultCreateFacilityTierController,
} = {}) {
    function defaultFacilityTiers() {
        const tiers = {};
        facilities.forEach(f => {
            tiers[f.name] = [{ count: f.defaultCount, level: 1 }];
        });
        return tiers;
    }

    function renderTierRows(name) {
        const f = facilities.find(fac => fac.name === name);
        const container = document?.querySelector?.(`.facility-tiers[data-facility="${name}"]`);
        if (!f || !container) return;
        const tiers = getFacilityTiers();
        container.innerHTML = buildTierRowsMarkup(f, tiers[name]);
    }

    function renderFacilityCards() {
        const grid = document?.getElementById?.('facilities-grid');
        if (!grid) return;
        const isVi = isVietnamese();
        grid.innerHTML = buildFacilityCardsMarkup({
            categories,
            facilities,
            isVietnamese: isVi,
            emodeFacilities,
            getFacilityDisplayName,
            getCategoryDisplayName,
        });
        facilities.forEach(f => renderTierRows(f.name));
    }

    function initFacilityTiers(data) {
        const defaults = defaultFacilityTiers();
        const saved = (data && data.facilityTiers) || {};
        const tiers = {};
        facilities.forEach(f => {
            const list = saved[f.name];
            tiers[f.name] = Array.isArray(list) && list.length > 0
                ? list.map(t => ({
                    count: numberOrDefault(t.count, 0),
                    level: f.hasLevels === false ? 1 : numberOrDefault(t.level, 1),
                }))
                : defaults[f.name];
        });
        setFacilityTiers(tiers);
    }

    function attachFacilityTierHandlers() {
        if (typeof createFacilityTierController !== 'function') return;
        const controller = createFacilityTierController({
            document,
            getFacilityTiers,
            renderTierRows,
            saveInputsToStorage,
            runFindPlan,
            numberOrDefault,
        });
        if (controller && typeof controller.attach === 'function') {
            controller.attach();
        }
    }

    return {
        defaultFacilityTiers,
        renderTierRows,
        renderFacilityCards,
        initFacilityTiers,
        attachFacilityTierHandlers,
    };
}
