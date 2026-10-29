export function buildInfeasibleExplanationMarkup(options) {
    const {
        currentRv, isVietnamese: isVi, isLevelUp, targetRv, isSeason, wantsSauce, wantsHotpot,
        hasSpecialGinseng, eventPlots, seasonRadishPlots, seasonPepperPlots, totalFarmland,
        ownedCounts, currentAniimoCap, maxAniimo, renderFacilityIcon, renderItemIcon,
    } = options;
    const causes = [];

    if (wantsSauce && hasSpecialGinseng) {
        causes.push({
            icons: [renderFacilityIcon('Simmering Pot'), renderItemIcon('ginseng_congee'), renderItemIcon(options.wantsSauceItem || 'wonder_sweet_and_spicy_sauce')],
            title: isVi ? 'Tranh chấp Nồi hầm (Simmering Pot)' : 'Simmering Pot Contention',
            desc: isVi
                ? `Bạn sở hữu <strong>${ownedCounts['Simmering Pot'] || 2} Nồi hầm</strong>, nhưng đang bị yêu cầu đồng thời bởi <strong>Cháo nhân sâm</strong> và <strong>Sốt cay ngọt hắc ám</strong>. Solver không thể đáp ứng cả hai món cùng lúc với tài nguyên hiện tại.`
                : `You own <strong>${ownedCounts['Simmering Pot'] || 2} Simmering Pots</strong>, but they are requested by both <strong>Ginseng Porridge</strong> and <strong>Umbral Sweet and Spicy Sauce</strong> simultaneously.`,
        });
    }

    if (wantsHotpot) {
        causes.push({
            icons: [renderFacilityIcon('Blazing Stove'), renderItemIcon(options.wantsHotpotItem || 'wonder_pumpkin_pot')],
            title: isVi ? 'Chiếm dụng Bếp lửa lớn (Blazing Stove)' : 'Blazing Stove Fully Occupied',
            desc: isVi
                ? `Bạn chỉ sở hữu <strong>1 Bếp lửa lớn</strong>. Món sự kiện <strong>Lẩu hắc ám</strong> đã chiếm trọn cơ sở này, khiến các công thức sản xuất hoặc chuỗi cung ứng chính không thể hoạt động.`
                : `You only have <strong>1 Blazing Stove</strong>. The event dish <strong>Umbral Hot Pot</strong> fully locks it down, starving standard recipes.`,
        });
    }

    if (isSeason && eventPlots >= 4) {
        causes.push({
            icons: [renderFacilityIcon('Farmland'), renderItemIcon(options.crop1Slug || 'magic_pumpkin'), renderItemIcon(options.crop2Slug || 'memory_lanternfruit')],
            title: isVi ? 'Diện tích đất canh tác Farmland bị thu hẹp' : 'Farmland Crop Saturation',
            desc: isVi
                ? `Đã dành <strong>${eventPlots}/${totalFarmland} ô đất</strong> (${seasonRadishPlots} ô Củ cải & ${seasonPepperPlots} ô Ớt) cho nông sản sự kiện. Số ô đất còn lại (${totalFarmland - eventPlots} ô) không đủ để trồng nguyên liệu cho các sản phẩm chính và mục tiêu nâng cấp.${eventPlots > 10 ? ' Mức tối ưu khuyến nghị cho các cơ sở chế biến là 5 Củ cải & 5 Ớt (tổng 10 ô); việc chọn từ 6 Củ cải & 6 Ớt trở lên (12 ô) sẽ làm tắc nghẽn chuỗi cung ứng và bóp nghẹt diện tích nâng cấp.' : ''}`
                : `Allocated <strong>${eventPlots}/${totalFarmland} plots</strong> (${seasonRadishPlots} Radish & ${seasonPepperPlots} Pepper) to festival crops, leaving insufficient plots (${totalFarmland - eventPlots}) for core production and level-up.${eventPlots > 10 ? ' The sweet spot capacity is 5 Radish & 5 Pepper (10 plots); picking 6+ each (12+ plots) causes supply saturation and starves level-up materials.' : ''}`,
        });
    }

    if (isLevelUp) {
        causes.push({
            icons: [renderFacilityIcon('Woodworking Bench'), renderFacilityIcon('Chimney Kiln')],
            title: isVi ? `Xung đột mục tiêu Nâng cấp RV ${targetRv}` : `Conflict with RV ${targetRv} Level-Up Goal`,
            desc: isVi
                ? `Chiến lược nâng cấp RV yêu cầu tập trung toàn bộ công nhân và tài nguyên vào Xưởng gỗ và Lò luyện quặng để sản xuất vật liệu nâng cấp. Sự cạnh tranh nhân lực và công suất khiến solver không thể lập lộ trình hoàn thành cấp độ với thiết lập hiện tại.`
                : `RV level-up demands full capacity on Woodworking Bench and Chimney Kiln, conflicting with other active resource demands.`,
        });
    }

    if (causes.length === 0) {
        causes.push({
            icons: [renderFacilityIcon('Simmering Pot'), renderFacilityIcon('Blazing Stove')],
            title: isVi ? 'Xung đột tài nguyên và công nhân Aniimo' : 'Resource & Aniimo Worker Bottleneck',
            desc: isVi
                ? `Sự kết hợp giữa các công thức đã chọn vượt quá giới hạn công nhân Aniimo, điện năng hoặc số lượng cơ sở hiện có.`
                : `The combination of chosen recipes exceeds current Aniimo staffing, electrical capacity, or facility counts.`,
        });
    }

    const recommendations = [];
    if (isSeason) {
        recommendations.push(`
            <li class="infeasible-rec-item">
                <span>💡</span>
                <span>${isVi ? 'Đổi sang món sự kiện tối ưu nhất:' : 'Switch to the highest-yield event dish:'} <strong>${isVi ? 'Đĩa tiệc mùa màng' : 'Harvest Platter'}</strong> ${renderItemIcon('harvest_platter')} (${isVi ? 'chế biến tại Bàn chế tạo' : 'at Crafting Table'} ${renderFacilityIcon('Crafting Table')}), giá bán cao nhất (5.290 coin/đĩa) và không tranh chấp Nồi hầm hay Bếp lửa lớn.</span>
            </li>
        `);
        if (wantsHotpot || wantsSauce) {
            const dishToDrop = wantsHotpot ? 'umbral_hot_pot' : 'umbral_sweet_and_spicy_sauce';
            const dishName = wantsHotpot ? (isVi ? 'Lẩu hắc ám' : 'Umbral Hot Pot') : (isVi ? 'Sốt cay ngọt hắc ám' : 'Umbral Sweet and Spicy Sauce');
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Bỏ chọn món đang gây tắc nghẽn:' : 'Uncheck the conflicting dish:'} <strong>${dishName}</strong> ${renderItemIcon(dishToDrop)} ${isVi ? 'để giải phóng cơ sở cho sản xuất chính hoặc nâng cấp RV.' : 'to release the facility for core production.'}</span>
                </li>
            `);
        }
        if (eventPlots > 4) {
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Cân bằng lại số ô đất sự kiện:' : 'Rebalance festival plots:'} ${isVi ? `Hạ số ô Củ cải (${seasonRadishPlots}) và Ớt (${seasonPepperPlots}) xuống mức cân bằng lý tưởng (<strong>5 ô Củ cải & 5 ô Ớt</strong>, hoặc 4 & 4) để giải phóng thêm diện tích Farmland cho chuỗi nguyên liệu nâng cấp RV.` : `Lower Radish and Pepper plots to the optimal sweet spot (<strong>5 Radish & 5 Pepper</strong>, or 4 & 4) to free farmland for level-up materials.`}</span>
                </li>
            `);
        }
    } else {
        if (currentAniimoCap < maxAniimo) {
            recommendations.push(`
                <li class="infeasible-rec-item">
                    <span>💡</span>
                    <span>${isVi ? 'Tăng giới hạn công nhân Aniimo:' : 'Increase Aniimo worker cap:'} ${isVi ? `Hiện tại anh đang giới hạn <strong>${currentAniimoCap}/${maxAniimo}</strong> công nhân. Hãy nâng lên tối đa (${maxAniimo}) để giải phóng đủ nhân lực cho cả khâu trồng trọt và chế biến nâng cấp RV.` : `Currently capped at <strong>${currentAniimoCap}/${maxAniimo}</strong> workers. Increase to max (${maxAniimo}) to provide enough staffing for level-up.`}</span>
                </li>
            `);
        }
        recommendations.push(`
            <li class="infeasible-rec-item">
                <span>💡</span>
                <span>${isVi ? 'Điều chỉnh Chế độ điện (E-mode):' : 'Adjust Electric Mode:'} ${isVi ? 'Nếu việc kích hoạt điện lưới trên quá nhiều cơ sở gây tắc nghẽn chuỗi cung ứng, hãy thử giảm bớt số máy dùng điện hoặc chuyển sang chế độ thủ công tiêu chuẩn.' : 'Try reducing electrified machines to keep supply chains balanced.'}</span>
            </li>
        `);
    }

    return `
        <div class="infeasible-header">
            <div class="infeasible-badge-icon">⚠️</div>
            <div class="infeasible-title-box">
                <h2>${isVi ? 'Tại sao kế hoạch này không khả thi?' : 'Why is this plan infeasible?'}</h2>
                <p class="infeasible-subtitle">${isVi ? 'Bộ giải tối ưu không thể tìm thấy phương án đáp ứng đồng thời tất cả các ràng buộc đã chọn. Dưới đây là phân tích chi tiết các điểm nghẽn:' : 'The optimizer cannot satisfy all selected constraints at once. Here is the bottleneck analysis:'}</p>
            </div>
        </div>
        <div class="infeasible-causes-container">
            ${causes.map(cause => `
                <div class="infeasible-cause-item">
                    <div class="infeasible-visual-icons">${cause.icons.join('')}</div>
                    <div class="infeasible-cause-text"><strong>${cause.title}</strong>: ${cause.desc}</div>
                </div>
            `).join('')}
        </div>
        <div class="infeasible-recommendations-box">
            <div class="infeasible-rec-title">
                <span>✨</span>
                <span>${isVi ? 'Đề xuất hành động để giải quyết:' : 'Recommended Actions to Fix:'}</span>
            </div>
            <ul class="infeasible-rec-list">${recommendations.join('')}</ul>
        </div>
    `;
}
