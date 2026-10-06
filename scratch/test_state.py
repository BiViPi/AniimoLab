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

send('Log.enable')
send('Runtime.enable')

# Click optimize
res = send('Runtime.evaluate', {
    'expression': 'document.getElementById("optimize-btn").click();'
})
print('Optimize clicked')

for i in range(15):
    time.sleep(1)
    state = send('Runtime.evaluate', {
        'expression': '''(() => {
            return {
                resultsDisplay: document.getElementById('results-section') ? document.getElementById('results-section').style.display : null,
                aniimoCardDisplay: document.getElementById('aniimo-card') ? document.getElementById('aniimo-card').style.display : null,
                abilityCount: document.querySelectorAll('.ability-col').length,
                errorText: document.getElementById('error-message') ? document.getElementById('error-message').textContent : null,
                progressText: document.getElementById('solve-progress') ? document.getElementById('solve-progress').textContent : null
            };
        })()''',
        'returnByValue': True
    })
    val = state['result']['result']['value']
    print(f"[{i+1}s]", json.dumps(val, ensure_ascii=True))
    if val['abilityCount'] > 0:
        break

proc.kill()
