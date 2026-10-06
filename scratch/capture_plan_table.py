import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

# Clean any existing headless chrome
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

    # Click optimize
    print("Clicking optimize-btn...")
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })

    # Poll until solver finishes
    print("Polling solver status...")
    time.sleep(3)
    for i in range(40):
        time.sleep(1)
        res = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelector('.btn-loading') && document.querySelector('.btn-loading').style.display === 'none' && document.getElementById('results-section').style.display !== 'none'",
            "returnByValue": True
        })
        is_done = res.get("result", {}).get("value")
        print(f"[{i+1}s] Solver finished:", is_done)
        if is_done:
            break

    # Additional wait for layout rendering
    time.sleep(2)

    # Scroll down to facility plan
    send_cmd("Runtime.evaluate", {
        "expression": "const el = document.getElementById('facility-plan-container'); if (el) el.scrollIntoView({ block: 'start' });"
    })
    time.sleep(1)

    # Capture screenshot
    print("Capturing screenshot...")
    screenshot_res = send_cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": True
    })

    img_data = screenshot_res.get("result", {}).get("data")
    if img_data:
        artifact_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a"
        out_path = os.path.join(artifact_dir, "aniimo_visual_plan_tables_done.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(img_data))
        print("Saved screenshot to:", out_path)

    ws.close()
except Exception as e:
    print("Error:", e)
finally:
    proc.terminate()
