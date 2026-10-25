export function createHomeLevelController({
    document, getHomeLevel, renderSimpleSummary, renderStrategy, updateProductionAniimoCap,
    updateSimpleEmodeState, updateSpecialistQuotasLimits, renderSpecialRecipes,
    updatePowerGauge, getLastPlan, displayPlan,
}) {
    function attach() {
        const homeSelect = document.getElementById('home-level');
        if (!homeSelect) return;
        homeSelect.addEventListener('change', () => {
            const level = getHomeLevel();
            renderSimpleSummary();
            renderStrategy();
            updateProductionAniimoCap();
            updateSimpleEmodeState();
            updateSpecialistQuotasLimits(level);
            renderSpecialRecipes();
            updatePowerGauge();
            const plan = getLastPlan();
            if (plan && plan.success) displayPlan(plan);
        });
    }
    return { attach };
}
