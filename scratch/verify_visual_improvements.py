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

    # Click optimize
    send_cmd("Runtime.evaluate", {"expression": "document.getElementById('optimize-btn').click();"})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd("Runtime.evaluate", {
            "expression": "document.querySelectorAll('.facility-plan-table tbody tr').length > 0",
            "returnByValue": True
        })
        if chk.get("result", {}).get("result", {}).get("value"):
            break

    time.sleep(2)

    # 1. Check for skip-row buttons (dấu X)
    res_skip = send_cmd("Runtime.evaluate", {
        "expression": "document.querySelectorAll('.skip-row').length",
        "returnByValue": True
    })
    skip_count = res_skip.get("result", {}).get("result", {}).get("value", 0)
    print(f"Skip-row button count (should be 0): {skip_count}")

    # 2. Check facility icons in plan tables
    script_facilities = """
    (() => {
        const rows = Array.from(document.querySelectorAll('.facility-plan-table tbody tr'));
        return rows.map(r => {
            const img = r.querySelector('.facility-cell img');
            const name = r.querySelector('.facility-name-text')?.innerText || '';
            const itemImg = r.querySelector('.item-cell img');
            const itemName = r.querySelector('.item-name-text')?.innerText || '';
            return {
                facility: name,
                hasImg: !!img,
                src: img ? img.src : '',
                item: itemName,
                hasItemImg: !!itemImg,
                itemSrc: itemImg ? itemImg.src : ''
            };
        });
    })()
    """
    res_fac = send_cmd("Runtime.evaluate", {"expression": script_facilities, "returnByValue": True})
    facilities_data = res_fac.get("result", {}).get("result", {}).get("value", [])
    print(f"\n--- Facility Icons in Plan Table (Total rows: {len(facilities_data)}) ---")
    for f in facilities_data:
        fac_name = f.get('facility', '')
        fac_icon = f.get('src', '').split('/')[-1] if f.get('src') else 'NO_ICON'
        item_name = f.get('item', '')
        item_icon = f.get('itemSrc', '').split('/')[-1] if f.get('itemSrc') else 'NO_ICON'
        print(f"  Facility: {fac_name:25} (icon: {fac_icon:35}) | Item: {item_name:20} (icon: {item_icon})")

    # 3. Check profit table product icons
    script_profit = """
    (() => {
        const rows = Array.from(document.querySelectorAll('#profit-breakdown tbody tr'));
        return rows.map(r => {
            const prodImg = r.querySelector('td:nth-child(1) img');
            const prodName = r.querySelector('td:nth-child(1) .item-name-text')?.innerText || '';
            const facImg = r.querySelector('td:nth-child(2) img');
            const facName = r.querySelector('td:nth-child(2) .facility-name-text')?.innerText || '';
            return {
                product: prodName,
                hasProdImg: !!prodImg,
                prodSrc: prodImg ? prodImg.src.split('/').pop() : '',
                facility: facName,
                hasFacImg: !!facImg,
                facSrc: facImg ? facImg.src.split('/').pop() : ''
            };
        });
    })()
    """
    res_prof = send_cmd("Runtime.evaluate", {"expression": script_profit, "returnByValue": True})
    profit_data = res_prof.get("result", {}).get("result", {}).get("value", [])
    print(f"\n--- Profit by Product Table Icons (Total rows: {len(profit_data)}) ---")
    for p in profit_data[:12]:
        print(f"  Product: {p['product']:25} (icon: {p['prodSrc']:30}) | Facility: {p['facility']:25} (icon: {p['facSrc']})")

    # Capture Screenshot 1: Processing facilities section in plan
    send_cmd("Runtime.evaluate", {
        "expression": "(() => { const h = Array.from(document.querySelectorAll('h3')).find(el => el.innerText.includes('CƠ SỞ CHẾ BIẾN')); if (h) h.scrollIntoView(true); })()"
    })
    time.sleep(0.8)
    ss1 = send_cmd("Page.captureScreenshot", {})
    img_data1 = base64.b64decode(ss1["result"]["data"])
    out1 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "processing_facilities_verified.png")
    with open(out1, "wb") as f:
        f.write(img_data1)
    print("\nSaved processing facilities screenshot to:", out1)

    # Capture Screenshot 2: Profit by product table
    send_cmd("Runtime.evaluate", {
        "expression": "document.getElementById('profit-card').scrollIntoView(true);"
    })
    time.sleep(0.8)
    ss2 = send_cmd("Page.captureScreenshot", {})
    img_data2 = base64.b64decode(ss2["result"]["data"])
    out2 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "profit_table_icons_verified.png")
    with open(out2, "wb") as f:
        f.write(img_data2)
    print("Saved profit table screenshot to:", out2)

finally:
    proc.kill()
