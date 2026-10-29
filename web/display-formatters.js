export const ITEM_NAMES = {
    coins: 'Home Coins',
    wood_block: 'Wood Blocks',
    mineral_sand: 'Mineral Sand',
    umbral_sweet_and_spicy_sauce: 'Umbral Sweet and Spicy Sauce',
    wonder_sweet_and_spicy_sauce: 'Wonder Sweet and Spicy Sauce',
    wonder_night_platter: 'Wonder Night Platter',
    wonder_pickled_platter: 'Wonder Pickled Platter',
    wonder_pumpkin_pot: 'Wonder Pumpkin Pot',
    candied_magic_pumpkin: 'Candied Magic Pumpkin',
    roasted_lanternfruit: 'Roasted Lanternfruit',
    magic_pumpkin: 'Magic Pumpkin',
    memory_lanternfruit: 'Memory Lanternfruit',
    coarse_sifted_ore: 'Coarse-Sifted Ore',
    river_washed_stones: 'River-Washed Stones',
    premium_river_washed_stones: 'Premium River-Washed Stones',
    sugar_roasted_chestnuts: 'Sugar-Roasted Chestnuts',
    flowers_in_a_bottle: 'Flowers in a Bottle',
};

export function numberOrDefault(value, fallback) {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export function floatOrDefault(value, fallback) {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

export function formatNumber(num) {
    return num.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

export function formatRate(n, formatNumberFn = formatNumber) {
    return n >= 10 ? formatNumberFn(Math.round(n)) : String(Number(n.toPrecision(2)));
}

export function getFacilityDisplayName(name, win = typeof window !== 'undefined' ? window : null) {
    if (!name) return name;
    if (win?.i18n && typeof win.i18n.getFacilityDisplayName === 'function') {
        return win.i18n.getFacilityDisplayName(name);
    }
    return name;
}

export function getModeDisplayName(mode, win = typeof window !== 'undefined' ? window : null) {
    if (!mode) return mode;
    if (win?.i18n && typeof win.i18n.getModeDisplayName === 'function') {
        return win.i18n.getModeDisplayName(mode);
    }
    return mode;
}

export function getModuleDisplayName(name, win = typeof window !== 'undefined' ? window : null) {
    if (!name) return name;
    if (win?.i18n && typeof win.i18n.getModuleDisplayName === 'function') {
        return win.i18n.getModuleDisplayName(name);
    }
    return name.split('_').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export function getItemDisplayName(name, win = typeof window !== 'undefined' ? window : null, prettyItemFn = prettyItem) {
    if (!name) return name;
    if (win?.i18n && typeof win.i18n.getItemDisplayName === 'function') {
        return win.i18n.getItemDisplayName(name);
    }
    return prettyItemFn(name, { window: win });
}

export function prettyItem(name, { window: win = typeof window !== 'undefined' ? window : null, itemNames = ITEM_NAMES } = {}) {
    if (!name) return '';
    if (win?.i18n && typeof win.i18n.getItemDisplayName === 'function') {
        return win.i18n.getItemDisplayName(name);
    }
    const base = String(name).replace(/__(specialist|manual)$/, '');
    const isVi = win?.i18n && win.i18n.getLang?.() === 'vi';
    if (isVi) {
        const viItems = win?.VI_ITEM_NAMES || null;
        if (viItems) {
            if (viItems[name]) return viItems[name];
            if (viItems[base]) return viItems[base];
            const snake = base.toLowerCase().replace(/[\s-]+/g, '_');
            if (viItems[snake]) return viItems[snake];
        }
    }
    if (itemNames[name]) return itemNames[name];
    if (itemNames[base]) return itemNames[base];
    const snake = base.toLowerCase().replace(/[\s-]+/g, '_');
    if (itemNames[snake]) return itemNames[snake];
    return base.split('_').map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
}

export function prettyReason(reason, { window: win = typeof window !== 'undefined' ? window : null, prettyItemFn = prettyItem } = {}) {
    if (!reason) return reason;
    const isVi = win?.i18n && win.i18n.getLang?.() === 'vi';
    const names = list => list.split(', ').map(item => prettyItemFn(item, { window: win })).join(', ');
    if (isVi) {
        let r = reason;
        r = r.replace(/^[Uu]sed for ([^;]+)/, (_, list) => 'Dùng cho ' + names(list));
        r = r.replace(/; the rest sells directly/, '; phần còn lại bán trực tiếp');
        r = r.replace(/; the rest goes to the level-up/, '; phần còn lại để nâng cấp RV');
        r = r.replace(/; the rest is eaten by Aniimo/, '; phần còn lại cho Aniimo ăn');
        r = r.replace(/; the rest is eaten and sold/, '; phần còn lại cho Aniimo ăn và bán');
        r = r.replace(/^[Ee]aten by Aniimo; the rest sells directly/, 'Thức ăn cho Aniimo; phần còn lại bán trực tiếp');
        r = r.replace(/^[Ee]aten by Aniimo/, 'Thức ăn cho Aniimo');
        r = r.replace(/^[Ss]ells directly/, 'Bán trực tiếp');
        r = r.replace(/^[Ff]or the level-up/, 'Dùng để nâng cấp RV');
        r = r.replace(/takes turns with ([^;]+)$/, (_, list) => 'luân phiên với ' + names(list));
        r = r.replace(/^[Tt]akes turns with ([^;]+)/, (_, list) => 'Luân phiên với ' + names(list));
        r = r.replace(/^Nothing it can make.*/, 'Không có sản phẩm nào cần thiết cho kế hoạch này');
        r = r.replace(/grown without ([^;]+) at ([0-9]+)% speed/, (_, wants, speed) => `trồng không cần ${prettyItemFn(wants, { window: win })} ở tốc độ ${speed}%`);
        return r;
    }
    return reason
        .replace(/^Used for ([^;]+)/, (_, list) => 'Used for ' + names(list))
        .replace(/takes turns with ([^;]+)$/, (_, list) => 'takes turns with ' + names(list));
}

export function goalName(row) {
    if (!row) return '';
    return row.target === 'coins' ? 'Home Coins' : (row.label || '');
}
