// Pure season optimization policies. Page state, recipe data, and names are injected.
export function selectOptimalSeasonDishes({
    seasonActive,
    radishPlots,
    pepperPlots,
    selectedRecipes,
    dishData,
    getCurrentSetup,
    planRateEstimate = 40,
    crop1SellValue = 74,
    crop2SellValue = 74,
}) {
    if (!seasonActive || (radishPlots <= 0 && pepperPlots <= 0)) return [];
    const userChecked = selectedRecipes || [];
    if (userChecked.length === 0) return [];

    const cycleTime = 1200;
    const yieldPerHarvest = 8;
    const radishPerSec = (radishPlots * yieldPerHarvest) / cycleTime;
    const pepperPerSec = (pepperPlots * yieldPerHarvest) / cycleTime;
    const currentSetup = getCurrentSetup();
    const hasSufficientFacilities = dish => {
        const usage = dish.facilityUsage || { [dish.facility]: 1 };
        return Object.entries(usage).every(([facility, required]) =>
            (currentSetup[facility]?.[0]?.count || 0) >= required
        );
    };

    const evaluated = [];
    const baselineRate = Math.max(15, planRateEstimate || 40);
    for (const recipe of userChecked) {
        const info = dishData[recipe.name];
        if (!info || !hasSufficientFacilities(info)) continue;

        const maxFacilityCapacity = 1 / (info.cycleTime || 203);
        let availableUnits = 0;
        let rawRate = 0;
        if (info.radish > 0 && info.pepper > 0) {
            availableUnits = Math.min(radishPerSec / info.radish, pepperPerSec / info.pepper);
            rawRate = Math.min(availableUnits, maxFacilityCapacity) * (info.radish * crop1SellValue + info.pepper * crop2SellValue);
        } else if (info.radish > 0) {
            availableUnits = radishPerSec / info.radish;
            rawRate = Math.min(availableUnits, maxFacilityCapacity) * (info.radish * crop1SellValue);
        } else if (info.pepper > 0) {
            availableUnits = pepperPerSec / info.pepper;
            rawRate = Math.min(availableUnits, maxFacilityCapacity) * (info.pepper * crop2SellValue);
        }

        const maxUnits = Math.min(availableUnits, maxFacilityCapacity);
        const maxRate = maxUnits * info.sellValue;
        const extraGain = maxRate - rawRate;
        const share = maxRate / (baselineRate + maxRate);
        if (extraGain > 0 && share >= 0.02 && maxUnits > 1e-7) {
            evaluated.push({ ...info, maxUnits, maxRate, extraGain, share });
        }
    }
    if (evaluated.length === 0) return [];

    evaluated.sort((a, b) => b.maxRate - a.maxRate || b.points - a.points);
    if (evaluated.length === 1) return [evaluated[0]];

    const [top1, top2] = evaluated;
    const hasFacilityConflict = (dishA, dishB) => {
        const usageA = dishA.facilityUsage || { [dishA.facility]: 1 };
        const usageB = dishB.facilityUsage || { [dishB.facility]: 1 };
        const facilities = new Set([...Object.keys(usageA), ...Object.keys(usageB)]);
        for (const facility of facilities) {
            if ((usageA[facility] || 0) + (usageB[facility] || 0) > (currentSetup[facility]?.[0]?.count || 0)) return true;
        }
        return false;
    };

    const areComplementarySingles =
        (top1.radish > 0 && top1.pepper === 0 && top2.pepper > 0 && top2.radish === 0) ||
        (top1.pepper > 0 && top1.radish === 0 && top2.radish > 0 && top2.pepper === 0);
    if (areComplementarySingles && !hasFacilityConflict(top1, top2)) return [top1, top2];

    if (top1.radish > 0 && top1.pepper > 0) {
        if (radishPlots > pepperPlots) {
            const singleRadish = evaluated.find(dish => dish.radish > 0 && dish.pepper === 0 && !hasFacilityConflict(top1, dish));
            if (singleRadish && singleRadish.share >= 0.02) return [top1, singleRadish];
        } else if (pepperPlots > radishPlots) {
            const singlePepper = evaluated.find(dish => dish.pepper > 0 && dish.radish === 0 && !hasFacilityConflict(top1, dish));
            if (singlePepper && singlePepper.share >= 0.02) return [top1, singlePepper];
        }
    }
    return [top1];
}

export function getSeasonFacilityUsage(dishes) {
    const usage = {};
    for (const dish of dishes || []) {
        const facilityUsage = dish.facilityUsage || { [dish.facility]: 1 };
        for (const [facility, count] of Object.entries(facilityUsage)) {
            usage[facility] = (usage[facility] || 0) + count;
        }
    }
    return usage;
}

export function calculateOptimalSeasonPlots(dishes, formatDishName = name => name) {
    if (!dishes || dishes.length === 0) return { radish: 0, pepper: 0, dishNames: [] };

    let requiredRadishPerSec = 0;
    let requiredPepperPerSec = 0;
    const dishNames = [];
    for (const dish of dishes) {
        dishNames.push(formatDishName(dish.name));
        const maxFacilityUnits = 1 / (dish.cycleTime || 203);
        if (dish.radish > 0) requiredRadishPerSec += dish.radish * maxFacilityUnits;
        if (dish.pepper > 0) requiredPepperPerSec += dish.pepper * maxFacilityUnits;
    }

    const yieldPerSecPerPlot = 8 / 1200;
    let optimalRadish = requiredRadishPerSec > 0 ? Math.round(requiredRadishPerSec / yieldPerSecPerPlot) : 0;
    let optimalPepper = requiredPepperPerSec > 0 ? Math.round(requiredPepperPerSec / yieldPerSecPerPlot) : 0;
    if (optimalRadish >= 5 && optimalRadish <= 6) optimalRadish = 5;
    if (optimalPepper >= 5 && optimalPepper <= 6) optimalPepper = 5;
    optimalRadish = Math.max(0, Math.min(10, optimalRadish));
    optimalPepper = Math.max(0, Math.min(10, optimalPepper));
    return { radish: optimalRadish, pepper: optimalPepper, dishNames };
}
