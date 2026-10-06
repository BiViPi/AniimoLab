import json
import re

with open('web/aniimo-data.js', 'r', encoding='utf-8') as f:
    text = f.read()

# Extract ANIIMO_DB JSON part
db_match = re.search(r'export const ANIIMO_DB = (\[.*?\]);', text, re.DOTALL)
if db_match:
    db = json.loads(db_match.group(1))
    print(f"Total Aniimo in DB: {len(db)}")
    over_3 = []
    for a in db:
        for ab in a.get('abilities', []):
            if ab.get('base_level', 0) > 3:
                over_3.append((a['number'], a['name'], ab['ability_en'], ab['base_level']))
    print("Base level > 3:", over_3)
