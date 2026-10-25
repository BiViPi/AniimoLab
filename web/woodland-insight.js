const WOOD_YIELDS_BY_TIER = { 1: 1, 2: 8, 3: 21, 4: 47, 5: 75, 6: 122 };
const LOWER_TIER_TREES_VI = {
    2: 'Liễu',
    3: 'Liễu, Tre, Chanh',
    4: 'Liễu, Tre, Anh đào, Táo',
    5: 'Liễu, Tre, Hạt dẻ, Quả óc chó',
    6: 'Liễu, Tre, Cao su, Cây dừa'
};
const LOWER_TIER_TREES_EN = {
    2: 'Willow',
    3: 'Willow, Bamboo, Lemon',
    4: 'Willow, Bamboo, Cherry Blossom, Apple',
    5: 'Willow, Bamboo, Chestnut, Walnut',
    6: 'Willow, Bamboo, Rubber, Coconut'
};
const WOOD_ITEMS = ['wood_block', 'rough_lumber', 'standard_planks', 'laminated_beams', 'densified_timber_component'];

export function buildWoodlandInsight(options) {
    const { plan, planContext, homeLevel, isVi, woodlandTier, levelUpCosts, producing } = options;
    const maxYieldPerTree = WOOD_YIELDS_BY_TIER[woodlandTier] || 47;
    const lowerTierMaxYield = WOOD_YIELDS_BY_TIER[woodlandTier - 1] || 1;
    const lowerTierTreesExampleVi = LOWER_TIER_TREES_VI[woodlandTier] || 'Liễu, Tre';
    const lowerTierTreesExampleEn = LOWER_TIER_TREES_EN[woodlandTier] || 'Willow, Bamboo';

    const woodlandSteps = producing.filter(step => step.facility === 'Woodland');
    const woodlandPlotsByCrop = {};
    for (const step of woodlandSteps) {
        if (step.item_name) woodlandPlotsByCrop[step.item_name] = (woodlandPlotsByCrop[step.item_name] || 0) + (step.facility_count || 1);
    }
    const woodlandSummary = Object.entries(woodlandPlotsByCrop)
        .map(([crop, count]) => `${count} cây ${options.prettyItem(crop)}`)
        .join(', ');
    const totalTrees = Object.values(woodlandPlotsByCrop).reduce((sum, count) => sum + count, 0);
    const totalHourlyWood = totalTrees * maxYieldPerTree * 2;

    const hasLevelUp = !!(plan.level_up && planContext?.levelUp);
    const targetRv = planContext?.target || (plan.level_up ? homeLevel + 1 : null);
    const levelUpDurationText = plan.level_up ? options.formatDuration(plan.level_up.seconds) : '';
    const targetRvRequirements = levelUpCosts[targetRv]?.items || [];
    const targetWoodItemEntry = targetRvRequirements.find(([name]) => WOOD_ITEMS.includes(name));
    const targetWoodItemKey = targetWoodItemEntry ? targetWoodItemEntry[0]
        : targetRv <= 6 ? 'wood_block'
            : targetRv <= 10 ? 'rough_lumber'
                : targetRv <= 14 ? 'standard_planks'
                    : targetRv <= 18 ? 'laminated_beams'
                        : 'densified_timber_component';
    const targetWoodItemName = options.prettyItem(targetWoodItemKey);
    const woodCostRow = (plan.level_up?.requirements || []).find(row => row.name === targetWoodItemKey || row.name.includes(targetWoodItemKey));
    const woodItemHourly = woodCostRow ? options.perHour(woodCostRow.per_second) : '';
    const hasWoodland = woodlandSteps.length > 0;

    let cardHtml = '';
    if (hasLevelUp && targetRv) {
        const title = isVi ? `🚀 Đã chọn: Tiến độ nâng cấp RV ${targetRv} & Lâm nghiệp` : `🚀 Selected: RV ${targetRv} Progression & Woodland`;
        const woodRateText = woodItemHourly ? `<strong>${woodItemHourly} ${targetWoodItemName} / giờ</strong>` : `<strong>${targetWoodItemName}</strong>`;
        const description = isVi
            ? `Mục tiêu hoàn thành trong <strong>${levelUpDurationText || 'kế hoạch tối ưu'}</strong>.<br>`
              + `• Vườn ươm bố trí <strong>${woodlandSummary || `${totalTrees} cây cấp cao nhất`}</strong>.<br>`
              + `<em><strong>Tại sao chọn:</strong> Khóa Vườn ươm ở cây cấp cao nhất (Cấp ${woodlandTier}) để tối đa hóa <strong>${maxYieldPerTree} Vụn gỗ / cây / vụ</strong> (~${options.formatNumber(totalHourlyWood)} vụn gỗ/giờ nhờ 2 vụ/h có tưới nước). Nguồn gỗ này duy trì Bàn mộc ép liên tục ${woodRateText}, giải quyết nút thắt chậm nhất để cán đích RV ${targetRv} sớm nhất.</em>`
            : `Target RV ${targetRv} completion in <strong>${levelUpDurationText || 'optimal time'}</strong>.<br>`
              + `• Woodland deployed with <strong>${woodlandSummary || `${totalTrees} top-tier trees`}</strong>.<br>`
              + `<em><strong>Why selected:</strong> Locked strictly to highest unlocked trees (Tier ${woodlandTier}) for max <strong>${maxYieldPerTree} Wood Blocks/tree/cycle</strong> (~${options.formatNumber(totalHourlyWood)} blocks/hr via watered 2 cycles/hr). Feeds Woodworking Bench to craft ${woodRateText}, clearing the longest bottleneck to RV ${targetRv}.</em>`;
        cardHtml = `
            <div class="insight-item insight-selected">
                <div class="insight-label">${title}</div>
                <div class="insight-desc">${description}</div>
            </div>`;
    }

    return {
        cardHtml,
        hasLevelUp,
        targetRv,
        targetWoodItemName,
        woodItemHourly,
        woodlandTier,
        maxYieldPerTree,
        lowerTierMaxYield,
        lowerTierTreesExampleVi,
        lowerTierTreesExampleEn,
        woodlandSummary,
        totalTrees,
        totalHourlyWood,
        hasWoodland,
    };
}
