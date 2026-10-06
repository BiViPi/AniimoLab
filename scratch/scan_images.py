import re
import json

# Check images in AniimoGuide (step 210)
guide_html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\210\content.md", encoding='utf-8').read()
guide_imgs = set(re.findall(r'src="([^"]*(?:homeland|aniimo)[^"]*\.webp)"', guide_html))
print("AniimoGuide Homeland images found:", len(guide_imgs))
for img in sorted(list(guide_imgs))[:20]:
    print("  Guide:", img)

# Check images in AniimoTools (step 211)
tools_html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\211\content.md", encoding='utf-8').read()
tools_imgs = set(re.findall(r'src="([^"]*(?:assets|images|home|item|aniimo)[^"]*\.(?:webp|png))"', tools_html))
print("\nAniimoTools images found:", len(tools_imgs))
for img in sorted(list(tools_imgs))[:20]:
    print("  Tools:", img)

# Let's check Aniiland (the source mentioned in AniimoGuide: https://aniiland.wintira.win/ or github Phantom512-ui/aniiland)
