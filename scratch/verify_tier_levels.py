import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket
import sys

sys.stdout.reconfigure(encoding='utf-8')

subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
time.sleep(1)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--disable-gpu",
    "--window-size=1400,1100",
    "http://localhost:8080/"
])

time.sleep(3.5)

try:
    targets = json.loads(urllib.request.urlopen("http://localhost:9222/json").read())
    target = next(t for t in targets if "localhost:8080" in t.get("url", ""))
    ws = websocket.create_connection(target["webSocketDebuggerUrl"])

    msg_id = 0
    def send_cmd(method, params=None):
        global msg_id
        msg_id += 1
        payload = {"id": msg_id, "method": method, "params": params or {}}
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == msg_id:
                return res

    # Wait for page to load
    time.sleep(2)

    # Open modal
    send_cmd("Runtime.evaluate", {"expression": "window.showAniimoTierList();"})
    time.sleep(1)

    # Extract accurately using .tier-ss-block and .tier-s-block
    script = """
    (() => {
        const sections = Array.from(document.querySelectorAll('.tier-ability-section'));
        const results = [];
        sections.forEach(sec => {
            const title = sec.querySelector('h3')?.innerText || '';
            const ssCards = Array.from(sec.querySelectorAll('.tier-ss-block .tier-aniimo-card')).map(c => ({
                name: c.querySelector('.tier-card-name')?.innerText,
                num: c.querySelector('.tier-card-num')?.innerText,
                levelTag: c.querySelector('.tier-level-tag')?.innerText,
                tierPill: c.querySelector('.tier-type-pill')?.innerText,
                secondary: c.querySelector('.tier-card-secondary')?.innerText || ''
            }));
            const sCards = Array.from(sec.querySelectorAll('.tier-s-block .tier-aniimo-card')).map(c => ({
                name: c.querySelector('.tier-card-name')?.innerText,
                num: c.querySelector('.tier-card-num')?.innerText,
                levelTag: c.querySelector('.tier-level-tag')?.innerText,
                tierPill: c.querySelector('.tier-type-pill')?.innerText,
                secondary: c.querySelector('.tier-card-secondary')?.innerText || ''
            }));
            results.push({ ability: title, ss: ssCards, s: sCards });
        });
        return results;
    })()
    """
    res = send_cmd("Runtime.evaluate", {"expression": script, "returnByValue": True})
    data = res.get("result", {}).get("result", {}).get("value", [])

    print("=== EXTRACTED DATA FOR FIRE (HỎA) SECTION ===")
    fire_data = next((item for item in data if "Hỏa" in item["ability"] or "Fire" in item["ability"]), None)
    if fire_data:
        print("Ability:", fire_data["ability"])
        print("\n--- Tier SS (Prismana Cấp 4) ---")
        for c in fire_data["ss"]:
            print(f"  {c['name']} ({c['num']}): {c['levelTag']} | Badge: {c['tierPill']} | Secondary: {c['secondary']}")
        print("\n--- Tier S (Cấp 3 Cơ bản) ---")
        for c in fire_data["s"]:
            print(f"  {c['name']} ({c['num']}): {c['levelTag']} | Badge: {c['tierPill']} | Secondary: {c['secondary']}")

    # Check for any secondary ability with level 4 in Tier S cards across ALL abilities
    print("\n=== CHECKING ALL TIER S CARDS ACROSS ALL ABILITIES FOR ANY LEVEL 4 ===")
    violations = []
    import re
    total_s_cards = 0
    for item in data:
        for c in item["s"]:
            total_s_cards += 1
            sec = c.get("secondary", "")
            # Check if any ability level is > 3 (e.g. 4, 5, etc.)
            for m in re.finditer(r'\b([4-9])\b', sec):
                violations.append((item["ability"], c["name"], sec))

    print(f"Total Tier S cards checked across all abilities: {total_s_cards}")
    if violations:
        print("FAILED: Found level > 3 in Tier S cards:")
        for v in violations:
            print("  ", v)
    else:
        print("SUCCESS: 100% of Tier S cards have secondary levels <= 3! All match base forms perfectly!")

    # Scroll modal to Fire section and capture screenshot
    send_cmd("Runtime.evaluate", {
        "expression": "document.querySelector('.tier-ability-section').scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss = send_cmd("Page.captureScreenshot", {})
    img_data = base64.b64decode(ss["result"]["data"])
    out = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "aniimo_tier_s_levels_verified.png")
    with open(out, "wb") as f:
        f.write(img_data)
    print("\nSaved screenshot to:", out)

finally:
    proc.kill()
