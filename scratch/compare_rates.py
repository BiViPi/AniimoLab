import subprocess, time, urllib.request, json, websocket

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
        const plan = window.lastPlanResult;
        let sumStreams = 0;
        const streams = (plan.income_streams || []).map(s => {
            const hourly = (s.rate_per_second || 0) * 3600;
            sumStreams += hourly;
            return { name: s.item_name, hourly: hourly };
        });

        const coinReq = (plan.level_up?.requirements || []).find(r => r.name === 'coins');

        return {
            plan_rate_per_second: plan.rate_per_second,
            plan_rate_hourly: (plan.rate_per_second || 0) * 3600,
            sumStreams: sumStreams,
            coinReqPerSec: coinReq?.per_second,
            coinReqHourly: (coinReq?.per_second || 0) * 3600,
            diff: (plan.rate_per_second || 0) * 3600 - (coinReq?.per_second || 0) * 3600,
            streams: streams,
            levelUp: plan.level_up
        };
    })()
    """
    res = send_cmd('Runtime.evaluate', {'expression': script, 'returnByValue': True})
    val = res.get('result', {}).get('result', {}).get('value', {})
    print('Plan rate hourly:', val.get('plan_rate_hourly'))
    print('Sum income streams:', val.get('sumStreams'))
    print('Coin req hourly:', val.get('coinReqHourly'))
    print('Diff:', val.get('diff'))
    print('Level up seconds:', val.get('levelUp', {}).get('seconds'))
    print('Level up requirements:')
    for r in val.get('levelUp', {}).get('requirements', []):
        print(' ', r)
finally:
    try:
        ws.close()
    except:
        pass
    proc.terminate()
