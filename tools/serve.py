#!/usr/bin/env python3
"""Servidor estático de desarrollo sin caché (para ver los cambios al instante)."""
import sys, http.server, functools
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store'); super().end_headers()
    def log_message(self, *a): pass
http.server.ThreadingHTTPServer(('', PORT), functools.partial(H, directory='.')).serve_forever()
