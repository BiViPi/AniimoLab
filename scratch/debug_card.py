import subprocess
import time
import urllib.request
import json
import websocket

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
time.sleep(3.5)

targets = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
target = next(t for t in targets if 'localhost:8080' in t.get('url', ''))
ws = websocket.create_connection(target['webSocketDebuggerUrl'])

msg_id = 0
def send(method, params=None):
    global msg_id
    msg_id += 1
    ws.send(json.dumps({'id': msg_id, 'method': method, 'params': params or {}}))
    while True:
        r = json.loads(ws.recv())
        if r.get('id') == msg_id:
            return r

for i in range(15):
    time.sleep(1)
    chk = send('Runtime.evaluate', {'expression': '!!window.wasmReady', 'returnByValue': True})
    val = chk.get('result', {}).get('result', {}).get('value')
    if val:
        print(f'WASM ready in {i+1}s')
        break

send('Runtime.evaluate', {'expression': 'document.getElementById("optimize-btn").click();'})
print('Optimize clicked, waiting 10s...')
time.sleep(10)

info = send('Runtime.evaluate', {
    'expression': '''(() => {
        const rc = document.getElementById('results-content');
        const ac = document.getElementById('aniimo-card');
        const abStrip = document.getElementById('aniimo-abilities');
        const resultsSec = document.getElementById('results-section');
        return {
            resultsSecDisplay: resultsSec ? resultsSec.style.display : null,
            rcDisplay: rc ? rc.style.display : null,
            acDisplay: ac ? ac.style.display : null,
            acRect: ac ? { x: ac.getBoundingClientRect().x, y: ac.getBoundingClientRect().y, w: ac.getBoundingClientRect().width, h: ac.getBoundingClientRect().height } : null,
            abCount: abStrip ? abStrip.children.length : 0,
            acText: ac ? ac.innerText.slice(0, 150) : null
        };
    })()''',
    'returnByValue': True
})
val = info.get('result', {}).get('result', {}).get('value')
print('Card info:', json.dumps(val, ensure_ascii=True))
proc.kill()
