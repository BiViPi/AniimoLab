import os
import re
import json

# Let's inspect step 212 inline Nuxt payload
step212_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md"
with open(step212_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Find the script containing the Nuxt data
inlines = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
for i, s in enumerate(inlines):
    if "homeAbilities" in s:
        print(f"Inline script {i} has homeAbilities! Length: {len(s)}")
        with open("scratch/nuxt_payload_vi.json", "w", encoding="utf-8") as out:
            out.write(s)

# Also check step 211 (aniimotools) and step 210 (aniimoguide)
step211_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\211\content.md"
with open(step211_path, "r", encoding="utf-8", errors="ignore") as f:
    html211 = f.read()
print("Step 211 (AniimoTools) len:", len(html211))
scripts211 = re.findall(r'<script[^>]*src="([^"]+)"', html211)
print("Step 211 scripts:", scripts211[:10])

# Let's search for worker or aniimo lists in step 210
step210_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\210\content.md"
with open(step210_path, "r", encoding="utf-8", errors="ignore") as f:
    html210 = f.read()
print("Step 210 (AniimoGuide) len:", len(html210))
scripts210 = re.findall(r'<script[^>]*src="([^"]+)"', html210)
print("Step 210 scripts:", scripts210[:10])
