import json

db = json.load(open("scratch/aniimo_full_db.json", encoding="utf-8"))
results = []
for a in db:
    if a['name'].lower() in ['sherro', 'magmarex', 'glacy', 'scorchhowl', 'ignitis', 'thornblade', 'somniwing', 'irisalis']:
        results.append({
            "name": a["name"],
            "number": a.get("number"),
            "is_prismana": a["is_prismana"],
            "abilities": a["abilities"]
        })

with open("scratch/check_special_aniimos.json", "w", encoding="utf-8") as out:
    json.dump(results, out, ensure_ascii=False, indent=2)

print("Wrote results to scratch/check_special_aniimos.json")
