import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

# Kill old headless Chrome
subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
time.sleep(1)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--disable-gpu",
    "--window-size=1400,2000",
    "http://localhost:8080/"
])

time.sleep(3.5)

try:
    with urllib.request.urlopen("http://localhost:9222/json") as resp:
        targets = json.loads(resp.read().decode())
    
    target = None
    for t in targets:
        if "localhost:8080" in t.get("url", ""):
            target = t
            break
            
    ws_url = target["webSocketDebuggerUrl"]
    ws = websocket.create_connection(ws_url)

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

    # 1. Click optimize to solve and show roster
    print("Clicking optimize-btn...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })
    
    print("Polling until results-section is visible...")
    for i in range(30):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('results-section') && document.getElementById('results-section').style.display !== 'none'",
            "returnByValue": True
        })
        val = chk.get("result", {}).get("result", {}).get("value")
        if val:
            print(f"Results section ready in {i+1}s")
            break
    time.sleep(1.5)

    # 2. Check DOM before opening modal
    dom_check = send_cmd("Runtime.evaluate", {
        "expression": """(() => {
            const tabs = document.querySelector('.aniimo-setup-tabs');
            const levels = document.querySelector('#ability-levels');
            const triggerBtn = document.querySelector('.btn-tierlist-trigger');
            return {
                hasTabs: !!tabs,
                hasLevels: !!levels,
                hasTriggerBtn: !!triggerBtn,
                triggerBtnText: triggerBtn ? triggerBtn.innerText.trim() : null
            };
        })()""",
        "returnByValue": True
    })
    val1 = dom_check.get("result", {}).get("result", {}).get("value", {})
    print("DOM Check before modal:", json.dumps(val1, ensure_ascii=True))

    # 3. Screenshot Aniimo Team Card
    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('aniimo-card').scrollIntoView();"})
    time.sleep(0.5)
    card_rect = send_cmd("Runtime.evaluate", {
        "expression": """(() => {
            const card = document.getElementById('aniimo-card');
            if (!card) return null;
            const r = card.getBoundingClientRect();
            return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
        })()""",
        "returnByValue": True
    })
    rect = card_rect.get("result", {}).get("result", {}).get("value")
    print("Card rect:", rect)
    if rect:
        ss1 = send_cmd("Page.captureScreenshot", {
            "clip": {
                "x": rect["x"],
                "y": rect["y"],
                "width": rect["width"],
                "height": rect["height"],
                "scale": 1
            }
        })
        if "result" in ss1 and "data" in ss1["result"]:
            img_data1 = base64.b64decode(ss1["result"]["data"])
            out1 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "roster_single_button_section.png")
            with open(out1, "wb") as f:
                f.write(img_data1)
            print("Captured roster card to:", out1)
        else:
            print("Screenshot 1 failed:", ss1)

    # 4. Click Tier List Button to open modal
    print("Clicking trigger to open Tier List Modal...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.querySelector('.btn-tierlist-trigger').click();"
    })
    time.sleep(1)

    # 5. Check Modal content & level counts
    modal_stats = send_cmd("Runtime.evaluate", {
        "expression": """(() => {
            const modal = document.getElementById('aniimoTierModal');
            const isShow = modal.classList.contains('show');
            const chips = document.querySelectorAll('.tier-chip');
            const ssBlocks = document.querySelectorAll('.tier-ss-block');
            const sBlocks = document.querySelectorAll('.tier-s-block');
            const allCards = document.querySelectorAll('.tier-aniimo-card');
            
            // Check for level tags
            const tags = Array.from(document.querySelectorAll('.tier-level-tag')).map(t => t.innerText.trim());
            const countLv4 = tags.filter(t => t.includes('4')).length;
            const countLv3 = tags.filter(t => t.includes('3')).length;
            const countLv2 = tags.filter(t => t.includes('2')).length;
            const countLv1 = tags.filter(t => t.includes('1')).length;

            // Check Fire section cards specifically
            const fireSection = Array.from(document.querySelectorAll('.tier-ability-section')).find(s => s.innerText.includes('Hỏa') || s.innerText.includes('Fire'));
            let fireSS = [];
            let fireS = [];
            if (fireSection) {
                const ssBlock = fireSection.querySelector('.tier-ss-block');
                if (ssBlock) {
                    fireSS = Array.from(ssBlock.querySelectorAll('.tier-card-name')).map(el => el.innerText.trim());
                }
                const sBlock = fireSection.querySelector('.tier-s-block');
                if (sBlock) {
                    fireS = Array.from(sBlock.querySelectorAll('.tier-card-name')).map(el => el.innerText.trim());
                }
            }

            return {
                isShow,
                chipCount: chips.length,
                ssBlockCount: ssBlocks.length,
                sBlockCount: sBlocks.length,
                totalCards: allCards.length,
                countLv4,
                countLv3,
                countLv2,
                countLv1,
                fireSS,
                fireS
            };
        })()""",
        "returnByValue": True
    })
    val2 = modal_stats.get("result", {}).get("result", {}).get("value", {})
    print("Modal Stats:", json.dumps(val2, ensure_ascii=True))

    # 6. Capture screenshot of the open modal
    modal_rect = send_cmd("Runtime.evaluate", {
        "expression": """(() => {
            const m = document.querySelector('.aniimo-tier-modal-content');
            if (!m) return null;
            const r = m.getBoundingClientRect();
            return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: Math.min(1100, r.height) };
        })()""",
        "returnByValue": True
    })
    mrect = modal_rect.get("result", {}).get("result", {}).get("value")
    if mrect:
        ss2 = send_cmd("Page.captureScreenshot", {
            "clip": {
                "x": mrect["x"],
                "y": mrect["y"],
                "width": mrect["width"],
                "height": mrect["height"],
                "scale": 1
            }
        })
        if "result" in ss2 and "data" in ss2["result"]:
            img_data2 = base64.b64decode(ss2["result"]["data"])
            out2 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "aniimo_tier_modal_open.png")
            with open(out2, "wb") as f:
                f.write(img_data2)
            print("Captured modal screenshot to:", out2)
        else:
            print("Screenshot 2 failed:", ss2)

finally:
    proc.kill()
