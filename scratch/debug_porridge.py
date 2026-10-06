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

    # Select RV 14 and check Ginseng Porridge
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const homeLevelSel = document.getElementById('home-level');
            if (homeLevelSel) {
                homeLevelSel.value = '14';
                homeLevelSel.dispatchEvent(new Event('change'));
            }
            const gp = document.querySelector('input[data-special="ginseng_porridge"]');
            if (gp && !gp.checked) {
                gp.click();
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
            "expression": "document.querySelectorAll('#profit-breakdown tbody tr').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(1.5)

    script = """
    (() => {
        const rows = Array.from(document.querySelectorAll('#profit-breakdown tbody tr')).map(r => {
            return Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
        });

        const facRows = Array.from(document.querySelectorAll('.facility-plan-table tbody tr')).map(r => {
            return Array.from(r.querySelectorAll('td')).map(td => td.innerText.trim());
        });

        const plan = window.lastPlanResult;

        return {
            profitTable: rows,
            facilityTable: facRows,
            units: plan ? plan.units : null,
            steps: plan ? plan.steps : null
        };
    })()
    """
    res = send_cmd("Runtime.evaluate", {"expression": script, "returnByValue": True})
    val = res.get("result", {}).get("result", {}).get("value", {})
    
    print("PROFIT TABLE:")
    for r in val.get("profitTable", []):
        print("  ", r)
    print("\nFACILITY PLAN TABLE:")
    for r in val.get("facilityTable", []):
        print("  ", r)
        
    print("\nUNITS:")
    units = val.get("units", {})
    if units:
        for k in sorted(units.keys()):
            if any(x in k for x in ['ginseng', 'rice', 'coconut', 'grape', 'simmer', 'dryer', 'pot']):
                print(f"  {k}: {units[k]}")

    print("\nSTEPS FOR SIMMERING POT, FARMLAND, JUKEBOX DRYER:")
    for s in val.get("steps", []):
        fac = s.get("facility", "")
        if any(f in fac for f in ["Simmering Pot", "Jukebox Dryer", "Farmland", "Woodland", "Carousel Mill"]):
            print(f"  [{fac}] {s.get('item_name')} count={s.get('count')} status={s.get('status')} rate={s.get('rate_per_second')} reason={s.get('reason')}")

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
