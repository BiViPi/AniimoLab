// Facility and Item Asset Map
// Maps game facilities and items to clean WebP icon paths

const CDN_BASE = 'https://aniimoguide.com/images/homeland/';

export const FACILITY_ICONS = {
  "Farmland": "aniimo-farmland-lv1-3-homeland.webp",
  "Woodland": "aniimo-woodland-lv1-2-homeland.webp",
  "Mine": "aniimo-mine-lv1-3-homeland.webp",
  "Well": "aniimo-well-homeland.webp",
  "Blazing Stove": "aniimo-blazing-stove-homeland.webp",
  "Claw Game Cooker": "aniimo-claw-game-cooker-lv1-4-homeland.webp",
  "Simmering Pot": "aniimo-simmering-pot-homeland.webp",
  "Bouncy Brew Keg": "aniimo-bouncy-brew-keg-lv1-2-homeland.webp",
  "Carousel Mill": "aniimo-carousel-mill-lv1-3-homeland.webp",
  "Joy Wheel Loom": "aniimo-joy-wheel-loom-lv1-homeland.webp",
  "Jukebox Dryer": "aniimo-jukebox-dryer-lv1-3-homeland.webp",
  "Crafting Table": "aniimo-crafting-table-lv1-4-homeland.webp",
  "Woodworking Bench": "aniimo-woodworking-bench-homeland.webp",
  "Chimney Kiln": "aniimo-chimney-kiln-homeland.webp",
  "Dewy House": "aniimo-dewy-house-homeland.webp",
  "Nimbus Bed": "aniimo-nimbus-bed-homeland.webp",
  "Tidewhisper Sandcastle": "aniimo-tidewhisper-sandcastle-homeland.webp",
  "Floral Windmill": "aniimo-floral-windmill-homeland.webp",
  "Starfall Hammock": "aniimo-starfall-hammock-homeland.webp",
  "Dance Pad Polisher": "aniimo-dance-pad-polisher-homeland.webp",
  "Phonolfactory Table": "aniimo-phonolfactory-table-lv1-2-homeland.webp",
  "Aniipod Maker": "aniimo-aniipod-maker-homeland.webp",
  "Heat Furnace": "aniimo-heat-furnace-homeland.webp",
  "Cooling Unit": "aniimo-cooling-unit-homeland.webp",
  "Sunlamp": "aniimo-sunlamp-homeland.webp",
  "Pickling Jar": "aniimo-pickling-jar-homeland.webp",
  "Crackle Generator": "aniimo-crackle-generator-homeland.webp",
  "Generator": "aniimo-crackle-generator-homeland.webp",
  "Crackle Power Pole": "aniimo-crackle-power-pole-homeland.webp",
  "Power Pole": "aniimo-crackle-power-pole-homeland.webp",
  "Storage Unit": "aniimo-storage-unit-homeland.webp"
};

const KNOWN_SLUGS = new Set(["advanced-gemstone-dust", "advanced-lemon-incense", "advanced-wind-chime", "agave", "agave-drink", "agave-syrup", "aniipod", "aniipod-maker", "aniipod-mega", "aniipod-pro", "apple", "apple-candy", "apple-juice", "apple-tart", "aromathyst", "artisanship-job", "bamboo", "bamboo-joss-stick", "bamboo-ware", "berry-chocolate-coconut-pudding", "blazing-stove", "bouncy-brew-keg-lv1-2", "bouncy-brew-keg-lv3-plus", "bouquet", "bread", "candied-orange-flower", "candied-strawberries", "caramel-nut-chips", "carousel-mill-lv1-3", "carousel-mill-lv4-plus", "cherry-blossom", "cherry-blossom-rice-ball", "cherry-incense", "chestnut", "chestnut-puree", "chimney-kiln", "cider-vinegar", "claw-game-cooker-lv1-4", "claw-game-cooker-lv5-plus", "clay", "coarse-sifted-ore", "cocoa", "cocoa-powder", "cocoa-spread", "coconut", "coconut-cocoa", "coconut-cookie", "coconut-cooler", "coconut-milk", "coconut-oil", "cooling-unit", "copper-ore", "cotton", "cotton-fabric", "cotton-thread", "crafting-table-lv1-4", "crafting-table-lv5-plus", "cranberry", "cranberry-chocolate", "cranberry-jam", "cranberry-juice", "creamy-potato-soup", "dance-pad-polisher", "dark-job", "deep-rock-spring-water", "densified-timber-component", "dewy-house", "doll", "dream-catcher", "dried-apple-slices", "dried-bean-curd", "dried-cherry-blossom", "dried-cranberries", "dried-flowers", "dried-ginseng", "dried-grapes", "dried-lemon-slices", "dried-strawberries", "dye", "dyed-cotton-fabric", "earth-job", "egg-incubator", "energetic-personality", "faithful-personality", "farmland-lv1-3", "farmland-lv4-plus", "fire-job", "floral-windmill", "flower-bread", "flowers-in-a-bottle", "fresh-water", "gem", "gemstone-dust", "ginseng", "ginseng-chestnut-cake", "ginseng-porridge", "ginseng-powder", "ginseng-water", "grape", "grape-candy", "grape-jam", "grape-juice", "grape-lemon-drink", "grass-job", "growth-bud", "growth-flower", "growth-fruit", "harvest-moon-market-stall-blueprint", "harvest-moon-moon-rabbit-blueprint", "harvest-moon-stew-pot-blueprint", "harvest-platter", "hauling-job", "heat-furnace", "herbal-ginseng-aroma", "home-coin", "hot-cocoa", "ice-job", "instinctive-personality", "jello", "joy-wheel-loom-lv1", "joy-wheel-loom-lv2-plus", "judicious-personality", "jukebox-dryer-lv1-3", "jukebox-dryer-lv4-plus", "laminated-beams", "lavender", "lavender-cookies", "lavender-incense", "lavender-powder", "lavender-sachet", "leisure-job", "lemon", "lemon-incense", "light-job", "lightning-job", "lotion", "malt-sugar", "maple-candy-apple-jam", "maple-candy-roasted-potatoes", "maple-candy-star", "maple-sugar-chunk", "maple-syrup", "microcrystalline-ore-plate", "milled-rice", "mine-lv1-3", "mine-lv4-plus", "mineral-sand", "mixed-perfume", "moondew-radish", "moondew-radish-slices", "moonray-wheat", "natural-mineral-spring-water", "natural-rubber", "nimble-personality", "nimbus-bed", "nuts", "orange-flower", "orange-flower-dew", "orange-flower-incense", "palm-bark", "palm-rope", "pearl", "pearl-necklace", "perfumery-job", "petals", "phonolfactory-table-lv1-2", "phonolfactory-table-lv3-plus", "pickling-jar", "plain-rice-porridge", "playful-personality", "porcelain", "potato", "potato-chips", "potato-kvass", "pottery", "practical-personality", "premium-berry-chocolate-coconut-pudding", "premium-bread", "premium-jello", "premium-mixed-perfume", "premium-potato-soup", "premium-river-washed-stones", "premium-rose-freshener", "premium-salted-lemon", "premium-soap", "premium-sweet-rice-wine", "premium-wheat", "quartz-ore", "refined-flour", "refined-ore", "rice", "rice-drink", "rice-vinegar", "rich-grape-compote", "river-washed-stones", "roasted-soybeans", "roasted-waxing-moon-pepper", "rock", "rock-candy", "rose", "rose-concentrate", "rose-freshener", "rose-incense", "rose-shortbread", "rough-lumber", "rubber-duck", "salted-cherry-blossom", "salted-lemon", "scales", "sea-salt", "shell", "shell-ornament", "shredded-coconut", "simmering-pot", "sintered-ore-brick", "soap", "soy-sauce", "soy-sauce-fried-rice", "soy-sauce-tofu", "soybean", "standard-planks", "star", "star-wish-lantern", "starfall-hammock", "steamed-vermicelli-roll", "storage-unit", "strawberry", "strawberry-candy", "strawberry-cream-puff", "strawberry-jam", "strawberry-juice", "sugar-roasted-chestnuts", "sugarcane", "sugarcane-juice", "sunlamp", "sweet-rice-drink", "tanghulu", "tenacious-personality", "tidewhisper-sandcastle", "toasted-rice-green-tea", "tofu", "umbral-hot-pot", "umbral-pickle", "umbral-sweet-spicy-sauce", "walnut", "walnut-cake", "walnut-milk", "water-job", "waxing-moon-pepper", "well", "well-water", "wheat", "wheat-tea", "wheatmeal", "willow-wood", "wind-chime", "wind-job", "wood-block", "wood-sculpture", "woodland-lv1-2", "woodland-lv3-plus", "woodworking-bench", "wool", "wool-fabric", "woolen-yarn", "woven-toy"]);

/**
 * Convert snake_case or English item name to asset slug.
 * e.g. "copper_ore" -> "copper-ore"
 * "sintered_brick" -> "sintered-ore-brick"
 */
export function itemToSlug(itemName) {
    if (!itemName) return '';
    let slug = itemName.toLowerCase().trim().replace(/_/g, '-').replace(/\s+/g, '-');
    
    // Common aliases in AniimoGuide
    const ALIASES = {
        'sintered-brick': 'sintered-ore-brick',
        'standard-plank': 'standard-planks',
        'refined-ore': 'refined-ore',
        'wood-block': 'wood-block',
        'mineral-sand': 'mineral-sand',
        'willow-wood': 'willow-wood',
        'rough-lumber': 'rough-lumber',
        'deep-rock-spring-water': 'deep-rock-spring-water',
        'natural-mineral-spring-water': 'natural-mineral-spring-water',
        'water': 'well-water',
        'fresh-water': 'natural-mineral-spring-water',
        'quick-water': 'well-water',
        'quick-well-water': 'well-water',
        'quick-sweet-water': 'natural-mineral-spring-water',
        'quick-spring-water': 'deep-rock-spring-water',
        'wheat': 'wheat',
        'quick-wheat': 'wheat',
        'milled-rice': 'milled-rice',
        'quick-milled-rice': 'milled-rice',
        'copper-ore': 'copper-ore',
        'quick-copper-ore': 'copper-ore',
        'quick-fragrant-jelly': 'aromathyst',
        'fragrant-jelly': 'aromathyst',
        'quick-sea-salt': 'sea-salt',
        'quick-lambswool': 'wool',
        'quick-scales': 'scales',
        'quick-aromathyst': 'aromathyst',
        'umbral-sweet-and-spicy-sauce': 'umbral-sweet-spicy-sauce'
    };

    if (ALIASES[slug]) return ALIASES[slug];
    if (KNOWN_SLUGS.has(slug)) return slug;
    
    // Try removing quick- prefix
    if (slug.startsWith('quick-')) {
        const base = slug.replace(/^quick-/, '');
        if (ALIASES[base]) return ALIASES[base];
        if (KNOWN_SLUGS.has(base)) return base;
    }

    return slug;
}

/**
 * Get facility icon URL.
 * Supports Vietnamese names, Electric/Manual suffixes, and standard English names.
 * @param {string} facilityName
 * @param {number} [level=1]
 * @returns {string}
 */
export function getFacilityIconUrl(facilityName, level = 1) {
    if (!facilityName) return '';
    let name = facilityName.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();

    const VI_TO_EN = {
        "Đất Nông Trại": "Farmland",
        "Đất nông nghiệp": "Farmland",
        "Đất Rừng Cây": "Woodland",
        "Lâm nghiệp": "Woodland",
        "Khu Mỏ": "Mine",
        "Mỏ khoáng": "Mine",
        "Giếng Nước": "Well",
        "Giếng nước": "Well",
        "Bếp Lò Rực Rửa": "Blazing Stove",
        "Bếp lửa Blazing": "Blazing Stove",
        "Bếp Kẹp Gắp Thú": "Claw Game Cooker",
        "Nồi gắp kẹo": "Claw Game Cooker",
        "Nồi Hầm": "Simmering Pot",
        "Nồi hầm": "Simmering Pot",
        "Thùng Bia Nảy Nảy": "Bouncy Brew Keg",
        "Thùng ủ lên men": "Bouncy Brew Keg",
        "Cối Xay Vòng Quay": "Carousel Mill",
        "Cối xay Carousel": "Carousel Mill",
        "Khung Cửi Ngựa Gỗ": "Joy Wheel Loom",
        "Khung dệt bánh xe": "Joy Wheel Loom",
        "Máy Sấy Hộp Nhạc": "Jukebox Dryer",
        "Máy sấy Jukebox": "Jukebox Dryer",
        "Bàn Kỹ Nghệ": "Crafting Table",
        "Bàn chế tạo": "Crafting Table",
        "Bàn Gia Công Gỗ": "Woodworking Bench",
        "Bàn mộc": "Woodworking Bench",
        "Lò Ống Khói": "Chimney Kiln",
        "Lò nung ống khói": "Chimney Kiln",
        "Nhà Dewy": "Dewy House",
        "Nhà sương mai": "Dewy House",
        "Giường Cỏ Mây": "Nimbus Bed",
        "Giường mây Nimbus": "Nimbus Bed",
        "Lâu Đài Cát Thủy Triều Thì Thầm": "Tidewhisper Sandcastle",
        "Lâu đài cát Tidewhisper": "Tidewhisper Sandcastle",
        "Cối Xay Gió Hoa": "Floral Windmill",
        "Cối xay gió Floral": "Floral Windmill",
        "Võng Sao Rơi": "Starfall Hammock",
        "Võng sao Starfall": "Starfall Hammock",
        "Máy Nhảy Năng Lượng": "Dance Pad Polisher",
        "Bàn chà thảm nhảy": "Dance Pad Polisher",
        "Bàn Chế Lưu Âm": "Phonolfactory Table",
        "Bàn điều hương Phonolfactory": "Phonolfactory Table",
        "Máy Chế Tạo Aniipod": "Aniipod Maker",
        "Máy làm Aniipod": "Aniipod Maker",
        "Lò Sưởi": "Heat Furnace",
        "Lò sưởi ấm": "Heat Furnace",
        "Máy Làm Mát": "Cooling Unit",
        "Thiết bị làm mát": "Cooling Unit",
        "Đèn Mặt Trời": "Sunlamp",
        "Đèn mặt trời": "Sunlamp",
        "Hũ Muối Chua": "Pickling Jar",
        "Hũ muối chua": "Pickling Jar",
        "Trụ Điện": "Crackle Generator",
        "Máy phát Crackle": "Crackle Generator",
        "Cột Điện Truyền Tải": "Crackle Power Pole",
        "Cột Điện": "Crackle Power Pole",
        "Cột điện Crackle": "Crackle Power Pole",
        "Thiết Bị Lưu Trữ": "Storage Unit",
        "Thiết bị lưu trữ": "Storage Unit"
    };

    if (VI_TO_EN[name]) {
        name = VI_TO_EN[name];
    }

    // Level-specific sprites
    if (name === 'Farmland' && level >= 4) return 'images/homeland/aniimo-farmland-lv4-plus-homeland.webp';
    if (name === 'Woodland' && level >= 3) return 'images/homeland/aniimo-woodland-lv3-plus-homeland.webp';
    if (name === 'Mine' && level >= 4) return 'images/homeland/aniimo-mine-lv4-plus-homeland.webp';
    if (name === 'Joy Wheel Loom' && level >= 2) return 'images/homeland/aniimo-joy-wheel-loom-lv2-plus-homeland.webp';
    if (name === 'Carousel Mill' && level >= 4) return 'images/homeland/aniimo-carousel-mill-lv4-plus-homeland.webp';
    if (name === 'Jukebox Dryer' && level >= 4) return 'images/homeland/aniimo-jukebox-dryer-lv4-plus-homeland.webp';
    if (name === 'Phonolfactory Table' && level >= 3) return 'images/homeland/aniimo-phonolfactory-table-lv3-plus-homeland.webp';

    const file = FACILITY_ICONS[name];
    if (file) return `images/homeland/${file}`;

    // Fallback: slugify facility name
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `images/homeland/aniimo-${slug}-homeland.webp`;
}

/**
 * Get item icon URL.
 * @param {string} itemName
 * @returns {string}
 */
export function getItemIconUrl(itemName) {
    const slug = itemToSlug(itemName);
    return `${CDN_BASE}aniimo-${slug}-homeland.webp`;
}

/**
 * Render facility icon HTML tag.
 * @param {string} facilityName
 * @returns {string}
 */
export function renderFacilityIcon(facilityName) {
    const url = getFacilityIconUrl(facilityName);
    return `<img class="facility-icon-img" src="${url}" alt="${facilityName}" loading="lazy" onerror="this.style.display='none'">`;
}

/**
 * Render item icon HTML tag.
 * @param {string} itemName
 * @returns {string}
 */
const PLACEHOLDER_SVGS = {
    'magic_pumpkin': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Magic Pumpkin (Placeholder)"><circle cx="16" cy="17" r="11" fill="#ea580c" stroke="#f97316" stroke-width="2"/><path d="M16 4 v5" stroke="#15803d" stroke-width="3" stroke-linecap="round"/><text x="16" y="21" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🎃</text></svg>`,
    'candied_magic_pumpkin': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Candied Magic Pumpkin (Placeholder)"><circle cx="16" cy="17" r="11" fill="#c2410c" stroke="#fb923c" stroke-width="2"/><text x="16" y="21" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🍬</text></svg>`,
    'memory_lanternfruit': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Memory Lanternfruit (Placeholder)"><circle cx="16" cy="16" r="11" fill="#854d0e" stroke="#eab308" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🏮</text></svg>`,
    'roasted_lanternfruit': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Roasted Lanternfruit (Placeholder)"><circle cx="16" cy="16" r="11" fill="#713f12" stroke="#fde047" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🔥</text></svg>`,
    'wonder_pumpkin_pot': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Wonder Pumpkin Pot (Placeholder)"><circle cx="16" cy="16" r="11" fill="#431407" stroke="#fb923c" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🍲</text></svg>`,
    'wonder_sweet_and_spicy_sauce': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Wonder Sweet & Spicy Sauce (Placeholder)"><circle cx="16" cy="16" r="11" fill="#7f1d1d" stroke="#f87171" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🥫</text></svg>`,
    'wonder_pickled_platter': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Wonder Pickled Platter (Placeholder)"><circle cx="16" cy="16" r="11" fill="#365314" stroke="#84cc16" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🥗</text></svg>`,
    'wonder_night_platter': `<svg class="item-icon-img placeholder-item-svg" viewBox="0 0 32 32" title="Wonder Night Platter (Placeholder)"><circle cx="16" cy="16" r="11" fill="#581c87" stroke="#c084fc" stroke-width="2"/><text x="16" y="20" font-size="11" text-anchor="middle" fill="#fff" font-weight="bold">🍱</text></svg>`
};

export function renderItemIcon(itemName) {
    if (!itemName) return '';
    if (PLACEHOLDER_SVGS[itemName]) return PLACEHOLDER_SVGS[itemName];
    const url = getItemIconUrl(itemName);
    return `<img class="item-icon-img" src="${url}" alt="${itemName}" loading="lazy" onerror="this.style.display='none'">`;
}

// -------------------------------------------------------------------------------------------------
// Homeland 2D Top-Down Vector Asset Manifest & Renderer
// 100% self-crafted, royalty-free SVG vector graphics, perfectly aligned to grid and district themes.
// -------------------------------------------------------------------------------------------------

export const HOMELAND_ASSET_MANIFEST = {
    'Farmland': {
        slug: 'farmland',
        district: 'agriculture',
        color: '#10b981',
        draw: (cx, cy, s) => `
            <!-- Furrows and crops -->
            <path d="M${cx - s * 0.38} ${cy - s * 0.25} h${s * 0.76} M${cx - s * 0.38} ${cy} h${s * 0.76} M${cx - s * 0.38} ${cy + s * 0.25} h${s * 0.76}" stroke="#065f46" stroke-width="${s * 0.08}" stroke-linecap="round"/>
            <circle cx="${cx - s * 0.2}" cy="${cy - s * 0.25}" r="${s * 0.09}" fill="#34d399"/>
            <circle cx="${cx + s * 0.2}" cy="${cy - s * 0.25}" r="${s * 0.09}" fill="#34d399"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.11}" fill="#6ee7b7"/>
            <circle cx="${cx - s * 0.2}" cy="${cy + s * 0.25}" r="${s * 0.09}" fill="#34d399"/>
            <circle cx="${cx + s * 0.2}" cy="${cy + s * 0.25}" r="${s * 0.09}" fill="#34d399"/>
            <path d="M${cx} ${cy - s * 0.05} Q${cx - s * 0.1} ${cy - s * 0.15} ${cx - s * 0.05} ${cy - s * 0.22} M${cx} ${cy - s * 0.05} Q${cx + s * 0.1} ${cy - s * 0.15} ${cx + s * 0.05} ${cy - s * 0.22}" stroke="#a7f3d0" stroke-width="${s * 0.04}" fill="none"/>
        `
    },
    'Woodland': {
        slug: 'woodland',
        district: 'gathering',
        color: '#14b8a6',
        draw: (cx, cy, s) => `
            <!-- Tree canopies top-down -->
            <circle cx="${cx - s * 0.2}" cy="${cy - s * 0.18}" r="${s * 0.25}" fill="#0f766e" opacity="0.9"/>
            <circle cx="${cx + s * 0.22}" cy="${cy - s * 0.12}" r="${s * 0.22}" fill="#14b8a6" opacity="0.95"/>
            <circle cx="${cx - s * 0.05}" cy="${cy + s * 0.22}" r="${s * 0.26}" fill="#0d9488" opacity="0.9"/>
            <circle cx="${cx + s * 0.15}" cy="${cy + s * 0.18}" r="${s * 0.18}" fill="#2dd4bf" opacity="0.85"/>
            <circle cx="${cx - s * 0.2}" cy="${cy - s * 0.18}" r="${s * 0.06}" fill="#042f2e"/>
            <circle cx="${cx + s * 0.22}" cy="${cy - s * 0.12}" r="${s * 0.05}" fill="#042f2e"/>
            <circle cx="${cx - s * 0.05}" cy="${cy + s * 0.22}" r="${s * 0.06}" fill="#042f2e"/>
            <!-- Center stump -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.1}" fill="#78350f" stroke="#92400e" stroke-width="${s * 0.03}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.04}" fill="#b45309"/>
        `
    },
    'Mine': {
        slug: 'mine',
        district: 'gathering',
        color: '#64748b',
        draw: (cx, cy, s) => `
            <!-- Rock Quarry & Ore Crystals -->
            <polygon points="${cx - s * 0.35},${cy - s * 0.3} ${cx + s * 0.35},${cy - s * 0.25} ${cx + s * 0.4},${cy + s * 0.3} ${cx - s * 0.3},${cy + s * 0.35}" fill="#334155"/>
            <polygon points="${cx - s * 0.2},${cy - s * 0.15} ${cx + s * 0.2},${cy - s * 0.1} ${cx + s * 0.25},${cy + s * 0.18} ${cx - s * 0.15},${cy + s * 0.2}" fill="#1e293b"/>
            <!-- Crystals / Gems -->
            <polygon points="${cx - s * 0.15},${cy - s * 0.05} ${cx - s * 0.05},${cy - s * 0.25} ${cx + s * 0.02},${cy - s * 0.15} ${cx - s * 0.08},${cy}" fill="#38bdf8"/>
            <polygon points="${cx + s * 0.05},${cy + s * 0.12} ${cx + s * 0.22},${cy} ${cx + s * 0.25},${cy + s * 0.2} ${cx + s * 0.12},${cy + s * 0.22}" fill="#fbbf24"/>
            <!-- Pickaxes -->
            <path d="M${cx - s * 0.25} ${cy + s * 0.25} L${cx + s * 0.25} ${cy - s * 0.25}" stroke="#94a3b8" stroke-width="${s * 0.04}" stroke-linecap="round"/>
            <path d="M${cx + s * 0.18} ${cy - s * 0.28} Q${cx + s * 0.28} ${cy - s * 0.28} ${cx + s * 0.28} ${cy - s * 0.18}" stroke="#e2e8f0" stroke-width="${s * 0.07}" stroke-linecap="round" fill="none"/>
        `
    },
    'Well': {
        slug: 'well',
        district: 'agriculture',
        color: '#0284c7',
        draw: (cx, cy, s) => `
            <!-- Cobblestone round well -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.36}" fill="#475569" stroke="#64748b" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.26}" fill="#0369a1"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.18}" fill="#0284c7"/>
            <circle cx="${cx - s * 0.05}" cy="${cy - s * 0.05}" r="${s * 0.08}" fill="#38bdf8" opacity="0.6"/>
            <!-- Wooden beam and bucket -->
            <rect x="${cx - s * 0.34}" y="${cy - s * 0.05}" width="${s * 0.68}" height="${s * 0.1}" rx="${s * 0.02}" fill="#b45309"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.08}" fill="#78350f" stroke="#d97706" stroke-width="${s * 0.02}"/>
        `
    },
    'Storage Unit': {
        slug: 'storage-unit',
        district: 'utility',
        color: '#eab308',
        draw: (cx, cy, s) => `
            <!-- Storage vault container -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.1}" fill="#854d0e" stroke="#fbbf24" stroke-width="${s * 0.06}"/>
            <rect x="${cx - s * 0.28}" y="${cy - s * 0.28}" width="${s * 0.56}" height="${s * 0.56}" rx="${s * 0.06}" fill="#ca8a04"/>
            <!-- Cross bracing & lock -->
            <line x1="${cx - s * 0.28}" y1="${cy - s * 0.28}" x2="${cx + s * 0.28}" y2="${cy + s * 0.28}" stroke="#eab308" stroke-width="${s * 0.04}"/>
            <line x1="${cx + s * 0.28}" y1="${cy - s * 0.28}" x2="${cx - s * 0.28}" y2="${cy + s * 0.28}" stroke="#eab308" stroke-width="${s * 0.04}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.14}" fill="#1e293b" stroke="#fef08a" stroke-width="${s * 0.03}"/>
            <path d="M${cx - s * 0.05} ${cy - s * 0.03} h${s * 0.1} v${s * 0.08} h-${s * 0.1} Z" fill="#fef08a"/>
        `
    },
    'Crackle Generator': {
        slug: 'crackle-generator',
        district: 'utility',
        color: '#06b6d4',
        draw: (cx, cy, s) => `
            <!-- Turbine generator -->
            <rect x="${cx - s * 0.36}" y="${cy - s * 0.36}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.12}" fill="#164e63" stroke="#22d3ee" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.24}" fill="#0e7490" stroke="#67e8f9" stroke-width="${s * 0.03}"/>
            <!-- Cyan lightning bolt -->
            <polygon points="${cx + s * 0.03},${cy - s * 0.2} ${cx - s * 0.12},${cy + s * 0.02} ${cx - s * 0.01},${cy + s * 0.02} ${cx - s * 0.05},${cy + s * 0.2} ${cx + s * 0.14},${cy - s * 0.02} ${cx + s * 0.02},${cy - s * 0.02}" fill="#a5f3fc" stroke="#0891b2" stroke-width="${s * 0.02}"/>
        `
    },
    'Crackle Power Pole': {
        slug: 'crackle-power-pole',
        district: 'utility',
        color: '#f59e0b',
        draw: (cx, cy, s) => `
            <!-- Power pole tower -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.3}" fill="#78350f" stroke="#d97706" stroke-width="${s * 0.05}"/>
            <line x1="${cx - s * 0.25}" y1="${cy}" x2="${cx + s * 0.25}" y2="${cy}" stroke="#fbbf24" stroke-width="${s * 0.08}" stroke-linecap="round"/>
            <line x1="${cx}" y1="${cy - s * 0.25}" x2="${cx}" y2="${cy + s * 0.25}" stroke="#fbbf24" stroke-width="${s * 0.08}" stroke-linecap="round"/>
            <circle cx="${cx - s * 0.22}" cy="${cy}" r="${s * 0.06}" fill="#fef08a"/>
            <circle cx="${cx + s * 0.22}" cy="${cy}" r="${s * 0.06}" fill="#fef08a"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.08}" fill="#ef4444"/>
        `
    },
    'Blazing Stove': {
        slug: 'blazing-stove',
        district: 'kitchen',
        color: '#f97316',
        draw: (cx, cy, s) => `
            <!-- Stove cooktop -->
            <rect x="${cx - s * 0.4}" y="${cy - s * 0.3}" width="${s * 0.8}" height="${s * 0.6}" rx="${s * 0.08}" fill="#431407" stroke="#ea580c" stroke-width="${s * 0.05}"/>
            <circle cx="${cx - s * 0.18}" cy="${cy}" r="${s * 0.15}" fill="#7c2d12" stroke="#fdba74" stroke-width="${s * 0.03}"/>
            <circle cx="${cx + s * 0.18}" cy="${cy}" r="${s * 0.15}" fill="#7c2d12" stroke="#fdba74" stroke-width="${s * 0.03}"/>
            <!-- Flame glow in burners -->
            <circle cx="${cx - s * 0.18}" cy="${cy}" r="${s * 0.06}" fill="#f97316"/>
            <circle cx="${cx + s * 0.18}" cy="${cy}" r="${s * 0.06}" fill="#f97316"/>
        `
    },
    'Simmering Pot': {
        slug: 'simmering-pot',
        district: 'kitchen',
        color: '#f59e0b',
        draw: (cx, cy, s) => `
            <!-- Simmering pot cauldron -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.36}" fill="#334155" stroke="#94a3b8" stroke-width="${s * 0.05}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.28}" fill="#b45309"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.2}" fill="#d97706"/>
            <path d="M${cx - s * 0.1} ${cy} Q${cx} ${cy - s * 0.1} ${cx + s * 0.1} ${cy}" stroke="#fef3c7" stroke-width="${s * 0.04}" fill="none"/>
        `
    },
    'Claw Game Cooker': {
        slug: 'claw-game-cooker',
        district: 'kitchen',
        color: '#fb7185',
        draw: (cx, cy, s) => `
            <!-- Arcade cooker box -->
            <rect x="${cx - s * 0.36}" y="${cy - s * 0.36}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.1}" fill="#881337" stroke="#fb7185" stroke-width="${s * 0.05}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.22}" fill="#4c0519"/>
            <!-- 3-prong mechanical claw -->
            <line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - s * 0.18}" stroke="#f43f5e" stroke-width="${s * 0.06}"/>
            <path d="M${cx - s * 0.14} ${cy + s * 0.1} Q${cx} ${cy - s * 0.05} ${cx + s * 0.14} ${cy + s * 0.1}" stroke="#fda4af" stroke-width="${s * 0.05}" fill="none"/>
            <circle cx="${cx}" cy="${cy - s * 0.04}" r="${s * 0.05}" fill="#ffffff"/>
        `
    },
    'Bouncy Brew Keg': {
        slug: 'bouncy-brew-keg',
        district: 'kitchen',
        color: '#d97706',
        draw: (cx, cy, s) => `
            <!-- Wooden beer barrel keg -->
            <ellipse cx="${cx}" cy="${cy}" rx="${s * 0.36}" ry="${s * 0.32}" fill="#78350f" stroke="#b45309" stroke-width="${s * 0.05}"/>
            <ellipse cx="${cx}" cy="${cy}" rx="${s * 0.24}" ry="${s * 0.2}" fill="#92400e" stroke="#f59e0b" stroke-width="${s * 0.03}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.07}" fill="#fde68a"/>
        `
    },
    'Pickling Jar': {
        slug: 'pickling-jar',
        district: 'kitchen',
        color: '#84cc16',
        draw: (cx, cy, s) => `
            <!-- Ceramic fermentation jar -->
            <rect x="${cx - s * 0.32}" y="${cy - s * 0.3}" width="${s * 0.64}" height="${s * 0.6}" rx="${s * 0.16}" fill="#3f6212" stroke="#84cc16" stroke-width="${s * 0.05}"/>
            <ellipse cx="${cx}" cy="${cy - s * 0.16}" rx="${s * 0.22}" ry="${s * 0.1}" fill="#65a30d" stroke="#bef264" stroke-width="${s * 0.03}"/>
            <circle cx="${cx}" cy="${cy + s * 0.06}" r="${s * 0.1}" fill="#4d7c0f"/>
        `
    },
    'Jukebox Dryer': {
        slug: 'jukebox-dryer',
        district: 'kitchen',
        color: '#e11d48',
        draw: (cx, cy, s) => `
            <!-- Jukebox drying turntable -->
            <rect x="${cx - s * 0.35}" y="${cy - s * 0.35}" width="${s * 0.7}" height="${s * 0.7}" rx="${s * 0.1}" fill="#4c0519" stroke="#f43f5e" stroke-width="${s * 0.05}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.24}" fill="#0f172a" stroke="#fda4af" stroke-width="${s * 0.03}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.14}" fill="#9f1239"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.05}" fill="#fecdd3"/>
        `
    },
    'Woodworking Bench': {
        slug: 'woodworking-bench',
        district: 'industry',
        color: '#b45309',
        draw: (cx, cy, s) => `
            <!-- Wood workbench & saw -->
            <rect x="${cx - s * 0.4}" y="${cy - s * 0.28}" width="${s * 0.8}" height="${s * 0.56}" rx="${s * 0.06}" fill="#78350f" stroke="#d97706" stroke-width="${s * 0.05}"/>
            <line x1="${cx - s * 0.3}" y1="${cy}" x2="${cx + s * 0.3}" y2="${cy}" stroke="#b45309" stroke-width="${s * 0.08}"/>
            <!-- Hand-saw blade -->
            <polygon points="${cx - s * 0.2},${cy - s * 0.14} ${cx + s * 0.2},${cy - s * 0.08} ${cx + s * 0.2},${cy} ${cx - s * 0.2},${cy}" fill="#94a3b8"/>
        `
    },
    'Crafting Table': {
        slug: 'crafting-table',
        district: 'industry',
        color: '#2563eb',
        draw: (cx, cy, s) => `
            <!-- Anvil & crafting tools -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.1}" fill="#1e3a8a" stroke="#60a5fa" stroke-width="${s * 0.06}"/>
            <rect x="${cx - s * 0.26}" y="${cy - s * 0.15}" width="${s * 0.52}" height="${s * 0.3}" rx="${s * 0.04}" fill="#3b82f6"/>
            <!-- Hammer symbol -->
            <path d="M${cx - s * 0.16} ${cy - s * 0.2} h${s * 0.32} v${s * 0.12} h-${s * 0.32} Z" fill="#93c5fd"/>
            <line x1="${cx}" y1="${cy - s * 0.08}" x2="${cx}" y2="${cy + s * 0.22}" stroke="#dbeafe" stroke-width="${s * 0.06}" stroke-linecap="round"/>
        `
    },
    'Joy Wheel Loom': {
        slug: 'joy-wheel-loom',
        district: 'industry',
        color: '#8b5cf6',
        draw: (cx, cy, s) => `
            <!-- Textile loom -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.1}" fill="#4c1d95" stroke="#a78bfa" stroke-width="${s * 0.06}"/>
            <!-- Weft & warp threads -->
            <line x1="${cx - s * 0.28}" y1="${cy - s * 0.2}" x2="${cx + s * 0.28}" y2="${cy - s * 0.2}" stroke="#c4b5fd" stroke-width="${s * 0.03}"/>
            <line x1="${cx - s * 0.28}" y1="${cy}" x2="${cx + s * 0.28}" y2="${cy}" stroke="#c4b5fd" stroke-width="${s * 0.03}"/>
            <line x1="${cx - s * 0.28}" y1="${cy + s * 0.2}" x2="${cx + s * 0.28}" y2="${cy + s * 0.2}" stroke="#c4b5fd" stroke-width="${s * 0.03}"/>
            <!-- Shuttle spool -->
            <ellipse cx="${cx}" cy="${cy}" rx="${s * 0.22}" ry="${s * 0.08}" fill="#ec4899" stroke="#fbcfe8" stroke-width="${s * 0.03}"/>
        `
    },
    'Carousel Mill': {
        slug: 'carousel-mill',
        district: 'industry',
        color: '#0284c7',
        draw: (cx, cy, s) => `
            <!-- Giant circular millstone & gears -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.4}" fill="#0f172a" stroke="#38bdf8" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.32}" fill="#1e293b"/>
            <!-- 8 Radial mill teeth -->
            <path d="M${cx - s * 0.32} ${cy} h${s * 0.64} M${cx} ${cy - s * 0.32} v${s * 0.64} M${cx - s * 0.22} ${cy - s * 0.22} L${cx + s * 0.22} ${cy + s * 0.22} M${cx - s * 0.22} ${cy + s * 0.22} L${cx + s * 0.22} ${cy - s * 0.22}" stroke="#64748b" stroke-width="${s * 0.03}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.12}" fill="#0ea5e9" stroke="#bae6fd" stroke-width="${s * 0.03}"/>
        `
    },
    'Chimney Kiln': {
        slug: 'chimney-kiln',
        district: 'industry',
        color: '#dc2626',
        draw: (cx, cy, s) => `
            <!-- Brick kiln structure & central chimney flue -->
            <rect x="${cx - s * 0.4}" y="${cy - s * 0.4}" width="${s * 0.8}" height="${s * 0.8}" rx="${s * 0.12}" fill="#7f1d1d" stroke="#f87171" stroke-width="${s * 0.06}"/>
            <rect x="${cx - s * 0.26}" y="${cy - s * 0.26}" width="${s * 0.52}" height="${s * 0.52}" rx="${s * 0.06}" fill="#991b1b"/>
            <!-- Tall center chimney flue & glowing fire -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.2}" fill="#1c1917" stroke="#ea580c" stroke-width="${s * 0.05}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.12}" fill="#f97316"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.06}" fill="#fef08a"/>
        `
    },
    'Aniipod Maker': {
        slug: 'aniipod-maker',
        district: 'industry',
        color: '#6366f1',
        draw: (cx, cy, s) => `
            <!-- High tech spherical capsule maker -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.12}" fill="#312e81" stroke="#818cf8" stroke-width="${s * 0.06}"/>
            <!-- Aniipod capsule sphere -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.24}" fill="#4338ca" stroke="#c7d2fe" stroke-width="${s * 0.04}"/>
            <path d="M${cx - s * 0.24} ${cy} h${s * 0.48}" stroke="#e0e7ff" stroke-width="${s * 0.05}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.08}" fill="#38bdf8" stroke="#ffffff" stroke-width="${s * 0.02}"/>
        `
    },
    'Dance Pad Polisher': {
        slug: 'dance-pad-polisher',
        district: 'industry',
        color: '#ec4899',
        draw: (cx, cy, s) => `
            <!-- 4-quadrant dance arrow mat -->
            <rect x="${cx - s * 0.36}" y="${cy - s * 0.36}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.08}" fill="#831843" stroke="#f472b6" stroke-width="${s * 0.05}"/>
            <!-- Directional arrows -->
            <polygon points="${cx},${cy - s * 0.28} ${cx - s * 0.12},${cy - s * 0.12} ${cx + s * 0.12},${cy - s * 0.12}" fill="#fbcfe8"/>
            <polygon points="${cx},${cy + s * 0.28} ${cx - s * 0.12},${cy + s * 0.12} ${cx + s * 0.12},${cy + s * 0.12}" fill="#fbcfe8"/>
            <polygon points="${cx - s * 0.28},${cy} ${cx - s * 0.12},${cy - s * 0.12} ${cx - s * 0.12},${cy + s * 0.12}" fill="#fbcfe8"/>
            <polygon points="${cx + s * 0.28},${cy} ${cx + s * 0.12},${cy - s * 0.12} ${cx + s * 0.12},${cy + s * 0.12}" fill="#fbcfe8"/>
        `
    },
    'Phonolfactory Table': {
        slug: 'phonolfactory-table',
        district: 'industry',
        color: '#a855f7',
        draw: (cx, cy, s) => `
            <!-- Alchemy perfume table -->
            <rect x="${cx - s * 0.36}" y="${cy - s * 0.36}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.1}" fill="#581c87" stroke="#c084fc" stroke-width="${s * 0.05}"/>
            <circle cx="${cx - s * 0.12}" cy="${cy + s * 0.08}" r="${s * 0.16}" fill="#7e22ce" stroke="#e9d5ff" stroke-width="${s * 0.03}"/>
            <path d="M${cx + s * 0.1} ${cy - s * 0.2} Q${cx + s * 0.22} ${cy} ${cx + s * 0.12} ${cy + s * 0.18}" stroke="#d8b4fe" stroke-width="${s * 0.05}" fill="none"/>
            <circle cx="${cx + s * 0.12}" cy="${cy - s * 0.14}" r="${s * 0.06}" fill="#f472b6"/>
        `
    },
    'Dewy House': {
        slug: 'dewy-house',
        district: 'agriculture',
        color: '#06b6d4',
        draw: (cx, cy, s) => `
            <!-- Water drop glass dome -->
            <circle cx="${cx}" cy="${cy}" r="${s * 0.36}" fill="#155e75" stroke="#67e8f9" stroke-width="${s * 0.05}"/>
            <path d="M${cx} ${cy - s * 0.26} C${cx + s * 0.24} ${cy - s * 0.02} ${cx + s * 0.18} ${cy + s * 0.26} ${cx} ${cy + s * 0.26} C${cx - s * 0.18} ${cy + s * 0.26} ${cx - s * 0.24} ${cy - s * 0.02} ${cx} ${cy - s * 0.26} Z" fill="#22d3ee" opacity="0.8"/>
            <circle cx="${cx - s * 0.08}" cy="${cy - s * 0.05}" r="${s * 0.06}" fill="#ffffff"/>
        `
    },
    'Nimbus Bed': {
        slug: 'nimbus-bed',
        district: 'leisure',
        color: '#38bdf8',
        draw: (cx, cy, s) => `
            <!-- Fluffy cloud mattress -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.12}" fill="#0c4a6e" stroke="#7dd3fc" stroke-width="${s * 0.06}"/>
            <circle cx="${cx - s * 0.16}" cy="${cy}" r="${s * 0.18}" fill="#e0f2fe"/>
            <circle cx="${cx + s * 0.16}" cy="${cy}" r="${s * 0.18}" fill="#e0f2fe"/>
            <circle cx="${cx}" cy="${cy - s * 0.1}" r="${s * 0.2}" fill="#f0f9ff"/>
            <circle cx="${cx}" cy="${cy + s * 0.06}" r="${s * 0.18}" fill="#ffffff"/>
        `
    },
    'Starfall Hammock': {
        slug: 'starfall-hammock',
        district: 'leisure',
        color: '#eab308',
        draw: (cx, cy, s) => `
            <!-- Starfall hammock with star -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.12}" fill="#422006" stroke="#facc15" stroke-width="${s * 0.06}"/>
            <!-- Curved hammock weave -->
            <path d="M${cx - s * 0.3} ${cy - s * 0.2} Q${cx} ${cy + s * 0.25} ${cx + s * 0.3} ${cy - s * 0.2}" stroke="#fde047" stroke-width="${s * 0.07}" fill="none"/>
            <polygon points="${cx},${cy - s * 0.12} ${cx + s * 0.06},${cy + s * 0.05} ${cx + s * 0.22},${cy + s * 0.05} ${cx + s * 0.09},${cy + s * 0.16} ${cx + s * 0.14},${cy + s * 0.3} ${cx},${cy + s * 0.2} ${cx - s * 0.14},${cy + s * 0.3} ${cx - s * 0.09},${cy + s * 0.16} ${cx - s * 0.22},${cy + s * 0.05} ${cx - s * 0.06},${cy + s * 0.05}" fill="#fef08a"/>
        `
    },
    'Tidewhisper Sandcastle': {
        slug: 'tidewhisper-sandcastle',
        district: 'leisure',
        color: '#f59e0b',
        draw: (cx, cy, s) => `
            <!-- Moated Sand bastion -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.12}" fill="#78350f" stroke="#fbbf24" stroke-width="${s * 0.06}"/>
            <rect x="${cx - s * 0.24}" y="${cy - s * 0.24}" width="${s * 0.48}" height="${s * 0.48}" rx="${s * 0.06}" fill="#d97706"/>
            <!-- 4 corner towers -->
            <circle cx="${cx - s * 0.2}" cy="${cy - s * 0.2}" r="${s * 0.09}" fill="#fde68a"/>
            <circle cx="${cx + s * 0.2}" cy="${cy - s * 0.2}" r="${s * 0.09}" fill="#fde68a"/>
            <circle cx="${cx - s * 0.2}" cy="${cy + s * 0.2}" r="${s * 0.09}" fill="#fde68a"/>
            <circle cx="${cx + s * 0.2}" cy="${cy + s * 0.2}" r="${s * 0.09}" fill="#fde68a"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.1}" fill="#f59e0b"/>
        `
    },
    'Floral Windmill': {
        slug: 'floral-windmill',
        district: 'leisure',
        color: '#10b981',
        draw: (cx, cy, s) => `
            <!-- 4-petal floral windmill -->
            <rect x="${cx - s * 0.38}" y="${cy - s * 0.38}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.12}" fill="#064e3b" stroke="#34d399" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.3}" fill="#047857"/>
            <!-- 4 curved petals -->
            <ellipse cx="${cx}" cy="${cy - s * 0.16}" rx="${s * 0.08}" ry="${s * 0.15}" fill="#f43f5e"/>
            <ellipse cx="${cx}" cy="${cy + s * 0.16}" rx="${s * 0.08}" ry="${s * 0.15}" fill="#f43f5e"/>
            <ellipse cx="${cx - s * 0.16}" cy="${cy}" rx="${s * 0.15}" ry="${s * 0.08}" fill="#f43f5e"/>
            <ellipse cx="${cx + s * 0.16}" cy="${cy}" rx="${s * 0.15}" ry="${s * 0.08}" fill="#f43f5e"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.09}" fill="#fef08a"/>
        `
    },
    'Hatchinator': {
        slug: 'hatchinator',
        district: 'leisure',
        color: '#f43f5e',
        draw: (cx, cy, s) => `
            <!-- Egg incubator capsule -->
            <rect x="${cx - s * 0.36}" y="${cy - s * 0.36}" width="${s * 0.72}" height="${s * 0.72}" rx="${s * 0.12}" fill="#881337" stroke="#fb7185" stroke-width="${s * 0.06}"/>
            <ellipse cx="${cx}" cy="${cy}" rx="${s * 0.24}" ry="${s * 0.28}" fill="#fda4af"/>
            <ellipse cx="${cx}" cy="${cy + s * 0.02}" rx="${s * 0.18}" ry="${s * 0.22}" fill="#ffffff"/>
            <circle cx="${cx - s * 0.05}" cy="${cy - s * 0.05}" r="${s * 0.05}" fill="#f43f5e"/>
        `
    },
    'Heat Furnace': {
        slug: 'heat-furnace',
        district: 'agriculture',
        color: '#ef4444',
        draw: (cx, cy, s) => `
            <!-- Thermal radiator -->
            <rect x="${cx - s * 0.35}" y="${cy - s * 0.35}" width="${s * 0.7}" height="${s * 0.7}" rx="${s * 0.1}" fill="#7f1d1d" stroke="#f87171" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.22}" fill="#ea580c"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.12}" fill="#fef08a"/>
        `
    },
    'Cooling Unit': {
        slug: 'cooling-unit',
        district: 'agriculture',
        color: '#06b6d4',
        draw: (cx, cy, s) => `
            <!-- Frost cooling fan -->
            <rect x="${cx - s * 0.35}" y="${cy - s * 0.35}" width="${s * 0.7}" height="${s * 0.7}" rx="${s * 0.1}" fill="#164e63" stroke="#22d3ee" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.22}" fill="#0891b2"/>
            <!-- 6-point snowflake -->
            <line x1="${cx - s * 0.16}" y1="${cy}" x2="${cx + s * 0.16}" y2="${cy}" stroke="#cffafe" stroke-width="${s * 0.04}"/>
            <line x1="${cx}" y1="${cy - s * 0.16}" x2="${cx}" y2="${cy + s * 0.16}" stroke="#cffafe" stroke-width="${s * 0.04}"/>
        `
    },
    'Sunlamp': {
        slug: 'sunlamp',
        district: 'agriculture',
        color: '#eab308',
        draw: (cx, cy, s) => `
            <!-- Solar radiation lamp -->
            <rect x="${cx - s * 0.35}" y="${cy - s * 0.35}" width="${s * 0.7}" height="${s * 0.7}" rx="${s * 0.1}" fill="#713f12" stroke="#fde047" stroke-width="${s * 0.06}"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.2}" fill="#eab308"/>
            <circle cx="${cx}" cy="${cy}" r="${s * 0.1}" fill="#fef08a"/>
        `
    }
};

/**
 * Render Homeland Top-down SVG facility tile.
 * Renders an ultra-crisp vector representation with district tint, inner details,
 * and an optional crop/item production badge.
 *
 * @param {Object} m Facility member { facility, x, y, w, h, crop, jobs, weight, level, mode, closestStorage }
 * @returns {string} SVG markup
 */
export function renderHomelandSvgFacility(m) {
    const name = m.facility ? m.facility.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim() : 'Farmland';
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    const imgUrl = getFacilityIconUrl(name, m.level || 1);

    // Base plate with subtle dark outline
    const basePlate = `
        <rect x="${m.x + 0.04}" y="${m.y + 0.04}" width="${m.w - 0.08}" height="${m.h - 0.08}" rx="0.22"
            fill="#121815" fill-opacity="0.5" stroke="#334155" stroke-opacity="0.35" stroke-width="0.04" class="homeland-facility-base" />
    `;

    // Real in-game building sprite
    const sprite = `
        <image href="${imgUrl}" x="${m.x + 0.05}" y="${m.y + 0.04}" width="${m.w - 0.1}" height="${m.h - 0.08}"
            preserveAspectRatio="xMidYMid meet" class="homeland-building-sprite" onerror="this.style.display='none'" />
    `;

    // Product item/crop badge: enlarged and centered so user clearly sees what each facility makes
    let itemBadge = '';
    const item = m.crop || (m.jobs && m.jobs[0]?.item);
    if (item) {
        const itemUrl = getItemIconUrl(item);
        const isPlot = name === 'Farmland' || name === 'Woodland';
        const cx = m.x + m.w / 2;
        const cy = m.y + m.h / 2;

        if (isPlot) {
            // Farmland & Woodland: large, prominent crop in the exact center of the field
            const cropSize = Math.min(m.w, m.h) * 0.68;
            const halfS = cropSize / 2;
            itemBadge = `
                <g class="homeland-item-badge homeland-plot-crop" pointer-events="none">
                    <circle cx="${cx}" cy="${cy}" r="${halfS * 0.95}" fill="#0f172a" fill-opacity="0.45" stroke="#facc15" stroke-opacity="0.6" stroke-width="0.04" />
                    <image href="${itemUrl}" x="${cx - halfS}" y="${cy - halfS}" width="${cropSize}" height="${cropSize}"
                        preserveAspectRatio="xMidYMid meet" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.85))" onerror="this.style.display='none'"/>
                </g>
            `;
        } else {
            // Production facilities (Kilns, Benches, Mines, Wells, Kitchens...):
            // Enlarged, centered circular product badge with golden accent border
            const badgeR = Math.min(0.85, Math.min(m.w, m.h) * 0.28);
            itemBadge = `
                <g class="homeland-item-badge homeland-facility-product" pointer-events="none">
                    <circle cx="${cx}" cy="${cy}" r="${badgeR}" fill="#0b0f14" fill-opacity="0.88" stroke="#facc15" stroke-width="0.06" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.9))"/>
                    <image href="${itemUrl}" x="${cx - badgeR * 0.78}" y="${cy - badgeR * 0.78}" width="${badgeR * 1.56}" height="${badgeR * 1.56}"
                        preserveAspectRatio="xMidYMid meet" onerror="this.style.display='none'"/>
                </g>
            `;
        }
    }

    return `<g class="homeland-topdown-tile facility-${slug}" data-facility="${name}">
        ${basePlate}
        ${sprite}
        ${itemBadge}
    </g>`;
}

