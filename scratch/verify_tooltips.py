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

    # Click optimize
    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('.aniimo-worker-card').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1)

    # Extract all worker card tooltips
    script = """
    (() => {
        const cards = Array.from(document.querySelectorAll('.aniimo-worker-card'));
        return cards.map(c => ({
            name: c.querySelector('.aniimo-worker-name')?.innerText || 'Compact',
            title: c.getAttribute('title')
        }));
    })()
    """
    res = send_cmd("Runtime.evaluate", {"expression": script, "returnByValue": True})
    tooltips = res.get("result", {}).get("result", {}).get("value", [])

    print(f"Total worker cards rendered: {len(tooltips)}")
    
    # Check for duplicates in each tooltip
    has_duplicates = False
    for t in tooltips:
        title = t.get("title", "")
        if "Đề xuất khác" in title or "alternatives" in title:
            # Extract alternatives line
            alts_line = [line for line in title.split("\n") if "Đề xuất khác" in line or "alternatives" in line]
            if alts_line:
                raw_names = alts_line[0].split(":")[1].split(",")
                clean_names = [n.split("(")[0].strip() for n in raw_names]
                dups = [n for n in clean_names if clean_names.count(n) > 1]
                if dups:
                    has_duplicates = True
                    print(f"DUPLICATE DETECTED in card {t['name']}: {dups}")
                    print("  Full title:\n", title)

    if not has_duplicates:
        print("ALL tooltips have 100% unique alternatives! No duplicates!")

    # Print Scorchhowl and Stellarys tooltip samples
    print("\n--- SAMPLE TOOLTIPS ---")
    for t in tooltips:
        if "Scorchhowl" in t.get("title", ""):
            print("Scorchhowl tooltip:\n", t["title"])
            break

    for t in tooltips:
        if "Stellarys" in t.get("title", ""):
            print("\nStellarys tooltip:\n", t["title"])
            break

finally:
    proc.kill()
