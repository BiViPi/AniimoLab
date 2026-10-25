export function createSeasonPlotsAdvisoryController({
    document,
    window,
    seasonActive,
    getRadishPlots,
    getPepperPlots,
    setRadishPlots,
    setPepperPlots,
    selectOptimalSeasonDishes,
    calculateOptimalSeasonPlots,
    selectedHomeLevel,
    saveInputsToStorage,
    runFindPlan,
    getLanguage,
}) {
    function evaluate(plan) {
        const bannerEl = document.getElementById('plots-optimization-banner');
        if (!bannerEl) return;

        if (!seasonActive() || !plan || !plan.success) {
            bannerEl.style.display = 'none';
            return;
        }

        const curR = getRadishPlots();
        const curP = getPepperPlots();
        const optimalDishes = selectOptimalSeasonDishes(plan.rate_per_second);
        const isVi = getLanguage() === 'vi';

        // Trường hợp A: Người chơi đặt ô đất nhưng không có món sự kiện nào được chọn để chế biến
        if (optimalDishes.length === 0) {
            if (curR > 0 || curP > 0) {
                bannerEl.innerHTML = `
                    <div class="plots-opt-content">
                        <div class="plots-opt-icon">⚠️</div>
                        <div class="plots-opt-text">
                            <h4>${isVi ? 'Chưa chọn món chế biến Lễ hội' : 'No Festival Recipe Selected'}</h4>
                            <p>
                                ${isVi
                        ? `Hiện tại anh đang đặt <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> nhưng chưa kích hoạt công thức chế biến nào. Nông sản thô chỉ bán được giá 74 coin, làm giảm hiệu suất đất trồng. Hãy chọn ít nhất 1 món ăn hoặc chuyển số ô về 0.`
                        : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> allocated without any active festival cooking recipe. Raw festival produce only sells for 74 coins. Consider selecting a festival recipe or setting plots to 0.`
                    }
                            </p>
                        </div>
                    </div>
                    <button class="btn-apply-plots-opt" onclick="window.applyOptimalPlots(0, 0)">
                        ⚡ ${isVi ? 'Chuyển về 0 ô đất' : 'Reset to 0 plots'}
                    </button>
                `;
                bannerEl.style.display = 'flex';
                return;
            }
            bannerEl.style.display = 'none';
            return;
        }

        // Trường hợp B: Có món ăn sự kiện được chọn
        const opt = calculateOptimalSeasonPlots(optimalDishes, selectedHomeLevel());
        const optR = opt.radish;
        const optP = opt.pepper;

        // Nếu đã ở đúng mức tối ưu -> Ẩn banner
        if (curR === optR && curP === optP) {
            bannerEl.style.display = 'none';
            return;
        }

        const diffR = curR - optR;
        const diffP = curP - optP;
        const overPlots = Math.max(0, diffR) + Math.max(0, diffP);
        const underPlots = Math.max(0, -diffR) + Math.max(0, -diffP);

        // Chỉ kích hoạt nhắc nhở nếu sai lệch đáng kể (>= 2 ô)
        if (overPlots < 2 && underPlots < 2) {
            bannerEl.style.display = 'none';
            return;
        }

        const curRatePerHour = Math.round(plan.rate_per_second * 3600);
        const dishListStr = opt.dishNames.join(', ');

        let explanation = '';
        let gainPerHour = 0;

        if (overPlots >= 2) {
            // Chọn quá nhiều ô đất -> Cơ sở bị nghẽn (bottleneck), chiếm dụng đất của Nhân sâm
            gainPerHour = Math.round(overPlots * 3500);
            const estOptRate = curRatePerHour + gainPerHour;
            explanation = isVi
                ? `Hiện tại anh đang chọn <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> (Đạt <strong>${curRatePerHour.toLocaleString()} coin/h</strong>). Cơ sở chế biến <em>${dishListStr}</em> đã chạm trần công suất. Số ô nông sản dư thừa phải bán thô giá rẻ (74 coin), đồng thời chiếm dụng mất diện tích Farmland quý giá của Nhân sâm.<br>
                   👉 Mức cân bằng tối ưu nhất: <strong>${optR} ô Củ cải & ${optP} ô Ớt</strong> — Dự kiến tăng thêm <strong>+${gainPerHour.toLocaleString()} coin/h</strong> (đạt ~<strong>${estOptRate.toLocaleString()} coin/h</strong>).`
                : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> (${curRatePerHour.toLocaleString()} coins/h). Processing facilities for <em>${dishListStr}</em> are at maximum capacity. Excess harvest is sold raw at a discount (74 coins) while occupying valuable Farmland needed for Ginseng.<br>
                   👉 Optimal sweet spot: <strong>${optR} Radish & ${optP} Pepper plots</strong> — Estimated gain: <strong>+${gainPerHour.toLocaleString()} coins/h</strong> (approx ~<strong>${estOptRate.toLocaleString()} coins/h</strong>).`;
        } else {
            // Chọn quá ít ô đất -> Cơ sở bị đói nguyên liệu
            gainPerHour = Math.round(underPlots * 2200);
            const estOptRate = curRatePerHour + gainPerHour;
            explanation = isVi
                ? `Hiện tại anh đang chọn <strong>${curR} ô Củ cải & ${curP} ô Ớt</strong> (Đạt <strong>${curRatePerHour.toLocaleString()} coin/h</strong>). Cơ sở chế biến <em>${dishListStr}</em> đang bị thiếu nguyên liệu, hoạt động dưới công suất tối đa.<br>
                   👉 Đề xuất nâng lên: <strong>${optR} ô Củ cải & ${optP} ô Ớt</strong> — Dự kiến tăng thêm <strong>+${gainPerHour.toLocaleString()} coin/h</strong> (đạt ~<strong>${estOptRate.toLocaleString()} coin/h</strong>).`
                : `You currently have <strong>${curR} Radish & ${curP} Pepper plots</strong> (${curRatePerHour.toLocaleString()} coins/h). Facilities for <em>${dishListStr}</em> are starved of ingredients and running below capacity.<br>
                   👉 Recommended setup: <strong>${optR} Radish & ${optP} Pepper plots</strong> — Estimated gain: <strong>+${gainPerHour.toLocaleString()} coins/h</strong> (approx ~<strong>${estOptRate.toLocaleString()} coins/h</strong>).`;
        }

        bannerEl.innerHTML = `
            <div class="plots-opt-content">
                <div class="plots-opt-icon">⚡</div>
                <div class="plots-opt-text">
                    <h4>${isVi ? 'Đề xuất Cân bằng Ô đất Tối ưu (Optimal Plot Balancer)' : 'Optimal Plot Balance Recommendation'}</h4>
                    <p>${explanation}</p>
                </div>
            </div>
            <button class="btn-apply-plots-opt" onclick="window.applyOptimalPlots(${optR}, ${optP})">
                ⚡ ${isVi ? `Áp dụng ngay: ${optR} Củ cải & ${optP} Ớt` : `Apply: ${optR} Radish & ${optP} Pepper`}
            </button>
        `;
        bannerEl.style.display = 'flex';
    }

    function apply(radish, pepper) {
        const radishInput = document.getElementById('season-radish-plots');
        const pepperInput = document.getElementById('season-pepper-plots');
        if (radishInput) radishInput.value = radish;
        if (pepperInput) pepperInput.value = pepper;
        setRadishPlots(radish);
        setPepperPlots(pepper);
        if (typeof saveInputsToStorage === 'function') {
            saveInputsToStorage();
        }
        if (typeof runFindPlan === 'function') {
            runFindPlan();
        }
    }

    function attachGlobal() {
        if (window) {
            window.applyOptimalPlots = apply;
        }
    }

    return {
        evaluate,
        apply,
        attachGlobal,
    };
}
