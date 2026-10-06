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
    "--window-size=1400,1200",
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

    for i in range(20):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {"expression": "!!window.wasmReady", "returnByValue": True})
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    # Select RV 14
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const homeLevelSel = document.getElementById('home-level');
            if (homeLevelSel) {
                homeLevelSel.value = '14';
                homeLevelSel.dispatchEvent(new Event('change'));
            }
        })()
        """
    })
    time.sleep(0.5)

    # Click optimize
    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('#facility-plan-container table').length >= 3",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1.5)

    # Scroll directly to 'CƠ SỞ CHẾ BIẾN' heading inside facility-plan-container
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const headings = Array.from(document.querySelectorAll('#facility-plan-container h3, #facility-plan-container h4'));
            const target = headings.find(h => h.innerText.includes('CHẾ BIẾN') || h.innerText.includes('Processing'));
            if (target) {
                target.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        })()
        """
    })
    time.sleep(1)

    ss = send_cmd("Page.captureScreenshot", {})
    img_data = base64.b64decode(ss["result"]["data"])
    out = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "processing_facilities_perfect_screenshot.png")
    with open(out, "wb") as f:
        f.write(img_data)
    print("Saved processing facilities screenshot to:", out)

finally:
    proc.kill()
