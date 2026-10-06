import json
import re

# Facility to icon mapping
# Base CDN: https://aniimoguide.com/images/homeland/
FACILITY_ICONS = {
    "Farmland": "aniimo-farmland-lv1-3-homeland.webp",
    "Woodland": "aniimo-woodland-lv1-2-homeland.webp",
    "Mine": "aniimo-mine-lv1-3-homeland.webp",
    "Well": "aniimo-well-homeland.webp",
    "Blazing Stove": "aniimo-stove-homeland.webp",
    "Claw Game Cooker": "aniimo-claw-game-cooker-homeland.webp",
    "Simmering Pot": "aniimo-simmering-pot-homeland.webp",
    "Bouncy Brew Keg": "aniimo-bouncy-brew-keg-homeland.webp",
    "Carousel Mill": "aniimo-carousel-mill-homeland.webp",
    "Joy Wheel Loom": "aniimo-joy-wheel-loom-homeland.webp",
    "Jukebox Dryer": "aniimo-jukebox-dryer-homeland.webp",
    "Crafting Table": "aniimo-crafting-table-homeland.webp",
    "Woodworking Bench": "aniimo-woodworking-bench-homeland.webp",
    "Chimney Kiln": "aniimo-chimney-kiln-homeland.webp",
    "Dewy House": "aniimo-dewy-house-homeland.webp",
    "Nimbus Bed": "aniimo-nimbus-bed-homeland.webp",
    "Tidewhisper Sandcastle": "aniimo-tidewhisper-sandcastle-homeland.webp",
    "Floral Windmill": "aniimo-floral-windmill-homeland.webp",
    "Starfall Hammock": "aniimo-starfall-hammock-homeland.webp",
    "Dance Pad Polisher": "aniimo-dance-pad-polisher-homeland.webp",
    "Phonolfactory Table": "aniimo-phonolfactory-table-homeland.webp",
    "Aniipod Maker": "aniimo-aniipod-maker-homeland.webp",
    "Heat Furnace": "aniimo-heat-furnace-homeland.webp",
    "Cooling Unit": "aniimo-cooling-unit-homeland.webp",
    "Sunlamp": "aniimo-sunlamp-homeland.webp",
    "Pickling Jar": "aniimo-pickling-jar-homeland.webp"
}

# Scan available images in AniimoGuide to map item names directly
guide_html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\210\content.md", encoding='utf-8').read()
all_guide_imgs = set(re.findall(r'/images/homeland/aniimo-([a-z0-9-]+)-homeland\.webp', guide_html))

print(f"Total item slugs found in AniimoGuide: {len(all_guide_imgs)}")

# Generate JS module
asset_map_js = f"""// Facility and Item Asset Map
// Maps game facilities and items to clean WebP icon paths

const CDN_BASE = 'https://aniimoguide.com/images/homeland/';

export const FACILITY_ICONS = {json.dumps(FACILITY_ICONS, ensure_ascii=False, indent=2)};

const KNOWN_SLUGS = new Set({json.dumps(sorted(list(all_guide_imgs)))});

/**
 * Convert snake_case or English item name to asset slug.
 * e.g. "copper_ore" -> "copper-ore"
 * "sintered_brick" -> "sintered-ore-brick"
 */
export function itemToSlug(itemName) {{
    if (!itemName) return '';
    let slug = itemName.toLowerCase().trim().replace(/_/g, '-').replace(/\\s+/g, '-');
    
    // Common aliases in AniimoGuide
    const ALIASES = {{
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
        'quick-fragrant-jelly': 'fragrant-jelly',
        'quick-sea-salt': 'sea-salt',
        'quick-lambswool': 'lambswool',
        'quick-scales': 'scales',
        'quick-aromathyst': 'aromathyst'
    }};

    if (ALIASES[slug]) return ALIASES[slug];
    if (KNOWN_SLUGS.has(slug)) return slug;
    
    // Try removing quick- prefix
    if (slug.startsWith('quick-')) {{
        const base = slug.replace(/^quick-/, '');
        if (ALIASES[base]) return ALIASES[base];
        if (KNOWN_SLUGS.has(base)) return base;
    }}

    return slug;
}}

/**
 * Get facility icon URL.
 * @param {{string}} facilityName
 * @returns {{string}}
 */
export function getFacilityIconUrl(facilityName) {{
    const file = FACILITY_ICONS[facilityName];
    if (file) return `${{CDN_BASE}}${{file}}`;
    // Fallback: slugify facility name
    const slug = facilityName.toLowerCase().replace(/\\s+/g, '-');
    return `${{CDN_BASE}}aniimo-${{slug}}-homeland.webp`;
}}

/**
 * Get item icon URL.
 * @param {{string}} itemName
 * @returns {{string}}
 */
export function getItemIconUrl(itemName) {{
    const slug = itemToSlug(itemName);
    return `${{CDN_BASE}}aniimo-${{slug}}-homeland.webp`;
}}

/**
 * Render facility icon HTML tag.
 * @param {{string}} facilityName
 * @returns {{string}}
 */
export function renderFacilityIcon(facilityName) {{
    const url = getFacilityIconUrl(facilityName);
    return `<img class="facility-icon-img" src="${{url}}" alt="${{facilityName}}" loading="lazy" onerror="this.style.display='none'">`;
}}

/**
 * Render item icon HTML tag.
 * @param {{string}} itemName
 * @returns {{string}}
 */
export function renderItemIcon(itemName) {{
    if (!itemName) return '';
    const url = getItemIconUrl(itemName);
    return `<img class="item-icon-img" src="${{url}}" alt="${{itemName}}" loading="lazy" onerror="this.style.display='none'">`;
}}
"""

with open("web/asset-map.js", "w", encoding="utf-8") as f:
    f.write(asset_map_js)
print("Successfully generated web/asset-map.js")
