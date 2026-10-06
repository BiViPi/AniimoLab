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

    # Turn on season switch
    send_cmd("Runtime.evaluate", {
        "expression": """
            const seasonOn = document.getElementById('season-on');
            if (seasonOn && !seasonOn.checked) {
                seasonOn.click();
            }
        """
    })
    time.sleep(0.5)

    # Scroll season section into view
    send_cmd("Runtime.evaluate", {
        "expression": "document.querySelector('.config-custom-card').scrollIntoView(true);"
    })
    time.sleep(0.5)

    # Screenshot Card 3
    ss = send_cmd("Page.captureScreenshot", {})
    img_data = base64.b64decode(ss["result"]["data"])
    out_dir = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage"
    out1 = os.path.join(out_dir, "season_and_special_recipes_card.png")
    with open(out1, "wb") as f:
        f.write(img_data)
    print("Saved card 3 screenshot to:", out1)

    # Click Calculate
    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('.ability-col').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1)

    # Scroll results summary into view
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('results-section').scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss2 = send_cmd("Page.captureScreenshot", {})
    img_data2 = base64.b64decode(ss2["result"]["data"])
    out2 = os.path.join(out_dir, "plan_with_season_results.png")
    with open(out2, "wb") as f:
        f.write(img_data2)
    print("Saved plan results screenshot to:", out2)

    # Scroll facility plan into view
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('facility-plan-container').scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss3 = send_cmd("Page.captureScreenshot", {})
    img_data3 = base64.b64decode(ss3["result"]["data"])
    out3 = os.path.join(out_dir, "facility_plan_season_crops.png")
    with open(out3, "wb") as f:
        f.write(img_data3)
    print("Saved facility plan screenshot to:", out3)

finally:
    proc.kill()
