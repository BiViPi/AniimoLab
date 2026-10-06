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

    # Setup:
    # 1. RV 14
    # 2. Turn OFF e-mode (ensure e-mode is unchecked or watts=0)
    # 3. Turn ON Season (Lễ hội trung thu)
    # 4. Check Ginseng Porridge
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const homeLevelSel = document.getElementById('home-level');
            if (homeLevelSel) {
                homeLevelSel.value = '14';
                homeLevelSel.dispatchEvent(new Event('change'));
            }
            const seasonOn = document.getElementById('season-on');
            if (seasonOn && !seasonOn.checked) {
                seasonOn.click();
            }
            const emodeToggle = document.getElementById('emode-toggle');
            if (emodeToggle && emodeToggle.checked) {
                emodeToggle.click();
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
        const plan = window.lastPlanResult;
        
        // Level up card coins row
        const levelUpCard = document.getElementById('level-up-card');
        const levelUpRows = Array.from(document.querySelectorAll('.level-up-lines tbody tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        });

        // Insights summary text
        const insightsContent = document.getElementById('insights-content')?.innerText;

        // Breakdown table
        const breakdownRows = Array.from(document.querySelectorAll('#profit-breakdown tbody tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        });

        return {
            plan_rate_per_second: plan ? plan.rate_per_second : null,
            plan_rate_hourly: plan ? plan.rate_per_second * 3600 : null,
            levelUpRequirements: plan?.level_up?.requirements,
            levelUpRows: levelUpRows,
            breakdownRows: breakdownRows,
            insightsContent: insightsContent,
            income_streams: plan?.income_streams,
            coin_items: plan?.coin_items
        };
    })()
    """
    res = send_cmd("Runtime.evaluate", {"expression": script, "returnByValue": True})
    val = res.get("result", {}).get("result", {}).get("value", {})
    
    print("=== PLAN RATE ===")
    print(f"rate_per_second: {val.get('plan_rate_per_second')}")
    print(f"rate_hourly: {val.get('plan_rate_hourly')}")

    print("\n=== LEVEL UP ROWS ===")
    for r in val.get('levelUpRows', []):
        print(" ", r)

    print("\n=== LEVEL UP REQUIREMENTS ===")
    for r in val.get('levelUpRequirements', []):
        print(" ", r)

    print("\n=== BREAKDOWN ROWS ===")
    for r in val.get('breakdownRows', []):
        print(" ", r)

    print("\n=== INSIGHTS CONTENT ===")
    print(val.get('insightsContent'))

    print("\n=== INCOME STREAMS ===")
    for s in (val.get('income_streams') or []):
        print(f"  {s.get('item_name')}: {s.get('rate_per_second', 0) * 3600}/hr (units: {s.get('units_per_second', 0) * 3600}/hr)")

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
