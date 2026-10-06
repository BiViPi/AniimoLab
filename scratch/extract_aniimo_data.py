import os
import re
import json
import urllib.request
import urllib.parse

def fetch_url(url, headers=None):
    if headers is None:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching {url}: {e}")
        return ""

print("Checking Aniidex Nuxt scripts...")
step212_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.system_generated\steps\212\content.md"
if os.path.exists(step212_path):
    with open(step212_path, "r", encoding="utf-8", errors="ignore") as f:
        html = f.read()
    print("Step 212 content length:", len(html))
    scripts = re.findall(r'<script[^>]*src="([^"]+)"', html)
    print("Found scripts:", scripts[:10])
    
    inlines = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
    print("Found inline scripts:", len(inlines))
    for s in inlines:
        if "aniimo" in s.lower() or "prismana" in s.lower() or "__NUXT__" in s:
            print("Inline match len:", len(s))
            print(s[:300])

for p in ["https://aniidex.com/_payload.json", "https://aniidex.com/vi/aniimo/_payload.json", "https://aniidex.com/api/aniimo", "https://aniidex.com/data/aniimo.json"]:
    res = fetch_url(p)
    if res and len(res) > 100:
        print(f"Found data at {p}! Length: {len(res)}")
        try:
            js = json.loads(res)
            print("Keys:", list(js.keys()) if isinstance(js, dict) else len(js))
        except:
            print("Not JSON directly, first 200 chars:", res[:200])
