export function createStrategyFormController({
    document, renderStrategy, setLevelUpTargetChosen, setStock, floatOrDefault, save, runFindPlan,
}) {
    function attach() {
        document.getElementById('strategy-level-up')?.addEventListener('change', renderStrategy);
        document.getElementById('strategy-priorities')?.addEventListener('change', renderStrategy);
        document.getElementById('level-up-target')?.addEventListener('change', () => {
            setLevelUpTargetChosen(true);
            renderStrategy();
        });
        const grid = document.getElementById('level-up-stock-grid');
        grid?.addEventListener('input', event => {
            const name = event.target.dataset.stock;
            if (!name) return;
            setStock(name, Math.max(0, floatOrDefault(event.target.value, 0)));
            save();
        });
        grid?.addEventListener('keypress', event => {
            if (event.key === 'Enter' && event.target.matches('input')) runFindPlan();
        });
    }

    return { attach };
}
