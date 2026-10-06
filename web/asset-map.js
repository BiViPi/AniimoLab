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
  "Pickling Jar": "aniimo-pickling-jar-homeland.webp"
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
 * @returns {string}
 */
export function getFacilityIconUrl(facilityName) {
    if (!facilityName) return '';
    let name = facilityName.replace(/\s*\((Electric|Manual|Điện|Thủ công)\)$/i, '').trim();

    const VI_TO_EN = {
        "Đất nông nghiệp": "Farmland",
        "Lâm nghiệp": "Woodland",
        "Mỏ khoáng": "Mine",
        "Giếng nước": "Well",
        "Bếp lửa Blazing": "Blazing Stove",
        "Nồi gắp kẹo": "Claw Game Cooker",
        "Nồi hầm": "Simmering Pot",
        "Thùng ủ lên men": "Bouncy Brew Keg",
        "Cối xay Carousel": "Carousel Mill",
        "Khung dệt bánh xe": "Joy Wheel Loom",
        "Máy sấy Jukebox": "Jukebox Dryer",
        "Bàn chế tạo": "Crafting Table",
        "Bàn mộc": "Woodworking Bench",
        "Lò nung ống khói": "Chimney Kiln",
        "Nhà sương mai": "Dewy House",
        "Giường mây Nimbus": "Nimbus Bed",
        "Lâu đài cát Tidewhisper": "Tidewhisper Sandcastle",
        "Cối xay gió Floral": "Floral Windmill",
        "Võng sao Starfall": "Starfall Hammock",
        "Bàn chà thảm nhảy": "Dance Pad Polisher",
        "Bàn điều hương Phonolfactory": "Phonolfactory Table",
        "Máy làm Aniipod": "Aniipod Maker",
        "Lò sưởi ấm": "Heat Furnace",
        "Thiết bị làm mát": "Cooling Unit",
        "Đèn mặt trời": "Sunlamp",
        "Hũ muối chua": "Pickling Jar"
    };

    if (VI_TO_EN[name]) {
        name = VI_TO_EN[name];
    }

    const file = FACILITY_ICONS[name];
    if (file) return `${CDN_BASE}${file}`;

    // Fallback: slugify facility name
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `${CDN_BASE}aniimo-${slug}-homeland.webp`;
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
export function renderItemIcon(itemName) {
    if (!itemName) return '';
    const url = getItemIconUrl(itemName);
    return `<img class="item-icon-img" src="${url}" alt="${itemName}" loading="lazy" onerror="this.style.display='none'">`;
}
