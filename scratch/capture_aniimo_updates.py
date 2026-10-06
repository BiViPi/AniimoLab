import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

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

    # Wait for wasmReady to be true
    print("Waiting for wasmReady...")
    for i in range(15):
        time.sleep(0.5)
        res = send_cmd("Runtime.evaluate", {
            "expression": "typeof wasmReady !== 'undefined' && wasmReady === true"
        })
        ready = res.get("result", {}).get("value")
        if ready:
            print("wasmReady is True!")
            break

    # Click optimize button
    print("Clicking optimize-btn...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })

    print("Waiting for results-section to display...")
    for i in range(30):
        time.sleep(1)
        res = send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('results-section').style.display !== 'none' && document.querySelector('.btn-loading').style.display === 'none'"
        })
        val = res.get("result", {}).get("value")
        print(f"[{i+1}s] Plan solved:", val)
        if val is True:
            break

    time.sleep(2)

    # Let's inspect the roster card HTML and chosen avatars
    res = send_cmd("Runtime.evaluate", {
        "expression": """
        ({
            chosenAvatarsCount: document.querySelectorAll('.ability-chosen-avatar').length,
            chosenAvatarSample: document.querySelector('.ability-chosen-avatar')?.outerHTML,
            workerBadgesCount: document.querySelectorAll('.roster-worker-item').length,
            workerBadgeSample: document.querySelector('.roster-worker-item')?.outerHTML
        })
        """,
        "returnByValue": True
    })
    print("Roster inspection:", json.dumps(res.get("result", {}).get("value"), indent=2))

    artifact_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a"

    # Capture screenshot of the aniimo-card (Tổ đội công nhân Aniimo)
    res_card = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const el = document.getElementById('aniimo-card');
            if (!el) return null;
            el.scrollIntoView();
            const rect = el.getBoundingClientRect();
            return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        })()
        """,
        "returnByValue": True
    })
    card_box = res_card.get("result", {}).get("value")
    print("Aniimo card box:", card_box)

    if card_box and card_box.get("height", 0) > 0:
        time.sleep(0.5)
        screenshot_res = send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {
                "x": max(0, card_box["x"] - 10),
                "y": max(0, card_box["y"] - 10),
                "width": card_box["width"] + 20,
                "height": card_box["height"] + 20,
                "scale": 1
            }
        })
        img_data = screenshot_res.get("result", {}).get("data")
        if img_data:
            out_path = os.path.join(artifact_dir, "roster_team_updated.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img_data))
            print("Saved roster screenshot to:", out_path)

    # Inspect facility plan table rows for Woodworking Bench (Bàn mộc) and Chimney Kiln (Lò nung)
    res_table = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const rows = Array.from(document.querySelectorAll('#facility-plan-container table tr'));
            const matches = [];
            for (const row of rows) {
                const text = row.innerText.replace(/\\s+/g, ' ').trim();
                const worker = row.querySelector('.aniimo-worker-card, .aniimo-circle-badge');
                if (worker) {
                    matches.push({
                        text: text.slice(0, 100),
                        workerTag: worker.className,
                        workerName: worker.querySelector('.aniimo-worker-name')?.innerText || '',
                        workerLevel: worker.querySelector('.aniimo-worker-level')?.innerText || '',
                        workerImg: worker.querySelector('img')?.getAttribute('src') || ''
                    });
                }
            }
            return matches;
        })()
        """,
        "returnByValue": True
    })
    print("Facility table workers found:", json.dumps(res_table.get("result", {}).get("value"), indent=2))

    # Scroll down to facility plan container and capture screenshot
    res_box = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const el = document.getElementById('facility-plan-container');
            if (!el) return null;
            el.scrollIntoView();
            const rect = el.getBoundingClientRect();
            return { x: rect.x + window.scrollX, y: rect.y + window.scrollY, width: rect.width, height: rect.height };
        })()
        """,
        "returnByValue": True
    })
    box = res_box.get("result", {}).get("value")
    print("Facility container box:", box)

    if box and box.get("height", 0) > 0:
        time.sleep(0.5)
        screenshot_res = send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {
                "x": max(0, box["x"] - 10),
                "y": max(0, box["y"] - 10),
                "width": box["width"] + 20,
                "height": min(1800, box["height"] + 20),
                "scale": 1
            }
        })
        img_data = screenshot_res.get("result", {}).get("data")
        if img_data:
            out_path = os.path.join(artifact_dir, "facility_plan_updated.png")
            with open(out_path, "wb") as f:
                f.write(base64.b64decode(img_data))
            print("Saved facility plan screenshot to:", out_path)

    ws.close()
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    proc.terminate()
