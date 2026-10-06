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
    "--window-size=1400,1200",
    "http://localhost:8080/"
])

time.sleep(3)

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
        time.sleep(0.5)
        chk = send_cmd("Runtime.evaluate", {"expression": "!!window.wasmReady", "returnByValue": True})
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    # Turn on season
    send_cmd("Runtime.evaluate", {
        "expression": """
            const seasonOn = document.getElementById('season-on');
            if (seasonOn && !seasonOn.checked) seasonOn.click();
            document.getElementById('optimize-btn').click();
        """
    })

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('.ability-col').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1)

    # Scroll to seed card
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('seed-card').scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss_seed = send_cmd("Page.captureScreenshot", {})
    out_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage"
    out_seed = os.path.join(out_dir, "season_seed_table.png")
    with open(out_seed, "wb") as f:
        f.write(base64.b64decode(ss_seed["result"]["data"]))
    print("Saved seed table to:", out_seed)

    # Scroll to processing facilities in facility plan
    send_cmd("Runtime.evaluate", {
        "expression": """
            const titles = Array.from(document.querySelectorAll('.plan-category-title'));
            const procTitle = titles.find(t => t.textContent.includes('Cơ sở chế biến'));
            if (procTitle) procTitle.scrollIntoView(true);
        """
    })
    time.sleep(0.5)

    ss_proc = send_cmd("Page.captureScreenshot", {})
    out_proc = os.path.join(out_dir, "season_processing_dishes.png")
    with open(out_proc, "wb") as f:
        f.write(base64.b64decode(ss_proc["result"]["data"]))
    print("Saved processing dishes to:", out_proc)

finally:
    proc.kill()
