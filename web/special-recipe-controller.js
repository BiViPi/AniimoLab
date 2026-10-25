export function createSpecialRecipeController({ grid, selectedNames, renderRecipeCount, save }) {
    function attach() {
        if (!grid) return;
        grid.addEventListener('change', event => {
            const name = event.target.dataset.special;
            if (!name) return;
            if (event.target.checked) selectedNames.add(name);
            else selectedNames.delete(name);
            event.target.closest('.special-recipe-card')?.classList.toggle('active', event.target.checked);
            renderRecipeCount();
            save();
        });
    }
    return { attach };
}
