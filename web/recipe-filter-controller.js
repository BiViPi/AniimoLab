import { buildRecipeSkipViewModel } from './recipe-skip-renderer.js';
import { createRecipeSkipController } from './recipe-skip-controller.js';

export function createRecipeFilterController({
    document,
    window,
    callWorker,
    specialRecipes = [],
    seasonRecipes = [],
    aniipodTiers = [],
    getUnlockedSpecial,
    getSpecialNames,
    isSeasonActive,
    getSelectedSeasonDishes,
    wantsAniipods,
    bestAniipod,
    prettyItem,
    escapeText,
    saveInputsToStorage,
    runFindPlan,
}) {
    let skippedRecipes = new Set();
    let recipeIndex = [];

    function getSkippedRecipes() {
        return skippedRecipes;
    }

    function setSkippedRecipes(iterable) {
        skippedRecipes = new Set(iterable || []);
        renderSkippedRecipes();
    }

    function getRecipeIndex() {
        return recipeIndex;
    }

    function setRecipeIndex(list) {
        recipeIndex = list || [];
    }

    function recipeLabel(recipe) {
        return `${prettyItem(recipe.name)} (${recipe.facility})`;
    }

    function excludedRecipes() {
        const unlockedSpecial = getUnlockedSpecial ? getUnlockedSpecial() : new Set();
        const lockedSpecial = specialRecipes.map(r => r.name).filter(name => !unlockedSpecial.has(name));
        const seasonActive = isSeasonActive ? isSeasonActive() : false;
        const selectedSeasonDishes = getSelectedSeasonDishes ? getSelectedSeasonDishes() : new Set();

        const lockedSeason = seasonActive
            ? seasonRecipes.map(r => r.name).filter(name => !selectedSeasonDishes.has(name))
            : seasonRecipes.map(r => r.name);

        const wantsPod = wantsAniipods ? wantsAniipods() : false;
        const best = wantsPod && bestAniipod ? bestAniipod() : null;
        const lesser = best ? aniipodTiers.filter(name => name !== best) : [];

        return [...new Set([...skippedRecipes, ...lockedSpecial, ...lockedSeason, ...lesser])];
    }

    function renderRecipeCount() {
        const unlockedSpecial = getUnlockedSpecial ? getUnlockedSpecial() : new Set();
        const specialNames = getSpecialNames ? getSpecialNames() : new Set();
        const countEl = document.getElementById('recipe-count');
        if (!countEl) return;
        countEl.textContent = buildRecipeSkipViewModel({
            unlockedSpecial,
            specialNames,
            skippedRecipes,
            recipeIndex,
            prettyItem,
            escapeText,
        }).countText;
    }

    function renderSkippedRecipes() {
        const unlockedSpecial = getUnlockedSpecial ? getUnlockedSpecial() : new Set();
        const specialNames = getSpecialNames ? getSpecialNames() : new Set();
        const view = buildRecipeSkipViewModel({
            unlockedSpecial,
            specialNames,
            skippedRecipes,
            recipeIndex,
            prettyItem,
            escapeText,
        });

        const countEl = document.getElementById('recipe-count');
        if (countEl) countEl.textContent = view.countText;

        const chipsEl = document.getElementById('skip-chips');
        if (chipsEl) chipsEl.innerHTML = view.chipsHtml;
    }

    function setSkipped(name, skipped) {
        if (skipped) skippedRecipes.add(name);
        else skippedRecipes.delete(name);
        renderSkippedRecipes();
        if (saveInputsToStorage) saveInputsToStorage();
    }

    async function loadRecipeIndex() {
        if (!callWorker) return;
        try {
            const rawItems = JSON.parse(await callWorker('get_all_items'));
            if (window) {
                window.ALL_RECIPES_MAP = new Map(rawItems.map(r => [r.name, r]));
            }
            recipeIndex = rawItems
                .map(r => ({
                    name: r.name,
                    facility: r.facility,
                    cost: r.cost || 0,
                    seasonSeedCost: r.season_seed_cost || 0,
                    environment: r.environment || null,
                    jobs: r.jobs || [],
                    ingredients: r.raw_materials || [],
                    amounts: r.required_amount || [],
                    yieldAmount: r.yield_amount || 1,
                    byproduct: r.byproduct_item || null,
                    byproductAmount: r.byproduct?.[1] || 0,
                    turns: r.sell_currency === 'none'
                }))
                .sort((a, b) => a.facility.localeCompare(b.facility) || a.name.localeCompare(b.name));

            const datalist = document.getElementById('skip-options');
            if (datalist) {
                datalist.innerHTML = recipeIndex.map(r => `<option value="${recipeLabel(r)}"></option>`).join('');
            }
            renderSkippedRecipes();
        } catch (error) {
            console.warn('Could not load the recipe list:', error);
        }
    }

    function attachSkipHandlers() {
        createRecipeSkipController({
            document,
            getRecipeIndex: () => recipeIndex,
            recipeLabel,
            setSkipped,
            runFindPlan,
        }).attach();
    }

    return {
        getSkippedRecipes,
        setSkippedRecipes,
        getRecipeIndex,
        setRecipeIndex,
        recipeLabel,
        excludedRecipes,
        renderRecipeCount,
        renderSkippedRecipes,
        setSkipped,
        loadRecipeIndex,
        attachSkipHandlers,
    };
}
