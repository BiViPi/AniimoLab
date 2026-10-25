// Bảng phân tích đối trọng (Rival Analysis) cho các sản phẩm chủ lực và đối thủ cạnh tranh trực tiếp
export const RECIPE_RIVAL_INSIGHTS = {
    'cranberry_chocolate': {
        rival: 'strawberry_cream_puff',
        rivalNameVi: 'Bánh Su Kem Dâu Tây',
        rivalNameEn: 'Strawberry Cream Puff',
        facility: 'Blazing Stove',
        facilityVi: 'Bếp Lò Rực Rửa',
        reasonVi: (ctx) => {
            if (ctx.allocated < ctx.total) {
                return `${ctx.facName} (sở hữu ${ctx.total} cơ sở): Solver chỉ sử dụng <strong>${ctx.allocated} cơ sở</strong> cho <strong>Sô-cô-la Nam Việt Quất</strong> (${ctx.idle} cơ sở để trống). Do quỹ đất Nông trại và Vườn ươm dồn tối đa cho cây lấy gỗ ép nâng cấp RV 19 và Cacao, nguồn nguyên liệu chỉ đủ vận hành ${ctx.allocated} lò. Solver không dùng lò còn lại làm Bánh Su Kem Dâu Tây vì việc gánh thêm 16 Dâu tây + Bột mì tinh chế + Dầu dừa sẽ làm phân mảnh đất và làm chậm tiến độ nâng cấp.`;
            }
            return `${ctx.facName} (${ctx.total > 1 ? `sở hữu ${ctx.total} cơ sở` : 'chỉ có 1 cơ sở'}): Solver dồn toàn bộ ${ctx.total > 1 ? `cả ${ctx.total} cơ sở` : 'công suất'} cho <strong>Sô-cô-la Nam Việt Quất</strong> (giá bán 13.480 coin vs 5.650 coin của Bánh su kem). Đồng thời, chuỗi Sô-cô-la tận dụng trực tiếp quả Cacao từ Vườn ươm (đang trồng Cacao lấy 122 vụn gỗ/cây để nâng cấp RV 19), trong khi Bánh su kem đòi hỏi 16 Dâu tây + Bột mì tinh chế + Dầu dừa sẽ làm phân tán diện tích Đất nông nghiệp.`;
        },
        reasonEn: (ctx) => {
            if (ctx.allocated < ctx.total) {
                return `The ${ctx.facNameEn} (${ctx.total} units owned): The solver operates only <strong>${ctx.allocated} unit</strong> for <strong>Cranberry Chocolate</strong> (leaving ${ctx.idle} idle). Farmland and Woodland plots prioritize RV 19 timber and Cocoa, yielding ingredients for only ${ctx.allocated} stove. The remaining stove is not used for Strawberry Cream Puff because requiring 16 Strawberries + Refined Flour + Coconut Oil would fragment farmland.`;
            }
            return `The ${ctx.facNameEn} (${ctx.total > 1 ? `${ctx.total} units owned` : 'only 1 unit'}): The solver allocates all ${ctx.total > 1 ? `${ctx.total} units` : 'available capacity'} to <strong>Cranberry Chocolate</strong> (sell value 13,480 coins vs 5,650 coins for Cream Puff). Furthermore, Cranberry Chocolate synergizes with Cocoa harvested from Woodland (planted for 122 Wood Blocks/tree toward RV 19), whereas Cream Puff requires 16 Strawberries + Refined Flour + Coconut Oil, fragmenting Farmland plots.`;
        }
    },
    'strawberry_cream_puff': {
        rival: 'cranberry_chocolate',
        rivalNameVi: 'Sô-cô-la Nam Việt Quất',
        rivalNameEn: 'Cranberry Chocolate',
        facility: 'Blazing Stove',
        facilityVi: 'Bếp Lò Rực Rửa',
        reasonVi: (ctx) => `${ctx.facName} có ${ctx.total}/${ctx.total} cơ sở. Solver chọn phân bổ cho <strong>Bánh Su Kem Dâu Tây</strong> vì nhịp độ cung ứng Dâu tây và Bột mì phù hợp với cấu hình đất nông nghiệp hiện tại, không đòi hỏi chuỗi Cacao phức tạp.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} has ${ctx.total}/${ctx.total} units available. Strawberry Cream Puff is selected because the strawberry and flour supply rhythm matches current farmland allocations without requiring complex cocoa chains.`
    },
    'strawberry_candy': {
        rival: 'rich_grape_compote',
        rivalNameVi: 'Mứt Nho Đậm Đà / Thạch Rau Câu',
        rivalNameEn: 'Rich Grape Compote / Jello',
        facility: 'Blazing Stove',
        facilityVi: 'Bếp Lò Rực Rửa',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) ưu tiên tối đa cho <strong>Kẹo Dâu Tây</strong> (giá 6.840 coin) đem lại tỷ suất lợi nhuận ròng trên thời gian nướng cao nhất cấp 4, vượt trội hơn so với Mứt nho (5.050 coin) hay Thạch rau câu.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) prioritizes <strong>Strawberry Candy</strong> (6,840 coins), yielding the highest net profit per baking second at Tier 4, far surpassing Grape Compote (5,050 coins) and Jello.`
    },
    'ginseng_chestnut_cake': {
        rival: 'walnut_cake',
        rivalNameVi: 'Bánh Óc Chó / Hạt Dẻ Rang Đường',
        rivalNameEn: 'Walnut Cake / Sugar Roasted Chestnuts',
        facility: 'Blazing Stove',
        facilityVi: 'Bếp Lò Rực Rửa',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Bánh Hạt Dẻ Nhân Sâm</strong> nhờ tạo sự cộng hưởng hoàn hảo giữa Nhân Sâm (Nông trại) và Hạt Dẻ (Vườn ươm Cấp 4 đang trồng lấy 47 vụn gỗ lên RV 14). Bánh óc chó đòi hỏi Nước gạo làm quá tải Cối Xay và Nồi Hầm mà không tối ưu được phụ phẩm Hạt dẻ sẵn có.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) selects <strong>Ginseng Chestnut Cake</strong> by perfectly pairing Farmland Ginseng with Woodland Chestnuts (harvested from Tier 4 trees for 47 Wood Blocks to reach RV 14). Walnut Cake requires Rice Drink, overburdening Mills without leveraging available chestnut byproducts.`
    },
    'sugar_roasted_chestnuts': {
        rival: 'tanghulu',
        rivalNameVi: 'Kẹo Hồ Lô Dâu Tây',
        rivalNameEn: 'Tanghulu',
        facility: 'Blazing Stove',
        facilityVi: 'Bếp Lò Rực Rửa',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Hạt Dẻ Rang Đường</strong> (2.470 coin) thay vì Kẹo hồ lô (2.260 coin) vì tận dụng trực tiếp Hạt Dẻ thu hoạch từ Vườn ươm Cấp 4 (nguồn cung cấp vụn gỗ nâng cấp), giảm tải nhu cầu chiếm đất của Dâu tây tại Nông trại.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) picks <strong>Sugar Roasted Chestnuts</strong> (2,470 coins) over Tanghulu (2,260 coins) to directly absorb Chestnuts from Tier 4 Woodland (the wood block driver), sparing Farmland plots.`
    },
    'ginseng_porridge': {
        rival: 'ginseng_powder',
        rivalNameVi: 'Bột Nhân Sâm bán thô',
        rivalNameEn: 'Raw Ginseng Powder',
        facility: 'Simmering Pot',
        facilityVi: 'Nồi Hầm',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) dồn toàn lực nấu <strong>Cháo Nhân Sâm</strong> vì giá trị gia tăng trên mỗi củ sâm và nhân công cao áp đảo so với việc xay bán bột sâm thô, đồng thời tạo ra dòng doanh thu coin/giờ lớn nhất toàn đảo.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) commits fully to <strong>Ginseng Porridge</strong> because net value per crop and worker second vastly exceeds selling raw powder, powering the island's primary coin stream.`
    },
    'plain_rice_porridge': {
        rival: 'rose_concentrate',
        rivalNameVi: 'Cốt Hoa Hồng / Cơm Nắm Hoa Đào',
        rivalNameEn: 'Rose Concentrate / Cherry Blossom Rice Ball',
        facility: 'Simmering Pot',
        facilityVi: 'Nồi Hầm',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) ưu tiên <strong>Cháo Gạo Thanh Đạm</strong> kết hợp Gạo và Nước giếng sạch có chu kỳ nấu nhanh, tối đa hóa công suất Nồi hầm mà không làm phân mảnh diện tích đất canh tác sang Hoa hồng hay Hoa đào.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) prioritizes <strong>Plain Rice Porridge</strong> using Milled Rice and Well Water for rapid cycle times, maximizing Pot throughput without fragmenting Farmland into roses or blossoms.`
    },
    'coconut_cookie': {
        rival: 'maple_candy_star',
        rivalNameVi: 'Kẹo Ngôi Sao / Bánh Mì Hoa',
        rivalNameEn: 'Maple Candy Star / Flower Bread',
        facility: 'Claw Game Cooker',
        facilityVi: 'Bàn Nướng',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Bánh Quy Dừa</strong> (3.700 coin) vì tận dụng nguồn Dừa Nạo từ Vườn ươm Dừa (Cấp 5-6) và Bột mì tinh chế, đem lại doanh thu ổn định hơn việc tiêu tốn Ngôi sao hiếm.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) selects <strong>Coconut Cookie</strong> (3,700 coins) by combining Shredded Coconut from Woodland palms and Refined Flour, offering reliable output without burning scarce Stars.`
    },
    'rose_shortbread': {
        rival: 'apple_tart',
        rivalNameVi: 'Bánh Táo / Khoai Nướng Đường Phong',
        rivalNameEn: 'Apple Tart / Maple Roasted Potatoes',
        facility: 'Claw Game Cooker',
        facilityVi: 'Bàn Nướng',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Bánh Quy Hoa Hồng</strong> (1.310 coin) đem lại biên lợi nhuận ròng trên giờ cao hơn hẳn Bánh táo (590 coin) hay Khoai nướng (850 coin).`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) selects <strong>Rose Shortbread</strong> (1,310 coins), delivering substantially higher net hourly return than Apple Tart (590 coins) or Roasted Potatoes (850 coins).`
    },
    'premium_bread': {
        rival: 'roasted_soybeans',
        rivalNameVi: 'Đậu Nành Rang Muối Biển',
        rivalNameEn: 'Roasted Soybeans',
        facility: 'Claw Game Cooker',
        facilityVi: 'Bàn Nướng',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Bánh Mì Thượng Hạng</strong> kết hợp Bột mì và Nước giếng, cân bằng hoàn hảo giữa diện tích Lúa mì và công suất Cối xay.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) prioritizes <strong>Premium Bread</strong> combining Wheatmeal and Well Water, achieving balanced throughput between Wheat plots and Mill capacity.`
    },
    'coconut_cooler': {
        rival: 'cranberry_juice',
        rivalNameVi: 'Nước Ép Nam Việt Quất / Ca-cao Nóng',
        rivalNameEn: 'Cranberry Juice / Hot Cocoa',
        facility: 'Bouncy Brew Keg',
        facilityVi: 'Thùng Bia Nảy Nảy',
        reasonVi: (ctx) => {
            if (ctx.allocated < ctx.total) {
                return `${ctx.facName} (sở hữu ${ctx.total} cơ sở): Solver huy động <strong>${ctx.allocated} cơ sở</strong> nấu <strong>Nước Dừa Mát Lạnh</strong> (1.650 coin, ủ nhanh 54s điện) để tận dụng quả Dừa thu hoạch từ Vườn ươm cấp 6; ${ctx.idle} cơ sở còn lại được để trống nhằm tránh tranh chấp Nam việt quất hoặc làm các loại đồ uống phụ kém hiệu quả.`;
            }
            return `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Nước Dừa Mát Lạnh</strong> (1.650 coin) với chu kỳ ủ siêu nhanh (54s điện), tận dụng nguồn Dừa dồi dào từ Vườn ươm cấp 6 để tạo dòng tiền phụ trợ mà không tranh chấp Nam việt quất với Bếp lò.`;
        },
        reasonEn: (ctx) => {
            if (ctx.allocated < ctx.total) {
                return `The ${ctx.facNameEn} (${ctx.total} units owned): The solver operates <strong>${ctx.allocated} unit</strong> for <strong>Coconut Cooler</strong> (1,650 coins, fast 54s brew) leveraging harvested Woodland coconuts; ${ctx.idle} unit is kept idle to avoid competing for Cranberries or running sub-optimal drink recipes.`;
            }
            return `The ${ctx.facNameEn} (${ctx.facCountTextEn}) operates <strong>Coconut Cooler</strong> (1,650 coins) with ultra-fast brew cycles (54s on electric), converting abundant Woodland coconuts into secondary income without competing for Cranberries needed at the Stove.`;
        }
    },
    'potato_chips': {
        rival: 'dried_lemon_slices',
        rivalNameVi: 'Chanh Sấy / Táo Sấy',
        rivalNameEn: 'Dried Lemon / Apple Slices',
        facility: 'Jukebox Dryer',
        facilityVi: 'Máy Sấy Hộp Nhạc',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chuyên canh <strong>Khoai Tây Chiên</strong> để hấp thụ toàn bộ sản lượng Khoai tây thu hoạch từ Nông trại có tưới nước, giải quyết nút thắt chế biến nhanh nhất đảo.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) dedicates capacity to <strong>Potato Chips</strong> to absorb the flood of watered Farmland potatoes, clearing the island's highest-velocity crop.`
    },
    'shell_ornament': {
        rival: 'bamboo_ware',
        rivalNameVi: 'Đồ Tre / Tượng Gỗ',
        rivalNameEn: 'Bamboo Ware / Wood Sculpture',
        facility: 'Crafting Table',
        facilityVi: 'Bàn Chế Tạo',
        reasonVi: (ctx) => `${ctx.facName} (${ctx.facCountTextVi}) chọn <strong>Trang Sức Vỏ Sò</strong> (1.190 coin) kết hợp Vỏ sò từ Mỏ và Chỉ bông, đem lại doanh thu vượt trội so với các đồ gỗ thô sơ.`,
        reasonEn: (ctx) => `The ${ctx.facNameEn} (${ctx.facCountTextEn}) chooses <strong>Shell Ornament</strong> (1,190 coins) combining Mine Shells with Cotton Thread, far out-earning primitive woodwork.`
    }
};

export function createInsightsRenderer({
    document,
    getLanguage,
    selectedHomeLevel,
    simpleSetup,
    planContext,
    levelUpCosts,
    lastPlanInput,
    lastEmodeCounts,
    prettyItem,
    perHour,
    formatDuration,
    formatRate,
    getFacilityDisplayName,
    getGeneratorCapacity,
    calculatePowerWatts,
    seasonActive,
    selectedSeasonDishes,
    buildWoodlandInsight,
    buildProfitInsight,
    buildFarmSupplyInsight,
    buildRejectedInsight,
    buildLogisticsInsight,
}) {
    function render(plan) {
        const container = document.getElementById('insights-content');
        if (!container) return;
        const isVi = getLanguage() === 'vi';
        if (!plan || !plan.success) {
            container.innerHTML = `<p class="hint">${isVi ? 'Chưa có kế hoạch được tính toán. Nhấn "Tìm kế hoạch tối ưu" để xem phân tích chuyên sâu.' : 'No plan calculated yet. Click "Generate the best plan" to see optimization insights.'}</p>`;
            return;
        }

        const producing = (plan.coin_items || []).filter(s => s.status === 'producing');

        // Thu thập tất cả các item thực tế đang được sản xuất hoặc bán trong kế hoạch
        const activeItemNames = new Set();
        for (const s of producing) {
            if (s.item_name) {
                activeItemNames.add(s.item_name);
                activeItemNames.add(s.item_name.replace(/^quick_/, ''));
                const base = s.item_name.replace(/__(specialist|manual)$/, '').replace(/^quick_/, '');
                activeItemNames.add(base);
            }
        }
        for (const s of (plan.income_streams || [])) {
            if ((s.units_per_second || 0) > 0 && s.item_name) {
                activeItemNames.add(s.item_name);
                activeItemNames.add(s.item_name.replace(/^quick_/, ''));
                const base = s.item_name.replace(/__(specialist|manual)$/, '').replace(/^quick_/, '');
                activeItemNames.add(base);
            }
        }

        // 1. Real top revenue streams from plan.income_streams (sorted by rate_per_second descending)
        const streams = (plan.income_streams || []).filter(s => (s.units_per_second || 0) > 0);
        const sortedStreams = [...streams].sort((a, b) => (b.rate_per_second || 0) - (a.rate_per_second || 0));
        const totalCoinRate = plan.rate_per_second || 0;
        const totalHourlyCoins = Math.round(totalCoinRate * 3600);
        const unitRateDisplay = formatRate(totalCoinRate);

        const homeLevel = selectedHomeLevel();
        const { facilities: setupFacilities } = simpleSetup(homeLevel);
        const woodlandTier = setupFacilities['Woodland']?.[0]?.level || 1;

        const resolvedPlanContext = typeof planContext === 'function' ? planContext() : planContext;
        const woodlandInsight = buildWoodlandInsight({
            plan,
            planContext: resolvedPlanContext,
            homeLevel,
            isVi,
            woodlandTier,
            levelUpCosts,
            producing,
            prettyItem,
            perHour,
            formatDuration,
            formatNumber: value => value.toLocaleString()
        });

        // CARD 1: Core Profit Driver (What was selected & Why)
        const { title: titleProfit, description: descProfit } = buildProfitInsight({
            isVi,
            sortedStreams,
            totalHourlyCoins,
            unitRateDisplay,
            homeLevel,
            prettyItem,
            getFacilityDisplayName,
            perHour,
            formatNumber: value => value.toLocaleString()
        });

        // CARD 2: Farmland & Supply Chain Strategy (What & Why)
        const { title: titleFarm, description: descFarm } = buildFarmSupplyInsight({
            isVi,
            producing,
            prettyItem,
            getFacilityDisplayName,
            perHour
        });

        // CARD 3: Level-up Progression (if applicable)
        const cardLevelUpHtml = woodlandInsight.cardHtml;

        // CARD 4: Why Alternatives Were Rejected
        const dishes = typeof selectedSeasonDishes === 'function' ? selectedSeasonDishes() : selectedSeasonDishes;
        const { title: titleRejected, description: descRejected } = buildRejectedInsight({
            isVi,
            woodlandInsight,
            woodlandTier,
            sortedStreams,
            activeItemNames,
            simpleSetup,
            homeLevel,
            producing,
            rivalInsights: RECIPE_RIVAL_INSIGHTS,
            seasonIsActive: seasonActive(),
            selectedSeasonDishCount: dishes?.size || 0,
            plan,
        });

        // CARD 5: Power & Logistics
        const suCount = parseInt(document.getElementById('layout-su-count')?.value || '3', 10);
        const resolvedLastPlanInput = typeof lastPlanInput === 'function' ? lastPlanInput() : lastPlanInput;
        const resolvedLastEmodeCounts = typeof lastEmodeCounts === 'function' ? lastEmodeCounts() : lastEmodeCounts;
        const { title: titleLogistics, description: descLogistics } = buildLogisticsInsight({
            isVi,
            producing,
            lastPlanInput: resolvedLastPlanInput,
            lastEmodeCounts: resolvedLastEmodeCounts,
            suCount,
            getGeneratorCapacity,
            calculatePowerWatts,
        });

        container.innerHTML = `
        <div class="insight-item insight-selected">
            <div class="insight-label">${titleProfit}</div>
            <div class="insight-desc">${descProfit}</div>
        </div>
        <div class="insight-item insight-selected">
            <div class="insight-label">${titleFarm}</div>
            <div class="insight-desc">${descFarm}</div>
        </div>
        ${cardLevelUpHtml}
        <div class="insight-item insight-logistics">
            <div class="insight-label">${titleLogistics}</div>
            <div class="insight-desc">${descLogistics}</div>
        </div>
        <div class="insight-item insight-rejected">
            <div class="insight-label">${titleRejected}</div>
            <div class="insight-desc">${descRejected}</div>
        </div>
    `;
    }

    return { render };
}
