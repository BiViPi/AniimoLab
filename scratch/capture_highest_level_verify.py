import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

# Kill any existing chrome on 9222
subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
time.sleep(1)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--disable-gpu",
    "--window-size=1280,3600",
    "http://localhost:8080/"
])

print("Waiting for Chrome...")
time.sleep(2.5)

try:
    with urllib.request.urlopen("http://localhost:9222/json") as resp:
        targets = json.loads(resp.read().decode())
    
    target = [t for t in targets if "localhost:8080" in t.get("url", "")][0]
    ws = websocket.create_connection(target["webSocketDebuggerUrl"])

    msg_id = 0
    def send_cmd(method, params=None):
        global msg_id
        msg_id += 1
        ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
        while True:
            res = json.loads(ws.recv())
            if res.get("id") == msg_id:
                return res

    send_cmd("Runtime.enable")

    # Wait for page to initialize
    print("Waiting for page initialization...")
    time.sleep(3)

    # Click optimize button
    print("Clicking optimize-btn...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })

    # Poll until solver finishes
    print("Polling solver status...")
    for i in range(35):
        time.sleep(1)
        res = send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('facility-plan-container') && document.getElementById('facility-plan-container').innerHTML.length > 100"
        })
        has_plan = res.get("result", {}).get("value")
        print(f"[{i+1}s] Facility plan rendered:", has_plan)
        if has_plan:
            break

    time.sleep(2)

    # Inspect Vườn ươm workers
    res_vuon_uom = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const rows = Array.from(document.querySelectorAll('#facility-plan-container table tr'));
            const matches = [];
            for (const row of rows) {
                if (row.innerText.includes('Vườn ươm') || row.innerText.includes('Woodland') || row.innerText.includes('Dừa') || row.innerText.includes('Coconut')) {
                    const cards = Array.from(row.querySelectorAll('.aniimo-worker-card')).map(c => ({
                        badge: c.querySelector('.aniimo-level-badge')?.innerText || '',
                        isPrismana: c.classList.contains('is-prismana'),
                        title: c.getAttribute('title') || ''
                    }));
                    matches.push({
                        rowText: row.innerText.replace(/\\s+/g, ' ').trim().slice(0, 80),
                        workers: cards
                    });
                }
            }
            return matches;
        })()
        """,
        "returnByValue": True
    })
    vuon_uom_data = res_vuon_uom.get("result", {}).get("value")
    print("Woodland workers inspection:", json.dumps(vuon_uom_data, indent=2, ensure_ascii=True))

    # Inspect Roster worker badges
    res_roster = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const badges = Array.from(document.querySelectorAll('.roster-worker-item')).map(b => ({
                badge: b.querySelector('.roster-level-badge')?.innerText || '',
                isPrismana: b.classList.contains('is-prismana'),
                title: b.getAttribute('title') || ''
            }));
            return {
                totalBadges: badges.length,
                allBadges: badges
            };
        })()
        """,
        "returnByValue": True
    })
    roster_data = res_roster.get("result", {}).get("value")
    print("Roster badges inspection:", json.dumps(roster_data, indent=2, ensure_ascii=True))

    artifact_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a"

    # Screenshot of Vườn ươm / Farmland in table
    res_table_box = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const row = Array.from(document.querySelectorAll('#facility-plan-container table tr')).find(r => r.innerText.includes('Vườn ươm') || r.innerText.includes('Woodland') || r.innerText.includes('Dừa'));
            if (!row) return null;
            row.scrollIntoView({ block: 'center' });
            const rect = row.getBoundingClientRect();
            return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        })()
        """,
        "returnByValue": True
    })
    row_box = res_table_box.get("result", {}).get("value")
    if row_box:
        time.sleep(0.5)
        screenshot_res = send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {
                "x": max(0, row_box["x"] - 20),
                "y": max(0, row_box["y"] - 60),
                "width": row_box["width"] + 40,
                "height": row_box["height"] + 140,
                "scale": 1
            }
        })
        img_data = screenshot_res.get("result", {}).get("data")
        if img_data:
            out_path = os.path.join(artifact_dir, "vuon_uom_highest_level_verified.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img_data))
            print("Saved Vuon uom screenshot to:", out_path)

    # Screenshot of Roster Team Card
    res_roster_box = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const el = document.getElementById('aniimo-card');
            if (!el) return null;
            el.scrollIntoView({ block: 'center' });
            const rect = el.getBoundingClientRect();
            return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        })()
        """,
        "returnByValue": True
    })
    roster_box = res_roster_box.get("result", {}).get("value")
    if roster_box:
        time.sleep(0.5)
        screenshot_res = send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {
                "x": max(0, roster_box["x"] - 10),
                "y": max(0, roster_box["y"] - 10),
                "width": roster_box["width"] + 20,
                "height": roster_box["height"] + 20,
                "scale": 1
            }
        })
        img_data = screenshot_res.get("result", {}).get("data")
        if img_data:
            out_path = os.path.join(artifact_dir, "roster_team_highest_level_verified.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img_data))
            print("Saved Roster screenshot to:", out_path)

    ws.close()
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    proc.terminate()
