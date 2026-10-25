export function createRecipeSkipController({ document, getRecipeIndex, recipeLabel, setSkipped, runFindPlan }) {
    function addSkipFromInput() {
        const input = document.getElementById('skip-input');
        const text = input.value.trim().toLowerCase();
        if (!text) return;
        const recipes = getRecipeIndex();
        let match = recipes.find(recipe => recipeLabel(recipe).toLowerCase() === text);
        if (!match) {
            const partial = recipes.filter(recipe => recipeLabel(recipe).toLowerCase().includes(text));
            if (partial.length === 1) match = partial[0];
        }
        if (!match) {
            input.setCustomValidity('Pick a recipe from the list.');
            input.reportValidity();
            return;
        }
        input.setCustomValidity('');
        input.value = '';
        setSkipped(match.name, true);
    }

    function attach() {
        document.getElementById('skip-add-btn').addEventListener('click', addSkipFromInput);
        const input = document.getElementById('skip-input');
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addSkipFromInput();
            }
        });
        input.addEventListener('input', () => input.setCustomValidity(''));
        document.getElementById('skip-chips').addEventListener('click', event => {
            const name = event.target.closest('[data-unskip]')?.dataset.unskip;
            if (name) setSkipped(name, false);
        });
        document.getElementById('facility-plan-container').addEventListener('click', event => {
            const name = event.target.closest('[data-skip]')?.dataset.skip;
            if (!name) return;
            setSkipped(name, true);
            runFindPlan();
        });
    }

    return { attach, addSkipFromInput };
}
