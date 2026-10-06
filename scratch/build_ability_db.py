import re
import json

html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md", encoding='utf-8').read()

cards = re.findall(r'<a href="([^"]+)" class="([^"]*character-card[^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
print(f"Total cards found: {len(cards)}")

# Ability mapping from Vietnamese text or icon to standard English & Vietnamese
ABILITY_MAP = {
    "Hỏa": ("Fire", "Hỏa"),
    "Thủy": ("Water", "Thủy"),
    "Thổ": ("Earth", "Thổ"),
    "Mộc": ("Grass", "Mộc"),
    "Lôi": ("Lightning", "Lôi"),
    "Phong": ("Wind", "Phong"),
    "Ám": ("Dark", "Ám"),
    "Băng": ("Ice", "Băng"),
    "Quang": ("Light", "Quang"),
    "Chế Tác": ("Artisanship", "Chế Tác"),
    "Thủ Công": ("Artisanship", "Chế Tác"),
    "Giải Trí": ("Leisure", "Giải Trí"),
    "Mang Theo": ("Hauling", "Vận Chuyển / Mang Theo"),
    "Vận Chuyển": ("Hauling", "Vận Chuyển"),
    "Điều Hương": ("Perfumery", "Điều Hương"),
    "Hương Thơm": ("Perfumery", "Điều Hương")
}

aniimos = []
for href, class_attr, body in cards:
    is_prismana = "is-prismana" in class_attr
    is_delisted = "is-delisted" in class_attr
    
    # Image
    img_m = re.search(r'src="([^"]+)"', body)
    img_url = img_m.group(1).replace('&amp;', '&') if img_m else ""
    # Extract asset filename like UI_PetHead_10051.webp
    asset_m = re.search(r'(UI_PetHead_\d+\.webp)', img_url)
    pet_head = asset_m.group(1) if asset_m else ""
    
    # Name and number
    name_m = re.search(r'<span class="char-name"[^>]*>\s*([^\s<]+(?:\s+[^\s<]+)*)\s*<span class="char-num"[^>]*>#?(\d+)</span>', body)
    if name_m:
        name = name_m.group(1).strip()
        num = name_m.group(2).strip()
    else:
        name_m2 = re.search(r'<span class="char-name"[^>]*>(.*?)</span>', body)
        name = name_m2.group(1).strip() if name_m2 else href.strip("/").split("/")[-1]
        num = ""

    # Parse abilities from level-pill
    # e.g.: <span class="level-pill" title="Hỏa · cấp làm việc 3" data-v-2f57d508>...<b data-v-2f57d508>3</b></span>
    pills = re.findall(r'<span class="level-pill"[^>]*title="([^"]+)"[^>]*>.*?<b[^>]*>(\d+)</b>\s*</span>', body, re.DOTALL)
    
    abilities = []
    for title, lvl_str in pills:
        # title looks like "Hỏa · cấp làm việc 3" or "Mang Theo · cấp 3" or "Giải Trí · cấp 1"
        base_ability_name = title.split("·")[0].strip()
        lvl = int(lvl_str)
        
        # map to canonical English name
        eng_name = base_ability_name
        vi_name = base_ability_name
        for k, v in ABILITY_MAP.items():
            if k.lower() in base_ability_name.lower():
                eng_name, vi_name = v
                break
                
        abilities.append({
            "ability_en": eng_name,
            "ability_vi": vi_name,
            "base_level": lvl,
            "prismana_level": 4 if is_prismana else lvl
        })

    aniimos.append({
        "number": num,
        "name": name,
        "slug": href,
        "is_prismana": is_prismana,
        "is_delisted": is_delisted,
        "pet_head": pet_head,
        "img_url": f"https://aniidex.com/images/aniimo/{pet_head}" if pet_head else img_url,
        "abilities": abilities
    })

print(f"Successfully processed {len(aniimos)} Aniimo!")
with open("scratch/aniimo_full_db.json", "w", encoding="utf-8") as out:
    json.dump(aniimos, out, ensure_ascii=False, indent=2)

# Analyze by Ability
by_ability = {}
for a in aniimos:
    if a["is_delisted"]:
        continue
    for ab in a["abilities"]:
        eng = ab["ability_en"]
        vi = ab["ability_vi"]
        key = (eng, vi)
        if key not in by_ability:
            by_ability[key] = {
                "prismana_lv4": [],
                "normal_lv3": [],
                "normal_lv2": [],
                "normal_lv1": []
            }
        # If aniimo has prismana, it can reach Lv 4
        if a["is_prismana"]:
            by_ability[key]["prismana_lv4"].append({
                "name": a["name"],
                "base_level": ab["base_level"],
                "pet_head": a["pet_head"],
                "img_url": a["img_url"]
            })
        if ab["base_level"] == 3:
            by_ability[key]["normal_lv3"].append({
                "name": a["name"],
                "is_prismana": a["is_prismana"],
                "pet_head": a["pet_head"],
                "img_url": a["img_url"]
            })
        elif ab["base_level"] == 2:
            by_ability[key]["normal_lv2"].append({
                "name": a["name"],
                "is_prismana": a["is_prismana"],
                "pet_head": a["pet_head"],
                "img_url": a["img_url"]
            })
        elif ab["base_level"] == 1:
            by_ability[key]["normal_lv1"].append({
                "name": a["name"],
                "is_prismana": a["is_prismana"],
                "pet_head": a["pet_head"],
                "img_url": a["img_url"]
            })

report = []
report.append("# BẢNG PHÂN LOẠI NĂNG LỰC GIA VIÊN & ANIIMO\n")
for (eng, vi), workers in sorted(by_ability.items()):
    report.append(f"## {vi} ({eng})")
    
    p_names = [f"**{w['name']}** (gốc Lv{w['base_level']})" for w in workers["prismana_lv4"]]
    report.append(f"- **Ưu tiên số 1 (Prismana Lv.4)**: {', '.join(p_names) if p_names else 'Không có loài Prismana'}")
    
    n3_names = [f"**{w['name']}**" for w in workers["normal_lv3"]]
    report.append(f"- **Đề xuất thay thế (Gốc Lv.3 - không cần Prismana)**: {', '.join(n3_names) if n3_names else 'Không có (xem Lv.2 bên dưới)'}")
    
    if not workers["normal_lv3"] and workers["normal_lv2"]:
        n2_names = [f"{w['name']}" for w in workers["normal_lv2"]]
        report.append(f"- **Dự phòng (Gốc Lv.2)**: {', '.join(n2_names)}")
    report.append("")

with open("scratch/ability_summary.md", "w", encoding="utf-8") as out:
    out.write("\n".join(report))

print("Summary written to scratch/ability_summary.md")
