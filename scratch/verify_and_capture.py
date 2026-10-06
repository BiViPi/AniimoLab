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

    # Click optimize button
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('optimize-btn').click();"
    })

    print("Waiting for results-section to display...")
    for i in range(25):
        time.sleep(1)
        res = send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('results-section').style.display !== 'none'"
        })
        val = res.get("result", {}).get("value")
        print(f"[{i+1}s] results-section visible:", val)
        if val is True:
            break

    time.sleep(2)

    # Check results-section style.display and facility-plan-container innerHTML length
    res = send_cmd("Runtime.evaluate", {
        "expression": "({ display: document.getElementById('results-section').style.display, planLen: document.getElementById('facility-plan-container').innerHTML.length, htmlSample: document.getElementById('facility-plan-container').innerHTML.slice(0, 500) })",
        "returnByValue": True
    })
    print("Result state:", res.get("result", {}).get("value"))

    # Also capture screenshot
    screenshot_res = send_cmd("Page.captureScreenshot", {
        "format": "png",
        "captureBeyondViewport": True
    })

    img_data = screenshot_res.get("result", {}).get("data")
    if img_data:
        artifact_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a"
        out_path = os.path.join(artifact_dir, "facility_plan_visual_verified.png")
        with open(out_path, "wb") as f:
            f.write(base64.b64decode(img_data))
        print("Saved screenshot to:", out_path)

    ws.close()
except Exception as e:
    print("Error:", e)
finally:
    proc.terminate()
