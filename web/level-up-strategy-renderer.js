export function getLevelUpStockNames(cost, chains) {
    const names = ['coins'];
    cost.items.forEach(([item]) => {
        const chain = chains.find(items => items.includes(item));
        if (chain) names.push(...chain.slice(0, chain.indexOf(item) + 1));
    });
    return names;
}

export function getLevelUpStockAmount(stock, name) {
    const amount = Number(stock[name]);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function buildLevelUpStrategyViewModel({
    unavailable, isVietnamese = false, titleText = '', cost = null, stockRows = [],
    formatNumber = value => String(value), getItemDisplayName = name => name,
}) {
    if (unavailable) {
        const noteText = isVietnamese
            ? `${unavailable} Kế hoạch sẽ ưu tiên kiếm nhiều Home Coin nhất.`
            : `${unavailable} Plans will go for the most Home Coins.`;
        return { costHtml: `<p class="level-up-note">${noteText}</p>`, stockVisible: false, stockGridHtml: '' };
    }

    const chip = (amount, name) => `<div class="chip"><span><span class="chip-count">${formatNumber(amount)}</span> ${getItemDisplayName(name)}</span></div>`;
    const costHtml = `
        <p class="assume-title">${titleText}</p>
        <div class="chip-grid">${chip(cost.coins, 'coins')}${cost.items.map(([item, amount]) => chip(amount, item)).join('')}</div>`;
    const stockGridHtml = stockRows.map(({ name, amount }) => `
            <div class="input-field">
                <label for="stock-${name}">${getItemDisplayName(name)}</label>
                <input type="number" id="stock-${name}" data-stock="${name}" min="0" value="${amount}">
            </div>`).join('');
    return { costHtml, stockVisible: true, stockGridHtml };
}
