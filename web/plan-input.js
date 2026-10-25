// Builds the solver input from page state through injected readers and game policies.
// The builder owns the derived exclusions and reservations; it does not read the DOM itself.
export function createPlanInputBuilder(deps) {
    return function buildPlanInputValues() {
        const homeLevel = deps.getHomeLevel();
        const { facilities, modules } = deps.simpleSetup(homeLevel);
        const excluded = [...deps.getExcludedRecipes()];

        const woodlandTier = facilities.Woodland?.[0]?.level || 1;
        const woodlandCropsByLevel = {
            1: ['willow_wood'],
            2: ['bamboo', 'lemon'],
            3: ['cherry_blossom', 'apple', 'maple_syrup', 'quick_bamboo'],
            4: ['palm_bark', 'chestnut', 'walnut', 'quick_lemon'],
            5: ['natural_rubber', 'coconut', 'quick_maple_syrup'],
            6: ['cocoa', 'orange_flower', 'quick_coconut'],
        };
        const keepAppleForSeason = deps.isSeasonActive() && deps.selectedSeasonDishes.has('umbral_pickle');

        if (homeLevel < 20) {
            for (const [level, crops] of Object.entries(woodlandCropsByLevel)) {
                if (Number(level) >= woodlandTier) continue;
                for (const crop of crops) {
                    if (keepAppleForSeason && crop === 'apple') continue;
                    if (!excluded.includes(crop)) excluded.push(crop);
                }
            }
        }

        const craftingTableLevel = facilities['Crafting Table']?.[0]?.level || 1;
        if (craftingTableLevel < 6 && !excluded.includes('pearl')) excluded.push('pearl');

        for (const [rawItem] of Object.entries(deps.quickRecipeUnlocks)) {
            if (deps.isQuickRecipeUnlocked(rawItem, facilities, modules) && !excluded.includes(rawItem)) {
                excluded.push(rawItem);
            }
        }

        if (deps.isSeasonActive()) {
            const optimalDishes = deps.selectOptimalSeasonDishes();
            const needsRockCandy = optimalDishes.some(dish => dish.name === 'moondew_radish_slices' || dish.name === 'harvest_platter');
            const sugarcanePlots = needsRockCandy ? 1 : 0;
            const totalFarmland = facilities.Farmland?.[0]?.count || 0;
            const dedicated = Math.min(totalFarmland, deps.getSeasonRadishPlots() + deps.getSeasonPepperPlots() + sugarcanePlots);
            if (facilities.Farmland?.[0]) {
                facilities.Farmland[0].count = Math.max(0, totalFarmland - dedicated);
            }

            for (const [facility, count] of Object.entries(deps.getSeasonFacilityUsage())) {
                if (facilities[facility]?.[0]) {
                    facilities[facility][0].count = Math.max(0, facilities[facility][0].count - count);
                }
            }
        }

        return {
            home_level: homeLevel,
            currency: 'coins',
            priorities: deps.getActivePriorities(),
            prioritize_byproducts: false,
            level_up: deps.getLevelUpInput(),
            exclude: excluded,
            season: deps.isSeasonActive(),
            emode_facilities: [],
            emode_facility_counts: {},
            power_grid_rate: deps.getPowerGridRate(),
            production_aniimo_cap: deps.getProductionAniimoCap(),
            power_poles: homeLevel >= 12 ? deps.getPowerPoleCount() : 0,
            specialist_quotas: deps.getSpecialistQuotas(),
            facility_overrides: deps.getFacilityOverrides(),
            facilities,
            modules,
        };
    };
}
