export function createFacilitiesModalController({
    document,
    window,
    callWorker,
    isWasmReady,
    recipeTableRenderer,
    recipeSearchController,
}) {
    let recipesRendered = false;

    function renderRecipeTables(recipes) {
        const container = document.getElementById('facilities-modal-container');
        if (!container) return;
        container.innerHTML = recipeTableRenderer.render(recipes);
        recipeSearchController.filter();
    }

    async function show() {
        document.getElementById('facilitiesModal')?.classList.add('show');
        if (recipesRendered) return;
        if (!isWasmReady()) {
            const hint = document.getElementById('facilities-loading-hint');
            if (hint) hint.textContent = 'Optimizer not ready. Please wait...';
            return;
        }
        try {
            const recipesJson = await callWorker('get_all_items');
            const recipes = JSON.parse(recipesJson);
            renderRecipeTables(recipes);
            recipesRendered = true;
            const hint = document.getElementById('facilities-loading-hint');
            if (hint) hint.style.display = 'none';
        } catch (error) {
            console.error('Failed to load recipe data:', error);
            const hint = document.getElementById('facilities-loading-hint');
            if (hint) hint.textContent = 'Failed to load recipe data. Please refresh the page.';
        }
    }

    function close() {
        document.getElementById('facilitiesModal')?.classList.remove('show');
    }

    function closeOnBackdrop(event) {
        if (event?.target?.id === 'facilitiesModal') {
            close();
        }
    }

    function reset() {
        recipesRendered = false;
    }

    function attachGlobal() {
        if (window) {
            window.showFacilities = show;
            window.closeFacilities = close;
            window.closeFacilitiesOnBackdrop = closeOnBackdrop;
        }
    }

    return {
        show,
        close,
        closeOnBackdrop,
        reset,
        attachGlobal,
        renderRecipeTables,
        get recipesRendered() { return recipesRendered; }
    };
}
