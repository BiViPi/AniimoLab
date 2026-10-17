import http.server
import socket
import sys
import os

class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception as e:
            print("Dual-stack option failed:", e)
        super().server_bind()

class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.send_response(302)
            self.send_header('Location', '/web/index.html')
            self.end_headers()
            return
        super().do_GET()

    def end_headers(self):
        # Disable caching during local development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

Handler.extensions_map.update({
    '.wasm': 'application/wasm',
    '.js': 'text/javascript',
})

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8888
try:
    httpd = DualStackServer(("::", port), Handler)
    print(f"Serving on port {port} (DualStack IPv4/IPv6, localhost, 127.0.0.1)...", flush=True)
except Exception as e:
    print(f"DualStack bind failed ({e}), falling back to standard IPv4 0.0.0.0...", flush=True)
    httpd = http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler)

with httpd:
    httpd.serve_forever()
