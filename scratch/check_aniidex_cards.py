import re

step212_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md"
with open(step212_path, "r", encoding="utf-8", errors="ignore") as f:
    html = f.read()

# Let's find character cards in html
# Look for <a class="character-card ...
cards = re.findall(r'<a[^>]+class="[^"]*character-card[^"]*"[^>]*>.*?</a>', html, re.DOTALL)
print(f"Found {len(cards)} character cards in step 212 HTML!")

if cards:
    print("Example card 1:")
    print(cards[0][:500])
    if len(cards) > 1:
        print("Example card 2:")
        print(cards[1][:500])
else:
    # Maybe it was client rendered or in a template?
    print("No cards found with regex, searching for character names...")
    # Check for some known aniimo names or vietnamese text
    names = re.findall(r'class="char-name"[^>]*>(.*?)</div>', html)
    print("Found char-name:", len(names), names[:5])
