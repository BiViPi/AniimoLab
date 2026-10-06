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

# Wait 5s and collect all logs
time.sleep(5)

# Evaluate console errors if any
res = send('Runtime.evaluate', {
    'expression': '''(() => {
        return {
            wasmReady: !!window.wasmReady,
            versionText: document.getElementById('version') ? document.getElementById('version').textContent : null,
            errorMsg: document.getElementById('error-message') ? document.getElementById('error-message').textContent : null
        };
    })()''',
    'returnByValue': True
})
print('Initial Check:', json.dumps(res.get('result', {}).get('result', {}).get('value', {}), ensure_ascii=True))

proc.kill()
