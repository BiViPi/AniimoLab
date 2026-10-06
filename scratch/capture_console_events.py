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
    'about:blank'
])
time.sleep(3.5)

targets = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
target = next(t for t in targets if t.get('type') == 'page')
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

send('Runtime.enable')
send('Log.enable')
send('Page.enable')

# Navigate to localhost:8080
send('Page.navigate', {'url': 'http://localhost:8080/'})

# Listen to events for 6 seconds
logs = []
t0 = time.time()
ws.settimeout(0.5)
while time.time() - t0 < 6:
    try:
        raw = ws.recv()
        data = json.loads(raw)
        method = data.get('method', '')
        if 'exceptionThrown' in method or 'consoleAPICalled' in method or 'entryAdded' in method:
            logs.append(data)
    except Exception:
        pass

for l in logs:
    print(json.dumps(l, ensure_ascii=True))

proc.kill()
