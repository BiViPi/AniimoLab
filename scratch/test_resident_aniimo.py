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

    # Click optimize
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

    # Inspect Aniimo rows
    eval_res = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const results = [];
            document.querySelectorAll('#facility-plan-container tr').forEach(tr => {
                const fac = tr.querySelector('[data-label="Facility"]')?.textContent?.trim();
                const item = tr.querySelector('[data-label="Producing"]')?.textContent?.trim();
                const aniimo = tr.querySelector('[data-label="Aniimo"]')?.textContent?.trim();
                const aniimoImg = tr.querySelector('[data-label="Aniimo"] img')?.src;
                if (fac && (fac.includes('Dewy') || fac.includes('sương mai') || fac.includes('Nimbus') || fac.includes('mây') || fac.includes('Sandcastle') || fac.includes('cát'))) {
                    results.push({ fac, item, aniimo, aniimoImg });
                }
            });

            const teamRows = [];
            document.querySelectorAll('#aniimo-summary tr').forEach(tr => {
                const text = tr.textContent?.trim();
                teamRows.push(text);
            });

            return { facilityRows: results, teamRows: teamRows };
        })()
        """,
        "returnByValue": True
    })

    eval_val = eval_res.get("result", {}).get("result", {}).get("value", {})
    with open("scratch/resident_result.json", "w", encoding="utf-8") as f:
        json.dump(eval_val, f, indent=2, ensure_ascii=False)
    print("Saved eval result to scratch/resident_result.json")

    # Scroll to facility-plan-container and screenshot
    send_cmd("Runtime.evaluate", {
        "expression": "document.querySelector('.facility-category:has([data-label=\"Facility\"])')?.scrollIntoView(true) || document.getElementById('facility-plan-container')?.scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss = send_cmd("Page.captureScreenshot", {})
    img_data = base64.b64decode(ss["result"]["data"])
    out1 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "resident_facilities_verified.png")
    with open(out1, "wb") as f:
        f.write(img_data)
    print("Saved raw-plan screenshot to:", out1)

    # Scroll to aniimo-card and screenshot
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('aniimo-card')?.scrollIntoView(true);"
    })
    time.sleep(0.5)

    ss2 = send_cmd("Page.captureScreenshot", {})
    img_data2 = base64.b64decode(ss2["result"]["data"])
    out2 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "resident_aniimo_team_verified.png")
    with open(out2, "wb") as f:
        f.write(img_data2)
    print("Saved aniimo-card screenshot to:", out2)

finally:
    proc.kill()
