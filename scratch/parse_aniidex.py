import re
import json

step212_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md"
with open(step212_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Let's inspect the inline JSON translations for Vietnamese names and home abilities
# In inline script 5:
# names: {"1001100": "...", ...}
# homeAbilities: {"1": "...", ...}
inlines = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
translation_script = None
for s in inlines:
    if "homeAbilities" in s and "names" in s:
        translation_script = s
        break

# Parse character cards
cards = re.findall(r'<a href="([^"]+)" class="([^"]*character-card[^"]*)"[^>]*>(.*?)</a>', html, re.DOTALL)
print(f"Total parsed cards: {len(cards)}")

aniimos = []
for href, class_attr, body in cards:
    is_prismana = "is-prismana" in class_attr
    is_delisted = "is-delisted" in class_attr
    
    # Image URL
    img_match = re.search(r'src="([^"]+)"', body)
    img_url = img_match.group(1) if img_match else ""
    
    # Aniimo Number & Name
    num_match = re.search(r'<span class="char-num"[^>]*>#?(\d+)</span>', body)
    number = num_match.group(1) if num_match else ""
    
    # Name text inside char-name
    # <div class="char-name" data-v-2f57d508><span class="char-num" ...>...</span>Tên Aniimo</div>
    name_match = re.search(r'<div class="char-name"[^>]*>(?:<span[^>]*>.*?</span>)?\s*([^<]+)</div>', body)
    name = name_match.group(1).strip() if name_match else ""
    
    # Element & Role
    # Check level pills for home abilities
    # Each level pill:
    # <span class="level-pill" data-v-2f57d508><span class="level-pill__disc" ...><svg ... or img title="..."/></span><b>Level</b></span>
    # Let's inspect how abilities are shown in level-pill
    pills = re.findall(r'<span class="level-pill"[^>]*>(.*?)</span>\s*</span>', body, re.DOTALL)
    # If not matching that, let's grab everything inside level-pills
    level_pills_div = re.search(r'<div class="level-pills"[^>]*>(.*?)</div>', body, re.DOTALL)
    abilities = []
    if level_pills_div:
        pill_items = re.findall(r'<span class="level-pill"[^>]*>(.*?)</b></span>', level_pills_div.group(1), re.DOTALL)
        for p in pill_items:
            # find level number
            lvl_match = re.search(r'<b>(\d+)</b>', p)
            lvl = int(lvl_match.group(1)) if lvl_match else 0
            
            # find ability name or glyph or title or aria-label
            title_match = re.search(r'title="([^"]+)"', p) or re.search(r'aria-label="([^"]+)"', p) or re.search(r'alt="([^"]+)"', p)
            # check style or class or svg
            glyph_match = re.search(r'--glyph:\s*url\(/images/([^"]+)\)', p) or re.search(r'/images/([^"]+)\.webp', p)
            ability_name = title_match.group(1) if title_match else (glyph_match.group(1) if glyph_match else "unknown")
            abilities.append({"ability": ability_name, "level": lvl, "raw": p})

    aniimos.append({
        "slug": href,
        "name": name,
        "number": number,
        "is_prismana": is_prismana,
        "is_delisted": is_delisted,
        "img_url": img_url,
        "abilities": abilities
    })

print(f"Sample Aniimo parsed: {aniimos[0]['name']}")
print(f"Abilities for {aniimos[0]['name']}: {aniimos[0]['abilities']}")

# Save parsed aniimos to json
with open("scratch/parsed_aniimos.json", "w", encoding="utf-8") as f:
    json.dump(aniimos, f, ensure_ascii=False, indent=2)

print(f"Saved {len(aniimos)} aniimos to scratch/parsed_aniimos.json")
