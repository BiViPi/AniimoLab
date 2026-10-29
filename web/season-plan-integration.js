// Integrates selected seasonal crops, dish chains, and income streams into a solved plan.
export function integrateSeasonPlan(plan, deps) {
    if (!plan || !plan.success || !deps.isSeasonActive()) return plan;
    const radishPlots = deps.getRadishPlots();
    const pepperPlots = deps.getPepperPlots();
    if (radishPlots <= 0 && pepperPlots <= 0) return plan;

    // Harvest rate (with watering, cycle is 1200s, yield is 8 per harvest)
    const cycleTime = 1200;
    const yieldPerHarvest = 8;
    let radishPerSec = (radishPlots * yieldPerHarvest) / cycleTime;
    let pepperPerSec = (pepperPlots * yieldPerHarvest) / cycleTime;

    const newSteps = [...(plan.coin_items || [])];
    const newStreams = [...(plan.income_streams || [])];
    const newAssignments = JSON.parse(JSON.stringify(plan.environment_assignments || []));
    let extraCoinsRate = 0;
    let seasonPointsRate = 0;
    const isVi = deps.isVietnamese();

    // Thêm các bước canh tác Farmland mùa vụ
    const crop1Slug = deps.crop1Slug || deps.crops?.radish?.slug || 'moondew_radish';
    const crop2Slug = deps.crop2Slug || deps.crops?.pepper?.slug || 'waxing_moon_pepper';
    const crop1Env = deps.crop1Environment !== undefined ? deps.crop1Environment : (deps.crops?.radish?.environment || null);
    const crop2Env = deps.crop2Environment !== undefined ? deps.crop2Environment : (deps.crops?.pepper?.environment || null);
    const seasonReason = isVi ? (deps.seasonNameVi ? `Canh tác ${deps.seasonNameVi}` : 'Canh tác Sự kiện Mùa vụ') : (deps.seasonName ? `${deps.seasonName} farming` : 'Seasonal event farming');

    if (radishPlots > 0) {
        newSteps.push({
            facility: 'Farmland',
            item_name: crop1Slug,
            facility_count: radishPlots,
            status: 'producing',
            cycle_time: cycleTime,
            is_grower: true,
            reason: seasonReason,
            environment: crop1Env
        });
    }
    if (pepperPlots > 0) {
        newSteps.push({
            facility: 'Farmland',
            item_name: crop2Slug,
            facility_count: pepperPlots,
            status: 'producing',
            cycle_time: cycleTime,
            is_grower: true,
            reason: seasonReason,
            environment: crop2Env
        });
    }

    const adequatePlots = (crop1Env === 'Adequate' ? radishPlots : 0) + (crop2Env === 'Adequate' ? pepperPlots : 0);
    if (adequatePlots > 0) {
        const sunlampAssignment = newAssignments.find(a => a.building === 'Sunlamp' && a.mode === 'Adequate');
        if (sunlampAssignment) {
            if (sunlampAssignment.covered) {
                const fc = sunlampAssignment.covered.find(c => c.facility === 'Farmland');
                if (fc) fc.count += adequatePlots;
                else sunlampAssignment.covered.push({ facility: 'Farmland', count: adequatePlots });
            }
        } else {
            newAssignments.push({
                building: 'Sunlamp',
                mode: 'Adequate',
                units: 1,
                covered: [{ facility: 'Farmland', count: adequatePlots }],
                layouts: [[{ facility: 'Farmland', x: 0, y: 1, size: 1 }]],
                partner: null,
                zone: null,
                pair_modes: null
            });
        }
    }

    // Chọn danh sách món ăn sự kiện tối ưu (0, 1 hoặc tối đa 2 món) theo các quy tắc
    const optimalDishes = deps.selectOptimalSeasonDishes(plan.rate_per_second);

    // Nếu có món cần Kẹo đá, thêm 1 ô Farmland trồng Mía (Mía bắt buộc trồng trong Lò Sưởi chế độ Bỏng Cháy - Scorching)
    const needsRockCandy = optimalDishes.some(d => d.requiresRockCandy || d.name === 'moondew_radish_slices' || d.name === 'harvest_platter' || d.name === 'candied_lanternfruit' || d.name === 'honey_glazed_pumpkin_cup');
    if (needsRockCandy) {
        newSteps.push({
            facility: 'Farmland',
            item_name: 'sugarcane',
            facility_count: 1,
            status: 'producing',
            cycle_time: 2400,
            is_grower: true,
            reason: isVi ? 'Dùng cho Kẹo đá; phần còn lại bán trực tiếp' : 'Used for rock_candy; the rest sells directly',
            environment: 'Scorching'
        });

        // Bổ sung phân bổ ô đất trong Lò Sưởi Scorching
        const scorchingAssignment = newAssignments.find(a => a.building === 'Heat Furnace' && a.mode === 'Scorching');
        if (scorchingAssignment) {
            if (scorchingAssignment.covered) {
                const fc = scorchingAssignment.covered.find(c => c.facility === 'Farmland');
                if (fc) fc.count += 1;
                else scorchingAssignment.covered.push({ facility: 'Farmland', count: 1 });
            }
            if (scorchingAssignment.layouts && scorchingAssignment.layouts[0]) {
                scorchingAssignment.layouts[0].push({ facility: 'Farmland', x: 2, y: 0, size: 1 });
            }
        } else {
            newAssignments.push({
                building: 'Heat Furnace',
                mode: 'Scorching',
                units: 1,
                covered: [{ facility: 'Farmland', count: 1 }],
                layouts: [[{ facility: 'Farmland', x: 0, y: 1, size: 1 }]],
                partner: null,
                zone: null,
                pair_modes: null
            });
        }
    }

    // Helper kiểm tra xem máy của cơ sở có được cấp điện theo overrides / deps.lastEmodeCounts không
    function checkStepEmode(fac, count = 1) {
        const ovr = deps.facilityOverrides.find(o => o.facility === fac);
        let cap = (deps.lastEmodeCounts && deps.lastEmodeCounts[fac]) || 0;
        if (ovr && typeof ovr.electric_count === 'number') {
            cap = ovr.electric_count;
        }
        const alreadyUsed = newSteps
            .filter(s => s.facility && s.facility.replace(/ \(Electric\)$/, '') === fac && s.is_emode && s.status === 'producing')
            .reduce((sum, s) => sum + (s.facility_count || 1), 0);
        return (alreadyUsed + count) <= cap;
    }

    // Nếu có món cần Nước ngọt (Kẹo đá hoặc Lẩu hắc ám / Súp bí ngô / Nước ép), thêm 1 Giếng nước sản xuất Nước ngọt (ưu tiên công thức siêu tốc nếu đã mở khóa)
    const needsFreshWater = needsRockCandy || optimalDishes.some(d => d.requiresFreshWater || d.name === 'umbral_hot_pot' || d.name === 'golden_lantern_pumpkin_soup' || d.name === 'sparkling_fruit_juice');
    if (needsFreshWater) {
        const fwReason = isVi
            ? (optimalDishes.some(d => d.name === 'umbral_hot_pot') ? (needsRockCandy ? 'Dùng cho Kẹo đá, Lẩu hắc ám' : 'Dùng cho Lẩu hắc ám') : 'Dùng cho Kẹo đá')
            : 'Used for event dishes';
        const wellElectric = checkStepEmode('Well', 1);
        const { facilities: curFacs, modules: curMods } = deps.simpleSetup(deps.selectedHomeLevel());
        const useQuickWater = deps.isQuickRecipeUnlocked('fresh_water', curFacs, curMods);
        const waterItem = useQuickWater ? 'quick_fresh_water' : 'fresh_water';

        newSteps.push({
            facility: 'Well',
            item_name: waterItem,
            facility_count: 1,
            status: 'producing',
            cycle_time: useQuickWater ? 1800 : 2250,
            is_grower: false,
            is_emode: wellElectric,
            is_manual: !wellElectric,
            aniimo: wellElectric ? null : { ability: 'Water', level: 4, personality_bonus: true },
            reason: fwReason,
            environment: null
        });
    }

    for (const dish of optimalDishes) {
        const maxFacCapacity = 1 / (dish.cycleTime || 203);
        let availUnits = 0;

        if (dish.radish > 0 && dish.pepper > 0) {
            availUnits = Math.min(radishPerSec / dish.radish, pepperPerSec / dish.pepper);
        } else if (dish.radish > 0) {
            availUnits = radishPerSec / dish.radish;
        } else if (dish.pepper > 0) {
            availUnits = pepperPerSec / dish.pepper;
        }

        // Bị chặn trên bởi công suất tối đa của cơ sở chế biến
        const units = Math.min(availUnits, maxFacCapacity);

        if (dish.radish > 0) radishPerSec = Math.max(0, radishPerSec - units * dish.radish);
        if (dish.pepper > 0) pepperPerSec = Math.max(0, pepperPerSec - units * dish.pepper);

        if (units > 1e-7) {
            const coinsPerSec = units * dish.sellValue;
            const ptsPerSec = units * dish.points;
            extraCoinsRate += coinsPerSec;
            seasonPointsRate += ptsPerSec;

            // 1. Nếu món có chuỗi sơ chế (ví dụ Mâm cỗ trung thu cần Kẹo đá, Củ cải sấy lát và Ớt nướng trăng):
            if (dish.prepChain) {
                for (const prep of dish.prepChain) {
                    const prepElectric = checkStepEmode(prep.facility, 1);
                    newSteps.push({
                        facility: prep.facility,
                        item_name: prep.item_name,
                        facility_count: 1,
                        status: 'producing',
                        cycle_time: prep.cycleTime,
                        is_grower: false,
                        is_emode: prepElectric,
                        is_manual: !prepElectric,
                        reason: isVi ? prep.reasonVi : prep.reasonEn,
                        environment: null
                    });
                }
            }

            // 2. Thêm cơ sở chính hoàn thiện món
            const dishElectric = checkStepEmode(dish.facility, 1);
            newSteps.push({
                facility: dish.facility,
                item_name: dish.name,
                facility_count: 1,
                status: 'producing',
                cycle_time: dish.cycleTime || 203,
                is_grower: false,
                is_emode: dishElectric,
                is_manual: !dishElectric,
                reason: isVi ? `Món ăn Lễ hội Trung Thu (+${dish.points} điểm)` : `Festival dish (+${dish.points} pts)`,
                environment: null
            });

            // 3. Dòng tiền bán món ăn ra thị trường
            newStreams.push({
                item_name: dish.name,
                facility: dish.facility,
                sell_value: dish.sellValue,
                rate_per_second: coinsPerSec,
                units_per_second: units,
                lead_time_seconds: 0,
                total_units: 0,
                total_value: 0,
                points: dish.points
            });
        }
    }

    // Bổ sung cơ sở sản xuất Muối biển chuyên dụng cho sự kiện:
    // Ưu tiên Muối biển nhanh (quick_sea_salt) nếu đã mở khóa, nếu chưa thì dùng Muối biển thường (sea_salt)
    const saltDishes = optimalDishes.filter(d => d.requiresSeaSalt || d.name === 'roasted_waxing_moon_pepper' || d.name === 'harvest_platter' || d.name === 'umbral_sweet_and_spicy_sauce' || d.name === 'sea_salt_roasted_pumpkin' || d.name === 'honey_glazed_pumpkin_cup');
    if (saltDishes.length > 0) {
        let forTextVi = 'Bí ngô nướng muối biển';
        if (saltDishes.some(d => d.name === 'sea_salt_roasted_pumpkin')) {
            forTextVi = 'Bí ngô nướng muối biển';
        } else if (saltDishes.some(d => d.name === 'honey_glazed_pumpkin_cup')) {
            forTextVi = 'Cốc bí ngô phủ mật ong';
        } else if (saltDishes.some(d => d.name === 'harvest_platter')) {
            forTextVi = 'Ớt nướng trăng (Mâm cỗ trung thu)';
        } else if (saltDishes.some(d => d.name === 'umbral_sweet_and_spicy_sauce')) {
            forTextVi = 'Sốt cay ngọt hắc ám';
        } else if (saltDishes.some(d => d.name === 'roasted_waxing_moon_pepper')) {
            forTextVi = 'Ớt nướng trăng';
        }
        const purposeText = isVi
            ? `Dùng cho ${forTextVi}; phần còn lại bán trực tiếp`
            : `Used for ${forTextVi}; the rest sells directly`;

        const { facilities: curFacs, modules: curMods } = deps.simpleSetup(deps.selectedHomeLevel());
        const useQuickSalt = deps.isQuickRecipeUnlocked('sea_salt', curFacs, curMods);
        const saltItem = useQuickSalt ? 'quick_sea_salt' : 'sea_salt';
        const saltCycle = useQuickSalt ? 2250 : 1800;

        newSteps.push({
            facility: 'Tidewhisper Sandcastle',
            item_name: saltItem,
            facility_count: 1,
            status: 'producing',
            cycle_time: saltCycle,
            is_grower: false,
            reason: purposeText,
            environment: null
        });
    }

    const crop1SellValue = deps.crop1SellValue !== undefined ? deps.crop1SellValue : (deps.crops?.radish?.sellValue ?? 74);
    const crop2SellValue = deps.crop2SellValue !== undefined ? deps.crop2SellValue : (deps.crops?.pepper?.sellValue ?? 74);
    const crop1Points = deps.crop1Points !== undefined ? deps.crop1Points : (deps.crops?.radish?.points ?? 1);
    const crop2Points = deps.crop2Points !== undefined ? deps.crop2Points : (deps.crops?.pepper?.points ?? 1);

    // Nông sản thô còn dư bán trực tiếp lấy coin và điểm
    if (radishPerSec > 1e-7) {
        const coinsPerSec = radishPerSec * crop1SellValue;
        const ptsPerSec = radishPerSec * crop1Points;
        extraCoinsRate += coinsPerSec;
        seasonPointsRate += ptsPerSec;
        newStreams.push({
            item_name: crop1Slug,
            facility: 'Farmland',
            sell_value: crop1SellValue,
            rate_per_second: coinsPerSec,
            units_per_second: radishPerSec,
            lead_time_seconds: 0,
            total_units: 0,
            total_value: 0,
            points: crop1Points
        });
    }

    if (pepperPerSec > 1e-7) {
        const coinsPerSec = pepperPerSec * crop2SellValue;
        const ptsPerSec = pepperPerSec * crop2Points;
        extraCoinsRate += coinsPerSec;
        seasonPointsRate += ptsPerSec;
        newStreams.push({
            item_name: crop2Slug,
            facility: 'Farmland',
            sell_value: crop2SellValue,
            rate_per_second: coinsPerSec,
            units_per_second: pepperPerSec,
            lead_time_seconds: 0,
            total_units: 0,
            total_value: 0,
            points: crop2Points
        });
    }

    let updatedLevelUp = plan.level_up;
    if (plan.level_up && plan.level_up.requirements) {
        const newRatePerSec = plan.rate_per_second + extraCoinsRate;
        const newReqs = plan.level_up.requirements.map(r => {
            if (r.name === 'coins') {
                const short = Math.max(0, r.need - r.have);
                const seconds = short <= 0 ? 0 : (newRatePerSec > 0 ? short / newRatePerSec : null);
                return { ...r, per_second: newRatePerSec, seconds };
            }
            return r;
        });
        updatedLevelUp = {
            ...plan.level_up,
            requirements: newReqs
        };
    }

    return {
        ...plan,
        coin_items: newSteps,
        income_streams: newStreams,
        environment_assignments: newAssignments,
        rate_per_second: plan.rate_per_second + extraCoinsRate,
        season_points: seasonPointsRate,
        level_up: updatedLevelUp
    };
}
