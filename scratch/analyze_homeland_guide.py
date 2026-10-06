import re
import json

with open("scratch/homeland_guide.js", "r", encoding="utf-8") as f:
    text = f.read()

# Search for worker keywords, levels, aniimo names, prismana
print("Homeland guide analysis:")
keywords = ["Scorchhowl", "Somniwing", "Irisalis", "Glacy", "Inferlupa", "Prismana", "prismana", "level 4", "Artisanship", "Leisure", "Perfumery", "Hauling"]
for kw in keywords:
    count = len(re.findall(re.escape(kw), text, re.I))
    print(f"  {kw}: {count}")

# Let's find arrays or objects in homeland_guide.js
# Search for occurrences of Irisalis or Somniwing
for m in re.finditer(r'(.{0,100}(?:Irisalis|Somniwing|Scorchhowl).{0,100})', text):
    print("Match snippet:", m.group(1))
    print("-" * 50)
