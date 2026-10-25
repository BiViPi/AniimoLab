import { buildSeedTableViewModel as defaultBuildSeedTableViewModel, buildProfitBreakdownViewModel as defaultBuildProfitBreakdownViewModel } from './production-summary-renderer.js?v=aniimolab_v1';
import { renderProductBreakdown as defaultRenderProductBreakdownMarkup, renderSeedRequirements as defaultRenderSeedRequirements } from './goal-details-renderer.js?v=aniimolab_v1';

export function createProductionSummaryViewController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    rateUnitSeconds = {},
    getPlanContext = () => null,
    getRecipeIndex = () => null,
    seasonCurrency = '',
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
    prettyItem = name => name,
    formatRate = n => String(n),
    formatNumber = n => String(n),
    perHour = n => String(n),
    getFacilityDisplayName = name => name,
    renderItemIcon,
    renderFacilityIcon,
    getLastPlan = () => null,
    buildSeedTableViewModel = defaultBuildSeedTableViewModel,
    buildProfitBreakdownViewModel = defaultBuildProfitBreakdownViewModel,
    renderProductBreakdownMarkup = defaultRenderProductBreakdownMarkup,
    renderSeedRequirements = defaultRenderSeedRequirements,
} = {}) {
    function renderSeedTable(plan) {
        const card = document?.getElementById?.('seed-card');
        const unitElem = document?.getElementById?.('seed-card-unit');
        const tableElem = document?.getElementById?.('seed-table');
        const select = document?.getElementById?.('rate-unit');

        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const recipeIndex = typeof getRecipeIndex === 'function' ? getRecipeIndex() : null;
        const isVi = isVietnamese();

        const view = buildSeedTableViewModel(plan, {
            unit: select?.value,
            rateUnitSeconds,
            planContext,
            recipeIndex,
            seasonCurrency,
            isVietnamese: isVi,
            prettyItem,
            formatRate,
            getTableHeading: (key, fallback) => (win?.th ? win.th(key, fallback) : fallback),
        });

        if (card?.style) card.style.display = view.visible ? 'flex' : 'none';
        if (unitElem) unitElem.textContent = view.unitText || '';
        if (tableElem) tableElem.innerHTML = view.html || '';
    }

    function renderProfitBreakdown(plan) {
        const card = document?.getElementById?.('profit-card');
        const breakdown = document?.getElementById?.('profit-breakdown');
        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const isVi = isVietnamese();

        const view = buildProfitBreakdownViewModel(plan, {
            isVietnamese: isVi,
            target: planContext?.target,
            formatNumber,
            perHour,
            prettyItem,
            getFacilityDisplayName,
            renderItemIcon,
            renderFacilityIcon,
            getTableHeading: (key, fallback) => (win?.th ? win.th(key, fallback) : fallback),
        });

        if (card?.style) card.style.display = view.visible ? 'block' : 'none';
        if (view.visible && breakdown) {
            breakdown.innerHTML = view.html || '';
        }
    }

    function renderProductBreakdown(goalResult) {
        const section = document?.getElementById?.('product-breakdown-section');
        const select = document?.getElementById?.('rate-unit');
        const rateHeader = document?.getElementById?.('product-breakdown-rate-header');
        const pointsHeader = document?.getElementById?.('product-breakdown-points-header');
        const tbody = document?.getElementById?.('product-breakdown-tbody');
        const lastPlan = typeof getLastPlan === 'function' ? getLastPlan() : null;

        const rendered = renderProductBreakdownMarkup(goalResult, {
            unit: select?.value,
            rateUnitSeconds,
            lastPlan,
            prettyItem,
            formatRate,
            formatNumber,
        });

        if (section?.style) section.style.display = rendered.visible ? 'block' : 'none';
        if (!rendered.visible) return;

        if (rateHeader) rateHeader.innerHTML = rendered.rateHeaderHtml || '';
        if (pointsHeader) pointsHeader.hidden = !!rendered.pointsHidden;
        if (tbody) tbody.innerHTML = rendered.rowsHtml || '';
    }

    function renderSeedsNeeded(goalResult) {
        const section = document?.getElementById?.('seeds-needed-section');
        const tbody = document?.getElementById?.('seeds-needed-tbody');

        const rendered = renderSeedRequirements(goalResult, { prettyItem });

        if (section?.style) section.style.display = rendered.visible ? 'block' : 'none';
        if (rendered.visible && tbody) {
            tbody.innerHTML = rendered.rowsHtml || '';
        }
    }

    return {
        renderSeedTable,
        renderProfitBreakdown,
        renderProductBreakdown,
        renderSeedsNeeded,
    };
}
