import subprocess
import time
import urllib.request
import json

# Start Chrome with remote debugging
chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
proc = subprocess.Popen([
    chrome_path,
    "--remote-debugging-port=9222",
    "--headless",
    "--disable-gpu",
    "--window-size=1280,2400",
    "http://localhost:8080/"
])

print("Chrome started, waiting 2 seconds...")
time.sleep(2)

try:
    # Query targets
    with urllib.request.urlopen("http://localhost:9222/json") as resp:
        targets = json.loads(resp.read().decode())
    
    ws_url = None
    for t in targets:
        if "localhost:8080" in t.get("url", ""):
            target_id = t["id"]
            break
    print(f"Target found: {target_id}")

    # Use CDP via websocket or simple http endpoint if available
    # Alternatively, use websocket to click optimize-btn
    import urllib.request
    
    # We can use python's websocket-client or simple socket
    import socket
    import base64
    import os

    # Connect to websocket
    import urllib.parse
    ws_url = f"ws://localhost:9222/devtools/page/{target_id}"
    print("Connecting to ws:", ws_url)
except Exception as e:
    print("Error:", e)
finally:
    proc.terminate()
