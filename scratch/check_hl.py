import websocket, json, urllib.request

try:
    targets = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
    target = next(t for t in targets if "localhost:8080" in t.get("url", ""))
    ws = websocket.create_connection(target["webSocketDebuggerUrl"])
    ws.send(json.dumps({'id': 1, 'method': 'Runtime.evaluate', 'params': {'expression': 'document.getElementById("home-level").value', 'returnByValue': True}}))
    res = json.loads(ws.recv())
    print("CURRENT HOME LEVEL VALUE:", res.get("result", {}).get("result", {}).get("value"))
except Exception as e:
    print("Error:", e)
