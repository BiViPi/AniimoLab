from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import functools
import socket
import os
import sys

web_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web')

class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class DualStackServer(ThreadingHTTPServer):
    address_family = socket.AF_INET6

    def server_bind(self):
        self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        super().server_bind()

port = 8000
handler = functools.partial(NoCacheHandler, directory=web_dir)
httpd = DualStackServer(('::', port), handler)
print(f"Serving HTTP on port {port} with directory '{web_dir}' (dual-stack, no-cache)...", flush=True)
httpd.serve_forever()
