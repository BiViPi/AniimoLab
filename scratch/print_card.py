import re

html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md", encoding='utf-8').read()
m = re.findall(r'<a [^>]*class="[^"]*character-card[^"]*"[^>]*>.*?</a>', html, re.DOTALL)
if m:
    with open("scratch/card_sample.html", "w", encoding="utf-8") as out:
        for i in range(min(5, len(m))):
            out.write(f"<!-- CARD {i} -->\n" + m[i] + "\n\n")
    print(f"Wrote {min(5, len(m))} cards to scratch/card_sample.html")
else:
    print("Not found")
