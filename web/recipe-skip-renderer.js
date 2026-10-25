export function buildRecipeSkipViewModel({ unlockedSpecial, specialNames, skippedRecipes, recipeIndex, prettyItem, escapeText }) {
    const parts = [];
    const unlockedCount = [...unlockedSpecial].filter(name => specialNames.has(name)).length;
    if (unlockedCount) parts.push(`${unlockedCount} on`);
    if (skippedRecipes.size) parts.push(`${skippedRecipes.size} skipped`);
    const facilityByName = new Map(recipeIndex.map(recipe => [recipe.name, recipe.facility]));
    const chipsHtml = [...skippedRecipes]
        .sort((a, b) => prettyItem(a).localeCompare(prettyItem(b)))
        .map(name => {
            const facility = facilityByName.get(name);
            return `<span class="skip-chip">${escapeText(prettyItem(name))}${facility ? ` <span class="skip-chip-facility">${facility}</span>` : ''}<button type="button" data-unskip="${escapeText(name)}" aria-label="Stop skipping ${escapeText(prettyItem(name))}" title="Stop skipping">✕</button></span>`;
        }).join('');
    return { countText: parts.length ? ` (${parts.join(', ')})` : '', chipsHtml };
}
