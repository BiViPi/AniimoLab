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

    # Select RV 14 (target RV 15) like user's screenshot
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const homeLevelSel = document.getElementById('home-level');
            if (homeLevelSel) {
                homeLevelSel.value = '14';
                homeLevelSel.dispatchEvent(new Event('change'));
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

    # 1. Check for skip-row buttons (dấu X)
    res_skip = send_cmd("Runtime.evaluate", {
        "expression": "document.querySelectorAll('.skip-row').length",
        "returnByValue": True
    })
    skip_count = res_skip.get("result", {}).get("result", {}).get("value", 0)
    print(f"Skip-row button count (should be 0): {skip_count}")

    # 2. Check facility icons in processing table
    script_fac = """
    (() => {
        const rows = Array.from(document.querySelectorAll('.facility-plan-table tbody tr'));
        return rows.map(r => {
            const img = r.querySelector('.facility-cell img');
            const fac = r.querySelector('.facility-name-text')?.innerText || '';
            const itemImg = r.querySelector('.item-cell img');
            const item = r.querySelector('.item-name-text')?.innerText || '';
            return {
                facility: fac,
                facSrc: img ? img.src.split('/').pop() : '',
                item: item,
                itemSrc: itemImg ? itemImg.src.split('/').pop() : ''
            };
        });
    })()
    """
    res_fac = send_cmd("Runtime.evaluate", {"expression": script_fac, "returnByValue": True})
    fac_data = res_fac.get("result", {}).get("result", {}).get("value", [])
    print(f"\nTotal rows in plan: {len(fac_data)}")
    for f in fac_data:
        if any(proc in f['facility'] for proc in ['Bếp lửa', 'Thùng ủ', 'Cối xay', 'Bàn chế tạo', 'Khung dệt', 'Máy sấy', 'Nồi hầm']):
            print(f"  [PROCESSING] {f['facility']:25} (icon: {f['facSrc']:35}) -> {f['item']} ({f['itemSrc']})")

    # 3. Check profit table product & facility icons
    script_prof = """
    (() => {
        const rows = Array.from(document.querySelectorAll('#profit-breakdown tbody tr'));
        return rows.map(r => {
            const prodImg = r.querySelector('td:nth-child(1) img');
            const prodName = r.querySelector('td:nth-child(1) .item-name-text')?.innerText || '';
            const facImg = r.querySelector('td:nth-child(2) img');
            const facName = r.querySelector('td:nth-child(2) .facility-name-text')?.innerText || '';
            return {
                product: prodName,
                prodSrc: prodImg ? prodImg.src.split('/').pop() : '',
                facility: facName,
                facSrc: facImg ? facImg.src.split('/').pop() : ''
            };
        });
    })()
    """
    res_prof = send_cmd("Runtime.evaluate", {"expression": script_prof, "returnByValue": True})
    prof_data = res_prof.get("result", {}).get("result", {}).get("value", [])
    print(f"\nTotal rows in profit table: {len(prof_data)}")
    for p in prof_data:
        print(f"  Product: {p['product']:25} (icon: {p['prodSrc']:30}) | Facility: {p['facility']:25} (icon: {p['facSrc']})")

    # Capture Screenshot 1: Processing Facilities
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const h = Array.from(document.querySelectorAll('h3')).find(el => el.innerText.includes('CƠ SỞ CHẾ BIẾN'));
            if (h) {
                h.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        })()
        """
    })
    time.sleep(0.8)
    ss1 = send_cmd("Page.captureScreenshot", {})
    img_data1 = base64.b64decode(ss1["result"]["data"])
    out1 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "processing_facilities_rv14.png")
    with open(out1, "wb") as f:
        f.write(img_data1)
    print("\nSaved processing facilities screenshot to:", out1)

    # Capture Screenshot 2: Profit by product table
    send_cmd("Runtime.evaluate", {
        "expression": """
        (() => {
            const card = document.getElementById('profit-card');
            if (card) {
                card.scrollIntoView({ block: 'start', behavior: 'instant' });
            }
        })()
        """
    })
    time.sleep(0.8)
    ss2 = send_cmd("Page.captureScreenshot", {})
    img_data2 = base64.b64decode(ss2["result"]["data"])
    out2 = os.path.join(r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage", "profit_table_rv14.png")
    with open(out2, "wb") as f:
        f.write(img_data2)
    print("Saved profit table screenshot to:", out2)

finally:
    proc.kill()
