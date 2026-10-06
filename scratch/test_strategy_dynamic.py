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

    def run_rv_test(rv_str, filename_prefix):
        print(f"\n--- TESTING RV {rv_str} ---")
        send_cmd("Runtime.evaluate", {
            "expression": f"(() => {{ const sel = document.getElementById('home-level'); if (sel) {{ sel.value = '{rv_str}'; sel.dispatchEvent(new Event('change')); }} }})()"
        })
        time.sleep(1)

        val_chk = send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('home-level').value",
            "returnByValue": True
        })
        print(f"Verified home-level element value before solve: {val_chk.get('result', {}).get('result', {}).get('value')}")

        # Clear old insights container so we wait for new solve
        send_cmd("Runtime.evaluate", {
            "expression": "const c = document.getElementById('insights-content'); if (c) c.innerHTML = '';"
        })
        time.sleep(0.5)

        send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

        for i in range(35):
            time.sleep(1)
            chk = send_cmd("Runtime.evaluate", {
                "expression": "document.querySelectorAll('#insights-content .insight-item').length > 0",
                "returnByValue": True
            })
            if chk.get("result", {}).get("result", {}).get("value"):
                break

        time.sleep(1.5)

        eval_res = send_cmd("Runtime.evaluate", {
            "expression": """
            (() => {
                const items = [];
                document.querySelectorAll('#insights-content .insight-item').forEach(it => {
                    const label = it.querySelector('.insight-label')?.textContent?.trim();
                    const desc = it.querySelector('.insight-desc')?.textContent?.trim();
                    items.push({ label, desc });
                });
                return items;
            })()
            """,
            "returnByValue": True
        })

        items = eval_res.get("result", {}).get("result", {}).get("value", [])
        print(f"Cards found for RV {rv_str}: {len(items)}")

        # Scroll to strategy card and take screenshot
        send_cmd("Runtime.evaluate", {
            "expression": "document.getElementById('insights-content')?.scrollIntoView({ behavior: 'instant', block: 'center' });"
        })
        time.sleep(0.5)

        ss = send_cmd("Page.captureScreenshot", {})
        img_data = base64.b64decode(ss["result"]["data"])
        out = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", f"strategy_rv{rv_str}.png")
        with open(out, "wb") as f:
            f.write(img_data)
        print(f"Saved screenshot to: {out}")
        return items

    res_rv12 = run_rv_test("12", "rv12")
    res_rv14 = run_rv_test("14", "rv14")

    with open("scratch/strategy_dynamic_results.json", "w", encoding="utf-8") as f:
        json.dump({"rv12": res_rv12, "rv14": res_rv14}, f, indent=2, ensure_ascii=False)

finally:
    proc.kill()
