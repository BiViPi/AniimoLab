import urllib.request
import re
import json

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error {url}: {e}")
        return ""

# 1. Fetch AniimoTools HomeSim script
homesim_js = fetch("https://aniimotools.dev/_astro/HomeSim.astro_astro_type_script_index_0_lang.C0RJ0KFZ.js")
print(f"HomeSim JS len: {len(homesim_js)}")
with open("scratch/homesim.js", "w", encoding="utf-8") as f:
    f.write(homesim_js)

# Look for worker data or aniimo data in homesim.js
matches = re.findall(r'(\b[A-Za-z0-9_]+Ability\b|\bworkers?\b|\baniimo\b)', homesim_js, re.I)
print("Matches in HomeSim:", len(matches))

# 2. Fetch AniimoGuide homeland page script
homeland_guide_js = fetch("https://aniimoguide.com/_next/static/chunks/app/homeland/page-f335df6cd98a3121.js")
print(f"Homeland Guide JS len: {len(homeland_guide_js)}")
with open("scratch/homeland_guide.js", "w", encoding="utf-8") as f:
    f.write(homeland_guide_js)

# 3. Fetch Aniidex full aniimo list payload
# Let's check https://aniidex.com/_nuxt/CO30Vbbo.js or look at how aniidex loads aniimo data
aniidex_entry = fetch("https://aniidex.com/_nuxt/CO30Vbbo.js")
print(f"Aniidex entry len: {len(aniidex_entry)}")
with open("scratch/aniidex_entry.js", "w", encoding="utf-8") as f:
    f.write(aniidex_entry)
