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
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {"expression": "!!window.wasmReady", "returnByValue": True})
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    # Turn on Season switch
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const seasonOn = document.getElementById('season-on');
            if (seasonOn && !seasonOn.checked) {
                seasonOn.click();
            }
        })()
        """
    })
    time.sleep(1)

    # Check images inside .dish-thumb
    script = """
    (() => {
        const cards = Array.from(document.querySelectorAll('.season-dish-card')).map(card => {
            const name = card.querySelector('.dish-name')?.innerText;
            const img = card.querySelector('.dish-thumb img');
            return {
                name: name,
                imgSrc: img ? img.src : null,
                complete: img ? img.complete : false,
                naturalWidth: img ? img.naturalWidth : 0
            };
        });
        return cards;
    })()
    """
    res = send_cmd("Runtime.evaluate", {"expression": script, "returnByValue": True})
    cards = res.get("result", {}).get("result", {}).get("value", [])
    print("SEASON DISH CARDS:")
    for c in cards:
        print(" ", c)

    # Capture screenshot of the season notes element
    res_box = send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const el = document.getElementById('season-notes');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        })()
        """,
        "returnByValue": True
    })
    box = res_box.get("result", {}).get("result", {}).get("value")
    if box:
        shot = send_cmd("Page.captureScreenshot", {
            "format": "png",
            "clip": {
                "x": max(0, box["x"] - 20),
                "y": max(0, box["y"] - 20),
                "width": box["width"] + 40,
                "height": box["height"] + 40,
                "scale": 1
            }
        })
        img_data = base64.b64decode(shot["result"]["data"])
        out_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage\verified_sauce_icon.png"
        with open(out_path, "wb") as f:
            f.write(img_data)
        print(f"Screenshot saved to {out_path}")

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
