export function buildRejectedInsight(options) {
    const {
        isVi, woodlandInsight = {}, woodlandTier, sortedStreams = [], activeItemNames = new Set(),
        simpleSetup, homeLevel, producing = [], rivalInsights = {}, seasonIsActive = false,
        selectedSeasonDishCount = 0, plan = {},
    } = options;
    const {
        hasWoodland, hasLevelUp, lowerTierTreesExampleVi, lowerTierTreesExampleEn,
        lowerTierMaxYield, maxYieldPerTree, targetWoodItemName, targetRv,
    } = woodlandInsight;
    const rejectedBullets = [];

    if (hasWoodland && hasLevelUp && woodlandTier > 1) {
        if (isVi) {
            rejectedBullets.push(`<strong>Không trồng cây cấp thấp ở Vườn ươm:</strong> Cây cấp thấp (${lowerTierTreesExampleVi}...) chỉ cho từ 1 đến ${lowerTierMaxYield} vụn gỗ/ô (thấp hơn nhiều so với ${maxYieldPerTree} vụn gỗ của cây Cấp ${woodlandTier} cao nhất), sẽ làm sụt giảm sản lượng ${targetWoodItemName} và kéo dài thời gian lên RV ${targetRv}.`);
        } else {
            rejectedBullets.push(`<strong>No lower-tier Woodland trees:</strong> Lower-tier trees (${lowerTierTreesExampleEn}...) yield only 1–${lowerTierMaxYield} wood blocks vs ${maxYieldPerTree} from top Tier ${woodlandTier}, severely throttling ${targetWoodItemName} output and delaying RV ${targetRv}.`);
        }
    }

    const processedRivals = new Set();
    for (const stream of sortedStreams.slice(0, 3)) {
        const itemKey = stream.item_name.replace(/^quick_/, '').replace(/__(specialist|manual)$/, '');
        const rivalInfo = rivalInsights[itemKey];
        if (!rivalInfo || activeItemNames.has(rivalInfo.rival) || processedRivals.has(rivalInfo.rival)) continue;
        processedRivals.add(rivalInfo.rival);

        let totalFacCount = 1;
        try {
            const facSetup = simpleSetup(homeLevel).facilities[rivalInfo.facility];
            totalFacCount = facSetup?.[0]?.count || 1;
        } catch {
            totalFacCount = 1;
        }
        const producingFacSteps = producing.filter(step => {
            const rawFac = step.facility ? step.facility.replace(/ \((Manual|Electric|Prismana)\)$/, '').trim() : '';
            return rawFac === rivalInfo.facility;
        });
        const allocatedFacCount = producingFacSteps.reduce((sum, step) => sum + (step.facility_count || 1), 0);
        const idleFacCount = Math.max(0, totalFacCount - allocatedFacCount);
        const ctx = {
            total: totalFacCount,
            allocated: allocatedFacCount,
            idle: idleFacCount,
            homeLevel,
            facName: rivalInfo.facilityVi,
            facNameEn: rivalInfo.facility,
            facCountTextVi: totalFacCount > 1 ? `sở hữu ${totalFacCount} cơ sở` : `chỉ có 1 cơ sở duy nhất`,
            facCountTextEn: totalFacCount > 1 ? `${totalFacCount} units owned` : `only 1 unit available`,
        };
        const reasonViText = typeof rivalInfo.reasonVi === 'function' ? rivalInfo.reasonVi(ctx) : rivalInfo.reasonVi;
        const reasonEnText = typeof rivalInfo.reasonEn === 'function' ? rivalInfo.reasonEn(ctx) : rivalInfo.reasonEn;
        rejectedBullets.push(isVi
            ? `<strong>Không làm ${rivalInfo.rivalNameVi} (${rivalInfo.facilityVi}):</strong> ${reasonViText}`
            : `<strong>No ${rivalInfo.rivalNameEn} (${rivalInfo.facility}):</strong> ${reasonEnText}`);
    }

    if (seasonIsActive && selectedSeasonDishCount > 0) {
        rejectedBullets.push(isVi
            ? `<strong>Ưu tiên công thức Sự kiện Mùa vụ:</strong> Khóa các ô nông trại chuyên dụng cho nông sản sự kiện để gom nguyên liệu đổi thưởng mùa vụ, chủ động chấp nhận điều chỉnh nhẹ doanh thu coin thuần túy để hoàn thành nhiệm vụ sự kiện.`
            : `<strong>Prioritizing Seasonal dishes:</strong> Dedicated plots reserved for festival crops to farm event rewards, intentionally trading off pure coin optimization for season progression.`);
    }

    const idleCount = (plan.coin_items || []).filter(item => item.status === 'not_needed' || item.status === 'idle').length;
    if (idleCount > 0) {
        rejectedBullets.push(isVi
            ? `<strong>Các cơ sở chế biến để trống (${idleCount}):</strong> Bộ giải LP đã loại bỏ các công thức phụ có biên lợi nhuận thấp để dồn trọn vẹn nhân công Aniimo và điện năng cho chuỗi sản phẩm chủ lực.`
            : `<strong>Idle processing facilities (${idleCount}):</strong> The LP simplex solver pruned low-margin secondary recipes to concentrate worker labor and watts on peak-profit drivers.`);
    }

    if (rejectedBullets.length === 0) {
        rejectedBullets.push(isVi
            ? `<strong>Toàn bộ cơ sở và công thức được tối ưu hóa:</strong> Không có chuỗi phụ nào bị loại bỏ; tất cả tài nguyên đất đai, máy móc và nhân công đều đang vận hành ở công suất tối ưu.`
            : `<strong>Fully optimized setup:</strong> No viable chains pruned; all available land, machines, and worker labor are operating at peak efficiency.`);
    }
    return {
        title: isVi ? '🚫 Tại sao không chọn các phương án khác?' : '🚫 Why Alternatives Were Rejected',
        description: `<ul class="insight-bullets">${rejectedBullets.map(bullet => `<li>${bullet}</li>`).join('')}</ul>`,
    };
}
