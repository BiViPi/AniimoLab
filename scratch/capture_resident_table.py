import subprocess
import time
import urllib.request
import json
import base64
import os
import websocket

subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
time.sleep(1)

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--remote-allow-origins=*",
    "--headless",
    "--disable-gpu",
    "--window-size=1400,1000",
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

    # Select RV14
    send_cmd("Runtime.evaluate", {
        "expression": """
        const sel = document.getElementById('home-level');
        if (sel) {
            sel.value = '14';
            sel.dispatchEvent(new Event('change'));
        }
        """
    })
    time.sleep(1)

    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('.ability-col').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1.5)

    # Scroll directly to the table row containing Dewy House / Sandcastle / Nimbus Bed
    send_cmd("Runtime.evaluate", {
        "expression": """
        const row = Array.from(document.querySelectorAll('#facility-plan-container tr')).find(tr => {
            const fac = tr.querySelector('[data-label=\"Facility\"]')?.textContent || '';
            return fac.includes('sương mai') || fac.includes('Dewy') || fac.includes('Nimbus') || fac.includes('Sandcastle');
        });
        if (row) {
            row.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
        """
    })
    time.sleep(0.5)

    ss = send_cmd("Page.captureScreenshot", {})
    img_data = base64.b64decode(ss["result"]["data"])
    out = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "resident_facilities_in_plan_table.png")
    with open(out, "wb") as f:
        f.write(img_data)
    print("Saved screenshot to:", out)

finally:
    proc.kill()
