import subprocess, time, urllib.request, json, websocket, base64

subprocess.run(['taskkill', '/F', '/IM', 'chrome.exe'], capture_output=True)
time.sleep(1)

chrome_path = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
proc = subprocess.Popen([
    chrome_path,
    '--remote-debugging-port=9222',
    '--remote-allow-origins=*',
    '--headless',
    '--disable-gpu',
    '--window-size=1400,1200',
    'http://localhost:8080/'
])
time.sleep(3)

try:
    targets = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
    target = next(t for t in targets if 'localhost:8080' in t.get('url', ''))
    ws = websocket.create_connection(target['webSocketDebuggerUrl'])

    msg_id = 0
    def send_cmd(method, params=None):
        global msg_id
        msg_id += 1
        payload = {'id': msg_id, 'method': method, 'params': params or {}}
        ws.send(json.dumps(payload))
        while True:
            res = json.loads(ws.recv())
            if res.get('id') == msg_id:
                return res

    for i in range(20):
        time.sleep(1)
        chk = send_cmd('Runtime.evaluate', {'expression': '!!window.wasmReady', 'returnByValue': True})
        if chk.get('result', {}).get('result', {}).get('value'):
            break

    # Setup exactly as user: RV 14, no e-mode, harvest moon festival ON, special recipe ginseng porridge
    setup_code = """
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
    send_cmd('Runtime.evaluate', {'expression': setup_code})
    time.sleep(0.5)

    send_cmd('Runtime.evaluate', {'expression': 'document.getElementById("optimize-btn").click();'})

    for i in range(35):
        time.sleep(1)
        chk = send_cmd('Runtime.evaluate', {
            'expression': 'document.querySelectorAll("#profit-breakdown tbody tr").length > 0',
            'returnByValue': True
        })
        if chk.get('result', {}).get('result', {}).get('value'):
            break

    time.sleep(1.5)

    script = """
    (() => {
        const levelUpRows = Array.from(document.querySelectorAll('.level-up-lines tbody tr')).map(tr => {
            return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim());
        });

        const insightsText = document.getElementById('insights-content')?.innerText;

        const breakdownTotal = document.querySelector('#profit-breakdown tfoot tr td:last-child')?.innerText
            || Array.from(document.querySelectorAll('#profit-breakdown tbody tr')).map(r => r.querySelectorAll('td')[3]?.innerText);

        return {
            levelUpRows: levelUpRows,
            insightsText: insightsText
        };
    })()
    """
    res = send_cmd('Runtime.evaluate', {'expression': script, 'returnByValue': True})
    val = res.get('result', {}).get('result', {}).get('value', {})
    print('LEVEL UP ROWS:')
    for r in val.get('levelUpRows', []):
        print(' ', r)
    print('\nINSIGHTS TEXT:')
    print(val.get('insightsText'))

    # Capture screenshot of level-up card and insights card
    shot = send_cmd("Page.captureScreenshot", {"format": "png"})
    img_data = base64.b64decode(shot["result"]["data"])
    out_path = r"C:\Users\Phu Bui\.gemini\antigravity-ide\brain\c5223793-1dab-4234-83f0-76366288ce5a\.tempmediaStorage\verified_rate_sync.png"
    with open(out_path, "wb") as f:
        f.write(img_data)
    print(f"Full page screenshot saved to {out_path}")

finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
