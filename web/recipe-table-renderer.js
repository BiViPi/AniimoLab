// Builds the static facility recipe reference tables from game recipes and injected display
// helpers. DOM insertion and search filtering remain the responsibility of the app adapter.
export function createRecipeTableRenderer(deps) {
    const moduleLabels = {
        ecological_module: 'Ecological Module',
        kitchen_module: 'Kitchen Module',
        resource_detector: 'Resource Detector',
        crafting_module: 'Crafting Module',
    };
    const viJobSteps = {
        Sowing: 'Gieo hạt',
        Watering: 'Tưới nước',
        Reaping: 'Thu hoạch',
        Logging: 'Đốn gỗ',
        Collecting: 'Thu thập',
    };
    const isVietnamese = () => deps.getLanguage() === 'vi';

    function formatTime(seconds) {
        const total = Math.round(seconds);
        const hours = Math.floor(total / 3600);
        const minutes = Math.floor((total % 3600) / 60);
        const secs = total % 60;
        if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
        if (minutes > 0) return `${minutes}m ${secs}s`;
        return `${secs}s`;
    }

    function formatInputs(recipe) {
        const isVi = isVietnamese();
        if (recipe.raw_materials && recipe.raw_materials.length > 0) {
            const amounts = recipe.required_amount || [];
            return recipe.raw_materials.map((material, index) => `${amounts[index] ?? '?'}× ${deps.prettyItem(material)}`).join(', ');
        }
        if (recipe.cost && recipe.cost > 0) return isVi ? `Chi phí hạt: ${recipe.cost} Xu Gia Viên` : `Plant cost: ${recipe.cost} Home Coins`;
        return '-';
    }

    function formatYield(recipe) {
        let text = `${recipe.yield_amount}`;
        if (recipe.byproduct) {
            const [name, amount] = recipe.byproduct;
            text += ` <span class="hint small">(+${amount} ${deps.prettyItem(name)})</span>`;
        }
        return text;
    }

    function formatAniimo(recipe, facility) {
        const isVi = isVietnamese();
        const i18n = deps.getI18n();
        if (!recipe.aniimo) {
            const jobs = [];
            (recipe.jobs || []).forEach(job => {
                const last = jobs[jobs.length - 1];
                if (last && last.job[0] === job[0]) last.times += 1;
                else jobs.push({ job, times: 1 });
            });
            if (!jobs.length) return '-';
            return `<span class="job-list">${jobs.map(({ job: [step, ability, level], times }) => {
                const stepName = i18n ? i18n.getJobStepDisplayName(step) : (isVi && viJobSteps[step] ? viJobSteps[step] : step);
                return `<span class="job"><span class="job-step">${stepName}${times > 1 ? ` &times;${times}` : ''}</span> ${deps.abilityTag(ability)}${level > 1 ? ` Lv.${level}+` : ''}</span>`;
            }).join('')}</span>`;
        }
        const [ability, minLevel] = recipe.aniimo;
        const personality = facility.personality;
        const personalityName = personality ? (i18n ? i18n.getPersonalityDisplayName(personality) : personality) : '';
        const best = isVi
            ? `Tối ưu Lv.${deps.bestAniimoLevel(ability)}${personalityName ? ` ${personalityName}` : ''}`
            : `best Lv.${deps.bestAniimoLevel(ability)}${personality ? ` ${personality}` : ''}`;
        return `<span>${deps.abilityTag(ability)} Lv.${minLevel}+<span class="recipe-best">${best}</span></span>`;
    }

    function formatSell(recipe) {
        const isVi = isVietnamese();
        if (recipe.sell_currency === 'none') return `<span class="hint small">${isVi ? 'Nâng cấp RV' : 'RV level-ups'}</span>`;
        return `${deps.formatNumber(recipe.sell_value)} ${isVi ? 'Xu Gia Viên' : (recipe.sell_value === 1 ? 'Home Coin' : 'Home Coins')}`;
    }

    function formatModule(recipe) {
        if (!recipe.module_requirement) return '-';
        const [name, level] = recipe.module_requirement;
        const i18n = deps.getI18n();
        const label = i18n ? i18n.getModuleDisplayName(name) : (moduleLabels[name] || name);
        return `${label} Lv.${level}`;
    }

    function render(recipes) {
        const isVi = isVietnamese();
        const VI_CATEGORIES = {
            Materials: 'Nguyên Liệu',
            Environment: 'Môi Trường',
            'Aniimo Materials': 'Nguyên Liệu Aniimo',
            'Wood & Ore Processing': 'Gia Công Gỗ & Quặng',
            'Materials Processing': 'Chế Biến Nguyên Liệu',
        };
        const thItem = isVi ? 'Vật phẩm' : 'Item';
        const thLevel = isVi ? 'Cấp' : 'Level';
        const thInputs = isVi ? 'Nguyên liệu' : 'Inputs';
        const thYield = isVi ? 'Sản lượng' : 'Yield';
        const thTime = isVi ? 'Thời gian' : 'Time';
        const thSell = isVi ? 'Giá bán' : 'Sell';
        const thModule = isVi ? 'Mô-đun' : 'Module';
        const thAniimo = 'Aniimo';
        const tipTime = isVi
            ? 'Thời gian phát triển của cây trồng và cây lấy gỗ (mỗi lần tưới nước giảm 1/8 thời gian còn lại, tối đa 2 lần). Với các xưởng chế biến và cơ sở thu thập, thời gian hiển thị khối lượng công việc (Workload): ở 100% Hiệu suất, máy hoàn thành 1 khối lượng công việc/giây. Với Chế độ điện (⚡ E-mode), máy tự vận hành theo thời gian cơ bản mà không cần Aniimo.'
            : 'Grow time for crops and trees, before watering takes an eighth off it twice. Everything else lists workload: at 100% Efficiency a processor gets through one workload a second, a gathering facility 1.25 on a level-2 recipe and 1.5 on a level-3 one. An Aniimo at the level a recipe needs works at 100%; higher levels are faster, up to level 4. E-mode runs without Aniimo workers.';
        const tipAniimo = isVi
            ? 'Cấp độ kỹ năng tối thiểu để chế tạo, cùng với Aniimo tối ưu nhất (Lv.4 với tính cách tương thích tăng +20% tốc độ). Đối với cây trồng/lâm nghiệp, hiển thị kỹ năng cần cho từng công đoạn (Gieo hạt, Tưới nước, Thu hoạch...).'
            : 'The lowest ability level that can make this, and the best Aniimo for it: level 4, the top, with the facility\'s personality (+20% speed). For crops and trees, the ability each job needs, in order.';

        const byFacility = new Map();
        recipes.forEach(recipe => {
            if (!byFacility.has(recipe.facility)) byFacility.set(recipe.facility, []);
            byFacility.get(recipe.facility).push(recipe);
        });
        byFacility.forEach(list => list.sort((a, b) => a.facility_level - b.facility_level || a.name.localeCompare(b.name)));

        return deps.facilityCategories.map(category => {
            const facilities = deps.facilities.filter(facility => facility.category === category && byFacility.has(facility.name));
            if (!facilities.length) return '';
            const categoryTitle = isVi && VI_CATEGORIES[category] ? VI_CATEGORIES[category] : category;
            const tables = facilities.map(facility => {
                const cell = (label, value) => `<td data-label="${label}"${value === '-' ? ' class="empty"' : ''}>${value}</td>`;
                const rows = byFacility.get(facility.name).map(recipe => {
                    const searchText = [recipe.name, deps.prettyItem(recipe.name), facility.name, deps.getFacilityDisplayName(facility.name), ...(recipe.raw_materials || [])].join(' ');
                    return `
                <tr class="facility-recipe-row${recipe.verified === false ? ' unverified' : ''}" data-search-text="${deps.escapeText(searchText)}">
                    <td class="recipe-name">${deps.prettyItem(recipe.name)}${deps.specialNames.has(recipe.name) ? ` <span class="tag special" title="${isVi ? 'Cần tiền tệ hiếm để mở khóa' : 'Takes a rare currency to unlock'}">${isVi ? 'đặc biệt' : 'special'}</span>` : ''}${recipe.season ? ` <span class="tag special" title="${deps.seasonName} only">${isVi ? 'mùa vụ' : 'season'}</span>` : ''}${recipe.verified === false ? ` <span class="info-icon" data-tooltip="${isVi ? 'Chưa kiểm chứng trong game' : 'Not yet checked in game.'}">?</span>` : ''}</td>
                    ${cell(thLevel, recipe.facility_level)}
                    ${cell(thInputs, formatInputs(recipe))}
                    ${cell(thYield, formatYield(recipe))}
                    ${cell(thTime, recipe.workload ? `${recipe.workload} workload${recipe.emode_base_time ? ` <span class="tag emode-tag-small" title="${isVi ? 'Thời gian gốc Chế độ điện: ' : 'E-mode base time: '}${formatTime(recipe.emode_base_time)}">⚡${formatTime(recipe.emode_base_time)}</span>` : ''}` : formatTime(recipe.production_time))}
                    ${cell(thSell, formatSell(recipe))}
                    ${cell(thModule, formatModule(recipe))}
                    ${cell(thAniimo, formatAniimo(recipe, facility))}
                </tr>
            `;
                }).join('');
                return `
                <div class="facility-recipe-table">
                    <h4>${deps.getFacilityDisplayName(facility.name)}</h4>
                    <div class="table-wrapper">
                        <table class="recipe-table">
                            <thead>
                                <tr>
                                    <th>${thItem}</th><th>${thLevel}</th><th>${thInputs}</th><th>${thYield}</th>
                                    <th>${thTime} <span class="info-icon" data-tooltip="${tipTime}">?</span></th>
                                    <th>${thSell}</th><th>${thModule}</th>
                                    <th>${thAniimo} <span class="info-icon" data-tooltip="${tipAniimo}">?</span></th>
                                </tr>
                            </thead>
                            <tbody>${rows}</tbody>
                        </table>
                    </div>
                </div>`;
            }).join('');
            return `<div class="facility-category"><h4 class="facility-category-title">${categoryTitle}</h4>${tables}</div>`;
        }).join('');
    }

    return { render, formatTime, formatInputs, formatYield, formatAniimo, formatSell, formatModule };
}
