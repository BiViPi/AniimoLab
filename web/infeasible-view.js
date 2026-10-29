import { buildInfeasibleExplanationMarkup as defaultBuildInfeasibleExplanationMarkup } from './infeasible-explanation.js?v=aniimolab_v1';

export function createInfeasibleViewController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    selectedHomeLevel = () => 1,
    simpleSetup = () => ({ facilities: {} }),
    seasonActive = () => false,
    isLevelUpStrategy = () => true,
    levelUpTarget = () => null,
    getSelectedSeasonDishes = () => new Set(),
    getUnlockedSpecial = () => new Set(),
    getSeasonRadishPlots = () => 0,
    getSeasonPepperPlots = () => 0,
    getProductionAniimoCap = () => 0,
    aniimoMax = [],
    renderFacilityIcon,
    renderItemIcon,
    buildInfeasibleExplanationMarkup = defaultBuildInfeasibleExplanationMarkup,
    isVietnamese = () => {
        if (!win?.i18n) return true;
        return win.i18n.getLang?.() === 'vi';
    },
} = {}) {
    function renderInfeasibleExplanation(_plan = null) {
        const container = document?.getElementById?.('infeasible-explanation-section');
        if (!container) return;

        const currentRv = selectedHomeLevel();
        const { facilities } = simpleSetup(currentRv);
        const ownedCounts = {};
        for (const [name, tiers] of Object.entries(facilities || {})) {
            ownedCounts[name] = (tiers || []).reduce((sum, tier) => sum + (tier.count || 0), 0);
        }

        const isSeason = seasonActive();
        const isLevelUp = isLevelUpStrategy();
        const selectedSeasonDishes = typeof getSelectedSeasonDishes === 'function' ? getSelectedSeasonDishes() : new Set();
        const unlockedSpecial = typeof getUnlockedSpecial === 'function' ? getUnlockedSpecial() : new Set();
        const seasonRadishPlots = typeof getSeasonRadishPlots === 'function' ? getSeasonRadishPlots() : 0;
        const seasonPepperPlots = typeof getSeasonPepperPlots === 'function' ? getSeasonPepperPlots() : 0;
        const isVi = isVietnamese();

        const html = buildInfeasibleExplanationMarkup({
            currentRv,
            isVietnamese: isVi,
            isLevelUp,
            targetRv: isLevelUp ? levelUpTarget() : null,
            isSeason,
            wantsSauce: isSeason && (selectedSeasonDishes?.has?.('wonder_sweet_and_spicy_sauce') || selectedSeasonDishes?.has?.('umbral_sweet_and_spicy_sauce')),
            wantsHotpot: isSeason && (selectedSeasonDishes?.has?.('wonder_pumpkin_pot') || selectedSeasonDishes?.has?.('umbral_hot_pot')),
            hasSpecialGinseng: unlockedSpecial?.has?.('ginseng_congee'),
            eventPlots: isSeason ? seasonRadishPlots + seasonPepperPlots : 0,
            seasonRadishPlots,
            seasonPepperPlots,
            totalFarmland: ownedCounts['Farmland'] || 30,
            ownedCounts,
            currentAniimoCap: isSeason ? 0 : getProductionAniimoCap(),
            maxAniimo: isSeason ? 38 : (aniimoMax[currentRv - 1] || 38),
            renderFacilityIcon,
            renderItemIcon,
        });

        container.innerHTML = html;
        if (container.style) container.style.display = 'block';
    }

    function showError(message = '') {
        const errorEl = document?.getElementById?.('error-message');
        const resultsContent = document?.getElementById?.('results-content');
        const resultsSection = document?.getElementById?.('results-section');
        const infeasibleEl = document?.getElementById?.('infeasible-explanation-section');

        if (resultsSection?.style) resultsSection.style.display = 'block';
        if (resultsContent?.style) resultsContent.style.display = 'none';

        const msgStr = String(message);
        if (
            msgStr.includes('No plan found') ||
            msgStr.includes('infeasible') ||
            msgStr.includes('không thể tìm thấy') ||
            msgStr.includes('no plan found')
        ) {
            if (errorEl?.style) errorEl.style.display = 'none';
            renderInfeasibleExplanation({ success: false, error: message });
            return;
        }

        if (infeasibleEl?.style) infeasibleEl.style.display = 'none';
        if (errorEl) {
            errorEl.textContent = message;
            if (errorEl.style) errorEl.style.display = 'block';
        }
    }

    return {
        renderInfeasibleExplanation,
        showError,
    };
}
