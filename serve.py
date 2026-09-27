#!/usr/bin/env python3
"""
Local dev server for the Sayf Elkousy site.

    python3 serve.py            -> http://localhost:8000
    python3 serve.py 3000       -> http://localhost:3000

Behaves like a production static host with an SPA fallback:
  * /about, /play are served directly (no redirect); /work serves its
    generated redirect page (→ /#work),
  * any other extension-less path falls back to /index.html (client router decides),
  * missing files with an extension return 404.html with a 404 status.
No dependencies beyond the Python standard library.
"""
import http.server
import os
import sys
import mimetypes

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8000)

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/pdf", ".pdf")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def send_head(self):
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        fs = os.path.join(ROOT, path.lstrip("/"))

        if os.path.isdir(fs):
            index = os.path.join(fs, "index.html")
            if os.path.isfile(index):
                self.path = path.rstrip("/") + "/index.html" if path != "/" else "/index.html"
                return super().send_head()
        if os.path.isfile(fs):
            return super().send_head()

        _, ext = os.path.splitext(path)
        if not ext:
            self.path = "/index.html"
            return super().send_head()

        # Real 404 for missing assets.
        self.send_response(404)
        body = open(os.path.join(ROOT, "404.html"), "rb").read() if os.path.isfile(os.path.join(ROOT, "404.html")) else b"Not found"
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        from io import BytesIO
        return BytesIO(body)

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    try:
        httpd = http.server.ThreadingHTTPServer(("", PORT), Handler)
    except OSError as e:
        sys.exit(f"Port {PORT} is already in use ({e.strerror}).\n"
                 f"  • The site may already be running: open http://localhost:{PORT}\n"
                 f"  • Or pick another port:            python3 serve.py {PORT + 1}")
    with httpd:
        print(f"Sayf Elkousy — serving {ROOT}\n  → http://localhost:{PORT}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
