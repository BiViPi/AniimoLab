import json
import re

# Load parsed aniimos from scratch/aniimo_full_db.json
with open("scratch/aniimo_full_db.json", "r", encoding="utf-8") as f:
    aniimos = json.load(f)

print(f"Loaded {len(aniimos)} aniimos.")

# Let's organize the best workers per ability:
# For each ability, we want:
# 1. Prismana Lv.4 list
# 2. Normal Lv.3 list
# 3. Fallback Lv.2 / Lv.1 list

ability_workers = {}
for a in aniimos:
    if a.get("is_delisted"):
        continue
    for ab in a.get("abilities", []):
        eng = ab["ability_en"]
        if eng not in ability_workers:
            ability_workers[eng] = {
                "prismana_lv4": [],
                "normal_lv3": [],
                "normal_lv2": [],
                "normal_lv1": []
            }
        worker_info = {
            "name": a["name"],
            "number": a["number"],
            "pet_head": a["pet_head"],
            "img_url": a["img_url"],
            "base_level": ab["base_level"],
            "is_prismana": a["is_prismana"]
        }
        if a["is_prismana"]:
            ability_workers[eng]["prismana_lv4"].append(worker_info)
        
        if ab["base_level"] >= 3:
            ability_workers[eng]["normal_lv3"].append(worker_info)
        elif ab["base_level"] == 2:
            ability_workers[eng]["normal_lv2"].append(worker_info)
        else:
            ability_workers[eng]["normal_lv1"].append(worker_info)

# Create JavaScript code for aniimo-data.js
aniimo_data_js = f"""// Aniimo Data & Homeland Ability Recommendations
// Automatically generated from Aniidex & Homeland game files

export const ANIIMO_DB = {json.dumps(aniimos, ensure_ascii=False, indent=2)};

export const ABILITY_WORKERS = {json.dumps(ability_workers, ensure_ascii=False, indent=2)};

// Ability color scheme & icons
export const ABILITY_THEMES = {{
    Fire: {{ color: '#EF4444', icon: '🔥', vi: 'Hỏa', dark: false }},
    Water: {{ color: '#3B82F6', icon: '💧', vi: 'Thủy', dark: false }},
    Earth: {{ color: '#B45309', icon: '⛰️', vi: 'Thổ', dark: false }},
    Grass: {{ color: '#10B981', icon: '🌿', vi: 'Mộc / Thảo', dark: false }},
    Wind: {{ color: '#06B6D4', icon: '💨', vi: 'Phong', dark: false }},
    Dark: {{ color: '#8B5CF6', icon: '🌑', vi: 'Ám', dark: false }},
    Ice: {{ color: '#38BDF8', icon: '❄️', vi: 'Băng', dark: false }},
    Light: {{ color: '#F59E0B', icon: '☀️', vi: 'Quang', dark: true }},
    Lightning: {{ color: '#EAB308', icon: '⚡', vi: 'Lôi', dark: true }},
    Artisanship: {{ color: '#14B8A6', icon: '🔨', vi: 'Chế Tác', dark: false }},
    Leisure: {{ color: '#EC4899', icon: '🎵', vi: 'Giải Trí', dark: false }},
    Hauling: {{ color: '#6366F1', icon: '📦', vi: 'Vận Chuyển', dark: false }},
    Perfumery: {{ color: '#A855F7', icon: '🌸', vi: 'Điều Hương', dark: false }}
}};

/**
 * Get recommended Aniimo for a given ability and level requirement.
 * @param {{string}} ability - Ability name (e.g. 'Fire', 'Water')
 * @param {{number}} minLevel - Minimum level required
 * @param {{boolean}} preferPrismana - Whether to prioritize Lv.4 Prismana
 * @returns {{{{ primary: object, alternatives: object[], ability: string, level: number }}}}
 */
export function getRecommendedWorker(ability, minLevel = 1, preferPrismana = true) {{
    const pool = ABILITY_WORKERS[ability];
    if (!pool) {{
        return null;
    }}

    let primary = null;
    let alternatives = [];

    // If prefer Prismana and pool has Prismana workers
    if (preferPrismana && pool.prismana_lv4.length > 0) {{
        // Pick best Prismana worker (preferably one with highest base level)
        const sortedPrismana = [...pool.prismana_lv4].sort((a, b) => b.base_level - a.base_level);
        primary = sortedPrismana[0];
        // Alternatives are normal Lv.3 workers for users without Prismana
        alternatives = pool.normal_lv3.filter(w => w.name !== primary.name).slice(0, 4);
        if (alternatives.length === 0) {{
            alternatives = pool.normal_lv2.slice(0, 3);
        }}
    }} else {{
        // No Prismana requested or available: pick highest base level worker
        const normalPool = pool.normal_lv3.length > 0 ? pool.normal_lv3 : 
                           (pool.normal_lv2.length > 0 ? pool.normal_lv2 : pool.normal_lv1);
        primary = normalPool[0] || null;
        alternatives = normalPool.slice(1, 4);
    }}

    return {{
        primary,
        alternatives,
        ability,
        level: primary ? (primary.is_prismana && preferPrismana ? 4 : primary.base_level) : minLevel,
        isPrismana: primary ? primary.is_prismana && preferPrismana : false
    }};
}}
"""

with open("web/aniimo-data.js", "w", encoding="utf-8") as f:
    f.write(aniimo_data_js)
print("Successfully generated web/aniimo-data.js")
