export function createStrategyUIController({
    document = typeof window !== 'undefined' ? window.document : null,
    window: win = typeof window !== 'undefined' ? window : null,
    isSimpleMode = () => false,
    selectedHomeLevel = () => 1,
    isRV20Endgame = () => false,
    isLevelUpStrategy = () => true,
    levelUpCosts = {},
    levelUpChains = {},
    maxHomeLevel = 20,
    rateUnitSeconds = {},
    renderSeason,
    renderPriorities,
    getLevelUpStock = () => ({}),
    setLevelUpStock,
    setLevelUpTargetChosen,
    formatNumber = n => String(n),
    formatRate = n => String(n),
    getItemDisplayName = name => name,
    isVietnamese = () => {
        const lang = win?.i18n?.getLang?.();
        return lang === 'vi';
    },
    saveInputsToStorage,
    runFindPlan,
    getPlanContext = () => null,
    buildLevelUpStrategyViewModel,
    buildLevelUpViewModel,
    createStrategyFormController,
    getLevelUpStockNames = () => [],
    getLevelUpStockAmount = (stock, name) => stock?.[name] ?? 0,
    numberOrDefault = (val, def) => {
        const n = parseInt(val, 10);
        return Number.isNaN(n) ? def : n;
    },
    floatOrDefault = (val, def) => {
        const n = parseFloat(val);
        return Number.isNaN(n) ? def : n;
    },
} = {}) {
    function levelUpTarget() {
        if (isSimpleMode()) return selectedHomeLevel() + 1;
        const val = document?.getElementById?.('level-up-target')?.value;
        return numberOrDefault(val, 7);
    }

    function levelUpCost() {
        return levelUpCosts[levelUpTarget()] || null;
    }

    function levelUpUnavailable() {
        const target = levelUpTarget();
        if (target > maxHomeLevel) return `RV ${maxHomeLevel} is the top level, so there's no level-up to plan.`;
        if (!levelUpCosts[target]) return `There's no level-up cost for RV ${target}.`;
        return null;
    }

    function populateLevelUpTargets() {
        const select = document?.getElementById?.('level-up-target');
        if (!select) return;
        select.innerHTML = Object.keys(levelUpCosts).map(level => `<option value="${level}">${level}</option>`).join('');
    }

    function renderStrategy() {
        if (typeof renderSeason === 'function') renderSeason();
        const isRV20 = isRV20Endgame();
        const prioritiesSec = document?.getElementById?.('priorities-section');
        if (prioritiesSec) {
            prioritiesSec.hidden = !isRV20;
            if (isRV20 && typeof renderPriorities === 'function') {
                renderPriorities();
            }
        }

        const levelUpCard = document?.querySelector?.('.config-strategy-card');
        const levelUpConfig = document?.getElementById?.('level-up-config');
        if (isRV20) {
            if (levelUpCard?.style) levelUpCard.style.display = 'none';
            if (levelUpConfig?.style) levelUpConfig.style.display = 'none';
            return;
        }
        if (levelUpConfig?.style) levelUpConfig.style.display = 'block';

        const targetRow = document?.getElementById?.('level-up-target-row');
        if (targetRow?.style) targetRow.style.display = isSimpleMode() ? 'none' : '';

        const costEl = document?.getElementById?.('level-up-cost');
        const stockDetails = document?.getElementById?.('level-up-stock');
        if (!costEl || !stockDetails) return;

        const unavailable = levelUpUnavailable();
        const cost = unavailable ? null : levelUpCost();
        const stockNames = cost && typeof getLevelUpStockNames === 'function'
            ? getLevelUpStockNames(cost, levelUpChains)
            : [];
        const isVi = isVietnamese();
        const titleText = cost
            ? ((win?.i18n?.t ? win.i18n.t('rv_costs') : 'RV {level} costs').replace('{level}', levelUpTarget()))
            : '';

        const stock = typeof getLevelUpStock === 'function' ? getLevelUpStock() : {};
        const view = typeof buildLevelUpStrategyViewModel === 'function'
            ? buildLevelUpStrategyViewModel({
                unavailable,
                isVietnamese: isVi,
                titleText,
                cost,
                stockRows: stockNames.map(name => ({
                    name,
                    amount: getLevelUpStockAmount(stock, name),
                })),
                formatNumber,
                getItemDisplayName,
            })
            : { costHtml: '', stockVisible: false, stockGridHtml: '' };

        costEl.innerHTML = view.costHtml;
        if (stockDetails.style) stockDetails.style.display = view.stockVisible ? '' : 'none';
        const stockGrid = document?.getElementById?.('level-up-stock-grid');
        if (stockGrid) {
            stockGrid.innerHTML = view.stockGridHtml;
        }
    }

    function attachStrategyHandlers() {
        if (typeof createStrategyFormController !== 'function') return;
        createStrategyFormController({
            document,
            renderStrategy,
            setLevelUpTargetChosen: value => {
                if (typeof setLevelUpTargetChosen === 'function') setLevelUpTargetChosen(value);
            },
            setStock: (name, amount) => {
                if (typeof setLevelUpStock === 'function') setLevelUpStock(name, amount);
            },
            floatOrDefault,
            save: saveInputsToStorage,
            runFindPlan,
        }).attach();
    }

    function levelUpInput() {
        if ((typeof isLevelUpStrategy === 'function' && !isLevelUpStrategy()) || levelUpUnavailable()) return null;
        const cost = levelUpCost();
        if (!cost) return null;
        const stock = typeof getLevelUpStock === 'function' ? getLevelUpStock() : {};
        const stockNames = typeof getLevelUpStockNames === 'function'
            ? getLevelUpStockNames(cost, levelUpChains)
            : [];
        return {
            cost: [['coins', cost.coins], ...(cost.items || [])],
            stock: stockNames
                .filter(name => getLevelUpStockAmount(stock, name) > 0)
                .map(name => [name, getLevelUpStockAmount(stock, name)]),
        };
    }

    function perHour(perSecond) {
        const hourly = perSecond * 3600;
        return hourly < 10 ? hourly.toFixed(1) : formatNumber(Math.round(hourly));
    }

    function formatDuration(seconds) {
        const minutes = Math.ceil(seconds / 60);
        const days = Math.floor(minutes / 1440);
        const hours = Math.floor((minutes % 1440) / 60);
        const mins = minutes % 60;
        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${mins}m`;
        return `${mins}m`;
    }

    function renderLevelUp(plan) {
        const card = document?.getElementById?.('level-up-card');
        const select = document?.getElementById?.('rate-unit');
        const rateBlock = document?.getElementById?.('rate-block');
        if (select?.closest?.('#level-up-card')) {
            document?.getElementById?.('rate-line')?.appendChild?.(select);
        }
        if (rateBlock?.style) rateBlock.style.display = '';

        const planContext = typeof getPlanContext === 'function' ? getPlanContext() : null;
        const isVi = isVietnamese();

        const rendered = typeof buildLevelUpViewModel === 'function'
            ? buildLevelUpViewModel(plan, planContext, {
                rateUnit: select?.value,
                rateUnitSeconds,
                isVietnamese: isVi,
                formatDuration,
                formatRate,
                formatNumber,
                getItemDisplayName,
                getTableHeading: (key, fallback) => (win?.th ? win.th(key, fallback) : fallback),
            })
            : { visible: false };

        if (!rendered || !rendered.visible) {
            if (card?.style) card.style.display = 'none';
            return;
        }

        if (card?.style) card.style.display = 'block';
        const labelEl = document?.getElementById?.('level-up-label');
        if (labelEl) labelEl.textContent = rendered.labelText;
        const timeEl = document?.getElementById?.('level-up-time');
        if (timeEl) timeEl.textContent = rendered.timeText;
        const linesEl = document?.getElementById?.('level-up-lines');
        if (linesEl) linesEl.innerHTML = rendered.linesHtml;

        if (rendered.rateUnitInTable && select) {
            document?.getElementById?.('level-up-rate-head')?.appendChild?.(select);
            if (rendered.rateBlockHidden && rateBlock?.style) rateBlock.style.display = 'none';
        }
    }

    return {
        levelUpTarget,
        levelUpCost,
        levelUpUnavailable,
        populateLevelUpTargets,
        renderStrategy,
        attachStrategyHandlers,
        levelUpInput,
        perHour,
        formatDuration,
        renderLevelUp,
    };
}
