import re

guide_html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\210\content.md", encoding='utf-8').read()
guide_imgs = set(re.findall(r'src="(/images/homeland/[^"]+)"', guide_html))
print("AniimoGuide Homeland Facilities & Items:", len(guide_imgs))
for img in sorted(list(guide_imgs)):
    print("  ", img)

tools_html = open(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\211\content.md", encoding='utf-8').read()
tools_imgs = set(re.findall(r'src="(/assets/[^"]*(?:home|facility|item|crop|recipe)[^"]*)"', tools_html))
print("\nAniimoTools Facilities & Items:", len(tools_imgs))
for img in sorted(list(tools_imgs))[:30]:
    print("  ", img)
