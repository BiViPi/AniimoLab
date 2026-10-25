export function createFacilityTierController({ document, getFacilityTiers, renderTierRows, saveInputsToStorage, runFindPlan, numberOrDefault }) {
    function attach() {
        const grid = document.getElementById('facilities-grid');
        if (!grid) return;

        grid.addEventListener('input', event => {
            const row = event.target.closest('.tier-row');
            if (!row) return;
            const container = event.target.closest('.facility-tiers');
            const name = container.dataset.facility;
            const index = Number.parseInt(row.dataset.tierIndex, 10);
            const tier = getFacilityTiers()[name][index];
            if (event.target.classList.contains('tier-count')) tier.count = numberOrDefault(event.target.value, 0);
            else if (event.target.classList.contains('tier-level')) tier.level = numberOrDefault(event.target.value, 1);
            saveInputsToStorage();
        });

        grid.addEventListener('click', event => {
            const addButton = event.target.closest('.add-tier-btn');
            if (addButton) {
                const name = addButton.dataset.facility;
                const tiers = getFacilityTiers()[name];
                const nextLevel = Math.min(10, Math.max(...tiers.map(tier => tier.level)) + 1);
                tiers.push({ count: 1, level: nextLevel });
                renderTierRows(name);
                saveInputsToStorage();
                return;
            }
            const removeButton = event.target.closest('.tier-remove-btn');
            if (!removeButton) return;
            const row = removeButton.closest('.tier-row');
            const container = removeButton.closest('.facility-tiers');
            const name = container.dataset.facility;
            const index = Number.parseInt(row.dataset.tierIndex, 10);
            getFacilityTiers()[name].splice(index, 1);
            renderTierRows(name);
            saveInputsToStorage();
        });

        grid.addEventListener('keypress', event => {
            if (event.key === 'Enter' && event.target.matches('input')) runFindPlan();
        });
    }

    return { attach };
}
