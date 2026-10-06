import json
import re

with open('web/aniimo-data.js', 'r', encoding='utf-8') as f:
    text = f.read()

aw_text = text[text.find('export const ABILITY_WORKERS'):text.find('export const ABILITIES_TIER_ORDER')]

for m in re.finditer(r'"normal_lv3":\s*(\[.*?\])\s*,\s*"normal_lv2"', aw_text, re.DOTALL):
    arr = json.loads(m.group(1))
    for item in arr:
        if item.get('base_level') != 3:
            print('Anomaly in normal_lv3:', item)

print("Check finished.")
