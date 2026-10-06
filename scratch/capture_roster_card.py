import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

# Kill old Chrome
subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
time.sleep(1)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--disable-gpu",
    "--window-size=1400,1200",
    "http://localhost:8080/"
])

time.sleep(3.5)

try:
    with urllib.request.urlopen("http://localhost:9222/json") as resp:
        targets = json.loads(resp.read().decode())
    
    target = next(t for t in targets if "localhost:8080" in t.get("url", ""))
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

    # 1. Wait for WASM ready
    print("Waiting for WASM worker ready...")
    for i in range(20):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "!!window.wasmReady",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            print(f"WASM ready in {i+1}s")
            break

    # Click optimize
    print("Clicking optimize-btn...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })

    # Wait until solver is finished and roster rendered
    print("Waiting for solver and roster render...")
    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": """(() => {
                const btnLoading = document.querySelector('.btn-loading');
                const isLoaded = !btnLoading || btnLoading.style.display === 'none';
                const hasAbilities = document.querySelectorAll('.ability-col').length > 0;
                return isLoaded && hasAbilities;
            })()""",
            "returnByValue": True
        })
        val = chk.get("result", {}).get("result", {}).get("value")
        if val:
            print(f"Solver and roster fully loaded in {i+1}s")
            break

    time.sleep(1)

    # Scroll card into view
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('aniimo-card').scrollIntoView({ behavior: 'instant', block: 'center' });"
    })
    time.sleep(0.5)

    card_rect = send_cmd("Runtime.evaluate", {
        "expression": """(() => {
            const card = document.getElementById('aniimo-card');
            const r = card.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height };
        })()""",
        "returnByValue": True
    })
    rect = card_rect.get("result", {}).get("result", {}).get("value")
    print("Aniimo Card Bounding Box:", rect)
    if rect and rect["width"] > 0 and rect["height"] > 0:
        ss = send_cmd("Page.captureScreenshot", {
            "clip": {
                "x": rect["x"],
                "y": rect["y"],
                "width": rect["width"],
                "height": rect["height"],
                "scale": 1
            }
        })
        if "result" in ss and "data" in ss["result"]:
            img_data = base64.b64decode(ss["result"]["data"])
            out = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "roster_single_button_section_verified.png")
            with open(out, "wb") as f:
                f.write(img_data)
            print("Successfully saved:", out)
finally:
    proc.kill()
