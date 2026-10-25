const RAW_ANIIMO_MATERIALS = new Set([
    'aromathyst', 'quick_aromathyst',
    'star', 'quick_star',
    'sea_salt', 'quick_sea_salt', 'pearl',
    'wool', 'quick_wool', 'petals',
    'scales', 'quick_scales',
]);

const SEASON_PROTECTED_ITEMS = new Map([
    ['roasted_waxing_moon_pepper', ['sea_salt', 'quick_sea_salt']],
    ['harvest_platter', ['sea_salt', 'quick_sea_salt', 'rock_candy', 'quick_rock_candy', 'sugarcane', 'fresh_water', 'quick_fresh_water']],
    ['umbral_sweet_and_spicy_sauce', ['sea_salt', 'quick_sea_salt']],
    ['moondew_radish_slices', ['rock_candy', 'quick_rock_candy', 'sugarcane', 'fresh_water', 'quick_fresh_water']],
    ['umbral_hot_pot', ['fresh_water', 'quick_fresh_water']],
]);

export function createPlanPruningPolicy({
    unlockedSpecial = [],
    selectedSeasonDishes = new Set(),
    activePriorities = [],
    seasonActive = false,
    isRV20Endgame = false,
}) {
    if (isRV20Endgame) return null;

    const userPicks = new Set([...unlockedSpecial, ...selectedSeasonDishes, ...activePriorities]);
    if (seasonActive) {
        for (const dish of selectedSeasonDishes) {
            for (const item of SEASON_PROTECTED_ITEMS.get(dish) || []) userPicks.add(item);
        }
    }

    function shouldPruneItem(itemName, share) {
        const baseName = itemName.replace(/^quick_/, '');
        if (userPicks.has(itemName) || userPicks.has(baseName)) return false;
        if (baseName === 'milled_rice') return false;
        return (RAW_ANIIMO_MATERIALS.has(itemName) || RAW_ANIIMO_MATERIALS.has(baseName)) && share <= 0.02;
    }

    return { shouldPruneItem };
}

export async function runPlanPruning({
    plan,
    input,
    bestSetup,
    solve,
    isCurrent = () => true,
    unlockedSpecial = [],
    selectedSeasonDishes = new Set(),
    activePriorities = [],
    seasonActive = false,
    isRV20Endgame = false,
    planContext = null,
}) {
    if (!plan?.success || !plan.income_streams || plan.rate_per_second <= 0) {
        return { plan, input };
    }

    const policy = createPlanPruningPolicy({
        unlockedSpecial,
        selectedSeasonDishes,
        activePriorities,
        seasonActive,
        isRV20Endgame,
    });
    if (!policy) return { plan, input };

    let currentPlan = plan;
    for (let pass = 1; pass <= 3; pass++) {
        const totalRate = currentPlan.rate_per_second;
        if (!totalRate || totalRate <= 0) break;

        const lowShareItems = [];
        for (const stream of currentPlan.income_streams || []) {
            const share = stream.rate_per_second / totalRate;
            if (policy.shouldPruneItem(stream.item_name, share)) {
                const baseName = stream.item_name.replace(/^quick_/, '');
                lowShareItems.push(stream.item_name, baseName, `quick_${baseName}`);
            }
        }

        const uniqueToPrune = [...new Set(lowShareItems)].filter(itemName => !(input.exclude || []).includes(itemName));
        if (uniqueToPrune.length === 0) break;

        const newExclusions = [...new Set([...(input.exclude || []), ...uniqueToPrune])];
        const prunedInput = { ...input, exclude: newExclusions };
        const prunedJson = await solve('find_plan', JSON.stringify({ ...prunedInput, aniimo: bestSetup }));
        if (!isCurrent()) return { plan: currentPlan, input, cancelled: true };

        const prunedPlan = JSON.parse(prunedJson);
        const keepsUserSelections = [...unlockedSpecial].every(spec => {
            const wasInCurrent = (currentPlan?.income_streams || []).some(stream =>
                stream.item_name === spec || stream.item_name.replace(/^quick_/, '') === spec
            );
            if (!wasInCurrent) return true;
            return (prunedPlan?.income_streams || []).some(stream =>
                stream.item_name === spec || stream.item_name.replace(/^quick_/, '') === spec
            );
        });
        const keepsCoins = (prunedPlan?.rate_per_second || 0) >= (currentPlan?.rate_per_second || 0) * (1 - 1e-4);
        const keepsPriorities = (currentPlan?.priorities || []).every(basePriority => {
            const candidatePriority = (prunedPlan?.priorities || []).find(priority => priority.target === basePriority.target);
            return basePriority.per_second <= 1e-6 || (candidatePriority && candidatePriority.per_second >= basePriority.per_second * (1 - 1e-4));
        });
        const isViable = prunedPlan && prunedPlan.success && (!planContext?.levelUp || Boolean(prunedPlan.level_up))
            && keepsUserSelections && keepsCoins && keepsPriorities;
        if (!isViable) break;

        currentPlan = prunedPlan;
        input.exclude = newExclusions;
    }

    return { plan: currentPlan, input };
}
