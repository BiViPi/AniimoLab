import json

with open("scratch/aniimo_full_db.json", "r", encoding="utf-8") as f:
    aniimos = json.load(f)

print(f"Total aniimos: {len(aniimos)}")

# 13 Abilities
ABILITIES_ORDER = [
    ('Fire', 'Hỏa', '🔥', '#EF4444'),
    ('Water', 'Thủy', '💧', '#3B82F6'),
    ('Earth', 'Thổ', '⛰️', '#B45309'),
    ('Grass', 'Mộc / Thảo', '🌿', '#10B981'),
    ('Lightning', 'Lôi', '⚡', '#EAB308'),
    ('Ice', 'Băng', '❄️', '#06B6D4'),
    ('Wind', 'Phong', '🌪️', '#14B8A6'),
    ('Dark', 'Ám', '🔮', '#8B5CF6'),
    ('Light', 'Quang', '☀️', '#F59E0B'),
    ('Hauling', 'Vận chuyển', '📦', '#6366F1'),
    ('Artisanship', 'Chế tác / Kỹ nghệ', '🛠️', '#22C55E'),
    ('Leisure', 'Giải trí', '🎭', '#EC4899'),
    ('Perfumery', 'Điều hương', '🌸', '#A855F7')
]

# For each ability, build Tier SS (Prismana Lv.4) and Tier S (Normal Lv.3)
# Strictly exclude any Aniimo with level 1 or 2!
tier_data = {}

for eng, vi, icon, color in ABILITIES_ORDER:
    tier_ss = []
    tier_s = []
    
    for a in aniimos:
        if a.get("is_delisted"):
            continue
        # Find if this aniimo has this ability
        match_ab = None
        for ab in a.get("abilities", []):
            if ab["ability_en"] == eng:
                match_ab = ab
                break
        if not match_ab:
            continue
            
        base_lvl = match_ab["base_level"]
        is_prism = a.get("is_prismana", False)
        
        # Build extra abilities description
        other_abs = [f"{x['ability_vi']} {4 if is_prism else x['base_level']}" for x in a.get("abilities", []) if x['ability_en'] != eng]
        extra_str = ", ".join(other_abs)
        
        info = {
            "name": a["name"],
            "number": a.get("number", ""),
            "img_url": a.get("img_url", ""),
            "base_level": base_lvl,
            "is_prismana": is_prism,
            "extra_str": extra_str
        }
        
        # Tier SS: Must be Prismana and (base_level >= 2) -> in Homeland Prismana reaches Lv.4
        if is_prism and base_lvl >= 2:
            tier_ss.append(info)
            
        # Tier S: Normal Aniimos with base_level >= 3, or basic forms of Prismana with base_level >= 3
        if base_lvl >= 3:
            tier_s.append(info)
            
    # Sort tier_ss by base_level desc, then number
    tier_ss.sort(key=lambda x: (-x["base_level"], x["number"]))
    # Sort tier_s by base_level desc, then number
    tier_s.sort(key=lambda x: (-x["base_level"], x["number"]))
    
    tier_data[eng] = {
        "vi": vi,
        "icon": icon,
        "color": color,
        "tier_ss": tier_ss,
        "tier_s": tier_s
    }

print("Sample Fire:")
print("SS:", [x["name"] for x in tier_data["Fire"]["tier_ss"]])
print("S:", [x["name"] for x in tier_data["Fire"]["tier_s"]])

print("Sample Water:")
print("SS:", [x["name"] for x in tier_data["Water"]["tier_ss"]])
print("S:", [x["name"] for x in tier_data["Water"]["tier_s"]])

print("Sample Artisanship:")
print("SS:", [x["name"] for x in tier_data["Artisanship"]["tier_ss"]])
print("S:", [x["name"] for x in tier_data["Artisanship"]["tier_s"]])
