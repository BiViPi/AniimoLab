import http.server
import socket
import sys

class DualStackServer(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except Exception as e:
            print("Dual-stack option failed:", e)
        super().server_bind()

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Disable caching during local development
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

Handler.extensions_map.update({
    '.wasm': 'application/wasm',
    '.js': 'text/javascript',
})

port = 8080
try:
    with DualStackServer(("", port), Handler) as httpd:
        print(f"Serving on port {port} (dual-stack IPv4/IPv6)...", flush=True)
        httpd.serve_forever()
except Exception as e:
    print(f"Fallback to IPv4 due to: {e}", flush=True)
    with http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler) as httpd:
        print(f"Serving on port {port} (IPv4 0.0.0.0)...", flush=True)
        httpd.serve_forever()
