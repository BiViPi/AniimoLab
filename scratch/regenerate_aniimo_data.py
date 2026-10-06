import json
import re

# Load raw aniimos from scratch
with open("scratch/aniimo_full_db.json", "r", encoding="utf-8") as f:
    raw_aniimos = json.load(f)

# Canonical ability normalization
NORMALIZE_ABILITY = {
    "fire": "Fire",
    "hỏa": "Fire",
    "hoa": "Fire",
    "water": "Water",
    "thủy": "Water",
    "thuy": "Water",
    "earth": "Earth",
    "thổ": "Earth",
    "tho": "Earth",
    "grass": "Grass",
    "mộc": "Grass",
    "moc": "Grass",
    "thảo": "Grass",
    "thao": "Grass",
    "wind": "Wind",
    "phong": "Wind",
    "dark": "Dark",
    "ám": "Dark",
    "am": "Dark",
    "ice": "Ice",
    "băng": "Ice",
    "bang": "Ice",
    "light": "Light",
    "quang": "Light",
    "lightning": "Lightning",
    "lôi": "Lightning",
    "loi": "Lightning",
    "artisanship": "Artisanship",
    "chế tác": "Artisanship",
    "che tac": "Artisanship",
    "kỹ nghệ": "Artisanship",
    "ky nghe": "Artisanship",
    "thủ công": "Artisanship",
    "thu cong": "Artisanship",
    "leisure": "Leisure",
    "giải trí": "Leisure",
    "giai tri": "Leisure",
    "hauling": "Hauling",
    "vận chuyển": "Hauling",
    "van chuyen": "Hauling",
    "mang theo": "Hauling",
    "perfumery": "Perfumery",
    "điều hương": "Perfumery",
    "dieu huong": "Perfumery"
}

VI_ABILITY_NAMES = {
    "Fire": "Hỏa",
    "Water": "Thủy",
    "Earth": "Thổ",
    "Grass": "Mộc / Thảo",
    "Wind": "Phong",
    "Dark": "Ám",
    "Ice": "Băng",
    "Light": "Quang",
    "Lightning": "Lôi",
    "Artisanship": "Chế Tác / Kỹ Nghệ",
    "Leisure": "Giải Trí",
    "Hauling": "Vận Chuyển",
    "Perfumery": "Điều Hương"
}

# Normalize all abilities in raw_aniimos
aniimos = []
for a in raw_aniimos:
    norm_abs = []
    for ab in a.get("abilities", []):
        raw_en = ab.get("ability_en", "").lower().strip()
        raw_vi = ab.get("ability_vi", "").lower().strip()
        
        canon = NORMALIZE_ABILITY.get(raw_en) or NORMALIZE_ABILITY.get(raw_vi)
        if not canon:
            for k, target in NORMALIZE_ABILITY.items():
                if k in raw_en or k in raw_vi:
                    canon = target
                    break
        if not canon:
            canon = ab.get("ability_en")
            
        norm_abs.append({
            "ability_en": canon,
            "ability_vi": VI_ABILITY_NAMES.get(canon, canon),
            "base_level": ab["base_level"],
            "prismana_level": 4 if a["is_prismana"] else ab["base_level"]
        })
    
    a_copy = dict(a)
    a_copy["abilities"] = norm_abs
    aniimos.append(a_copy)

# Build ABILITY_WORKERS
ability_workers = {}
for a in aniimos:
    if a.get("is_delisted"):
        continue
    for ab in a["abilities"]:
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

# Specific curated priority orders for Prismana Lv.4 to guarantee user-requested stars are prominent
# Water: Glacy, Sherro, Panpanta
if "Water" in ability_workers:
    names_order = ["Glacy", "Sherro", "Panpanta"]
    ability_workers["Water"]["prismana_lv4"].sort(key=lambda w: names_order.index(w["name"]) if w["name"] in names_order else 99)

# Fire: Scorchhowl, Magmarex, Infergon
if "Fire" in ability_workers:
    names_order = ["Scorchhowl", "Magmarex", "Infergon"]
    ability_workers["Fire"]["prismana_lv4"].sort(key=lambda w: names_order.index(w["name"]) if w["name"] in names_order else 99)

# Artisanship: Ignitis, Thornblade, Blazen, Luminelle
if "Artisanship" in ability_workers:
    names_order = ["Ignitis", "Thornblade", "Blazen", "Luminelle", "Melloblum"]
    ability_workers["Artisanship"]["prismana_lv4"].sort(key=lambda w: names_order.index(w["name"]) if w["name"] in names_order else 99)

# Grass: Somniwing, Irisalis, Irisal, Thornblade
if "Grass" in ability_workers:
    names_order = ["Somniwing", "Irisalis", "Irisal", "Thornblade"]
    ability_workers["Grass"]["prismana_lv4"].sort(key=lambda w: names_order.index(w["name"]) if w["name"] in names_order else 99)

# Earth: Waleetle, Grizbo, Magmarex
if "Earth" in ability_workers:
    names_order = ["Waleetle", "Grizbo", "Magmarex"]
    ability_workers["Earth"]["prismana_lv4"].sort(key=lambda w: names_order.index(w["name"]) if w["name"] in names_order else 99)

print("Ability keys mapped:")
for k in sorted(ability_workers.keys()):
    p_cnt = len(ability_workers[k]["prismana_lv4"])
    n3_cnt = len(ability_workers[k]["normal_lv3"])
    print(f"  {k}: {p_cnt} prismana Lv4, {n3_cnt} normal Lv3")

# Create JavaScript code
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
    Artisanship: {{ color: '#14B8A6', icon: '🔨', vi: 'Chế Tác / Kỹ Nghệ', dark: false }},
    Leisure: {{ color: '#EC4899', icon: '🎵', vi: 'Giải Trí', dark: false }},
    Hauling: {{ color: '#6366F1', icon: '📦', vi: 'Vận Chuyển', dark: false }},
    Perfumery: {{ color: '#A855F7', icon: '🌸', vi: 'Điều Hương', dark: false }}
}};

/**
 * Get recommended Aniimo for a given ability and level requirement.
 * @param {{string}} ability - Ability name (e.g. 'Fire', 'Water', 'Artisanship')
 * @param {{number}} minLevel - Minimum level required
 * @param {{boolean}} preferPrismana - Whether to prioritize Lv.4 Prismana
 * @returns {{{{ primary: object, alternatives: object[], ability: string, level: number, isPrismana: boolean }}}}
 */
export function getRecommendedWorker(ability, minLevel = 1, preferPrismana = true) {{
    const pool = ABILITY_WORKERS[ability];
    if (!pool) {{
        return null;
    }}

    let primary = null;
    let alternatives = [];

    // If target level is 4 or prefer Prismana, look at Prismana pool first
    if ((minLevel >= 4 || preferPrismana) && pool.prismana_lv4.length > 0) {{
        primary = pool.prismana_lv4[0];
        // Other Prismana as co-recommendations, plus normal Lv.3 workers
        const coPrismana = pool.prismana_lv4.slice(1, 3);
        const norm3 = pool.normal_lv3.filter(w => w.name !== primary.name).slice(0, 3);
        alternatives = [...coPrismana, ...norm3];
        return {{
            primary,
            alternatives,
            ability,
            level: 4,
            isPrismana: true
        }};
    }}

    // Otherwise find worker matching minLevel
    if (minLevel === 3) {{
        primary = pool.normal_lv3[0] || (pool.prismana_lv4[0] || null);
        alternatives = pool.normal_lv3.slice(1, 4);
    }} else if (minLevel === 2) {{
        primary = pool.normal_lv2[0] || pool.normal_lv3[0] || null;
        alternatives = pool.normal_lv2.slice(1, 4);
    }} else {{
        primary = pool.normal_lv1[0] || pool.normal_lv2[0] || pool.normal_lv3[0] || null;
        alternatives = pool.normal_lv1.slice(1, 4);
    }}

    return {{
        primary,
        alternatives,
        ability,
        level: primary ? primary.base_level : minLevel,
        isPrismana: primary ? primary.is_prismana && minLevel >= 4 : false
    }};
}}

/**
 * Get specific worker for exact level (1, 2, 3, 4) in roster preview.
 * @param {{string}} ability
 * @param {{number}} level
 * @returns {{object|null}}
 */
export function getWorkerForLevel(ability, level) {{
    const pool = ABILITY_WORKERS[ability];
    if (!pool) return null;
    if (level >= 4) {{
        return pool.prismana_lv4[0] || pool.normal_lv3[0] || null;
    }}
    if (level === 3) {{
        return pool.normal_lv3[0] || pool.prismana_lv4[0] || null;
    }}
    if (level === 2) {{
        return pool.normal_lv2[0] || pool.normal_lv3[0] || null;
    }}
    return pool.normal_lv1[0] || pool.normal_lv2[0] || pool.normal_lv3[0] || null;
}}

/**
 * Render an individual Aniimo worker avatar card with badge and rich tooltip.
 * @param {{string}} ability - Ability name
 * @param {{number}} level - Work level
 * @param {{string}} note - Optional bonus note (e.g. personality bonus)
 * @param {{boolean}} compact - Compact mode for multi-worker tasks
 * @returns {{string}} HTML markup
 */
export function renderAniimoWorkerCard(ability, level, note = '', compact = false) {{
    const rec = getRecommendedWorker(ability, level, level >= 4);
    const theme = ABILITY_THEMES[ability] || {{ color: '#888888', icon: '🐾', vi: ability }};
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    const abilityDisplay = isVi ? theme.vi : ability;

    if (!rec || !rec.primary) {{
        return `<span class="ability-dot" style="--ability:${{theme.color}}">${{level}}</span>`;
    }}

    const worker = rec.primary;
    const isPrismana = rec.isPrismana;
    const workerLevel = isPrismana ? 4 : level;
    
    // Construct rich tooltip
    const altsText = rec.alternatives.length > 0
        ? (isVi ? `Đề xuất khác / thay thế: ${{rec.alternatives.map(a => a.name + (a.is_prismana ? ' (Prismana Lv.4)' : ` (Lv.${{a.base_level}})`)).join(', ')}}` 
                : `Other options / alternatives: ${{rec.alternatives.map(a => a.name + (a.is_prismana ? ' (Prismana Lv.4)' : ` (Lv.${{a.base_level}})`)).join(', ')}}`)
        : '';
    
    const tipTitle = `${{worker.name}} · ${{abilityDisplay}} Lv.${{workerLevel}}${{isPrismana ? ' (Prismana)' : ''}}`;
    const tipBody = [
        tipTitle,
        note ? `• ${{note}}` : '',
        altsText ? `• ${{altsText}}` : ''
    ].filter(Boolean).join('\\n');

    const cardClass = `aniimo-worker-card ${{compact ? 'compact' : ''}} ${{isPrismana ? 'is-prismana' : ''}}`;

    return `
        <div class="${{cardClass}}" style="--ability-color:${{theme.color}}" title="${{tipBody}}" aria-label="${{tipTitle}}">
            <div class="aniimo-avatar-wrap">
                <img class="aniimo-avatar-img" src="${{worker.img_url}}" alt="${{worker.name}}" loading="lazy" onerror="this.src='https://aniimoguide.com/images/aniimo/head_round/${{worker.number || '10011'}}.webp'">
                <span class="aniimo-level-badge ${{isPrismana ? 'prismana-badge' : ''}}">${{workerLevel}}</span>
            </div>
            ${{!compact ? `<span class="aniimo-worker-name">${{worker.name}}</span>` : ''}}
        </div>
    `;
}}

/**
 * Render a cluster of Aniimo workers (for multi-task facilities like Farmland).
 * @param {{Array<{{ability: string, level: number, personality_bonus?: boolean}}>}} tasks
 * @param {{string}} facilityName
 * @returns {{string}} HTML markup
 */
export function renderAniimoTasksCluster(tasks, facilityName) {{
    if (!tasks || tasks.length === 0) return '-';
    const isVi = window.i18n && window.i18n.getLang() === 'vi';
    
    const items = tasks.map(task => {{
        let note = '';
        if (task.personality_bonus) {{
            note = isVi ? 'Tính cách tương thích (+20% tốc độ)' : 'Matching personality (+20% speed)';
        }}
        return renderAniimoWorkerCard(task.ability, task.level, note, true);
    }});

    return `<div class="aniimo-cluster">${{items.join('')}}</div>`;
}}

/**
 * Render a compact avatar badge for the Roster/Team display.
 * @param {{string}} ability
 * @param {{number}} level
 * @param {{number}} count
 * @param {{string}} tip
 * @param {{boolean}} bonus
 * @returns {{string}}
 */
export function renderRosterWorkerBadge(ability, level, count = 1, tip = '', bonus = false) {{
    const numLevel = typeof level === 'number' ? level : (parseInt(level, 10) || 3);
    const rec = getRecommendedWorker(ability, numLevel, numLevel >= 4);
    const theme = ABILITY_THEMES[ability] || {{ color: '#888888', icon: '🐾', vi: ability }};
    
    const worker = rec ? rec.primary : null;
    const isPrismana = rec ? rec.isPrismana : (numLevel >= 4);
    const times = count > 1 ? `<span class="ability-times">×${{count}}</span>` : '';
    
    if (!worker) {{
        return `<span class="ability-kind"><span class="ability-dot small${{bonus ? ' bonus' : ''}}" style="--ability:${{theme.color}}" title="${{tip}}">${{level}}</span>${{times}}</span>`;
    }}

    const fullTip = tip ? `${{worker.name}} (${{theme.vi}} Lv.${{isPrismana ? 4 : numLevel}})${{bonus ? ' (+20% tốc độ)' : ''}} · ${{tip}}` : `${{worker.name}} · ${{theme.vi}} Lv.${{isPrismana ? 4 : numLevel}}`;

    return `
        <span class="roster-worker-item ${{isPrismana ? 'is-prismana' : ''}}" style="--ability-color:${{theme.color}}" title="${{fullTip}}">
            <span class="roster-avatar-wrap">
                <img class="roster-avatar-img" src="${{worker.img_url}}" alt="${{worker.name}}" loading="lazy" onerror="this.src='https://aniimoguide.com/images/aniimo/head_round/${{worker.number || '10011'}}.webp'">
                <span class="roster-level-badge ${{isPrismana ? 'prismana-badge' : ''}}">${{level}}</span>
            </span>
            ${{times}}
        </span>
    `;
}}
"""

with open("web/aniimo-data.js", "w", encoding="utf-8") as f:
    f.write(aniimo_data_js)

print("Successfully regenerated web/aniimo-data.js with complete ability mapping!")
