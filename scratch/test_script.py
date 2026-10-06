import json

with open("scratch/aniimo_full_db.json", "r", encoding="utf-8") as f:
    aniimos = json.load(f)

# Test generating tier sections
print("ANIIMO_DB test OK, loaded:", len(aniimos))
