#!/usr/bin/env python3
"""
Local dev server for the Sayf Elkousy site.

    python3 serve.py                          -> http://localhost:8000/
    python3 serve.py 3000                     -> http://localhost:3000/
    python3 serve.py --base=/Sayf_Website/    -> http://localhost:8000/Sayf_Website/
                                                 (behaves like GitHub Pages)

Default (site at the root):
  * /about, /play are served directly (no redirect); /work serves its
    generated redirect page (→ /#work),
  * any other extension-less path falls back to /index.html (client router decides),
  * missing files with an extension return 404.html with a 404 status.

--base=/<folder>/ emulates a GitHub Pages project site, to test deployment:
  * the site is only served under /<folder>/ ('/' redirects there),
  * a folder without a trailing slash 301-redirects to the slash (like Pages),
  * anything missing gets 404.html with a 404 status (no SPA fallback — like Pages),
  * file names are case-sensitive (like Pages; macOS itself isn't).
No dependencies beyond the Python standard library.
"""
import http.server
import os
import sys
import mimetypes
from io import BytesIO

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = next((int(a) for a in sys.argv[1:] if a.isdigit()), 8000)
BASE = next((a.split("=", 1)[1] for a in sys.argv[1:] if a.startswith("--base=")), "/")
BASE = "/" + BASE.strip("/") + "/" if BASE.strip("/") else "/"
PAGES = BASE != "/"

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/pdf", ".pdf")


def exact_case(path):
    """True if every part of `path` exists with exactly this capitalisation."""
    here = ROOT
    for part in [p for p in path.split("/") if p]:
        try:
            if part not in os.listdir(here):
                return False
        except (NotADirectoryError, FileNotFoundError):
            return False
        here = os.path.join(here, part)
    return True


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _redirect(self, to, code=301):
        self.send_response(code)
        self.send_header("Location", to)
        self.send_header("Content-Length", "0")
        self.end_headers()
        return None

    def _not_found(self):
        self.send_response(404)
        page = os.path.join(ROOT, "404.html")
        body = open(page, "rb").read() if os.path.isfile(page) else b"Not found"
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return BytesIO(body)

    def send_head(self):
        raw, _, query = self.path.partition("?")
        path = raw.split("#", 1)[0]

        if PAGES:
            if path in ("/", BASE.rstrip("/")):
                return self._redirect(BASE, 302)
            if not path.startswith(BASE):
                return self._not_found()
            path = "/" + path[len(BASE):]

        from urllib.parse import unquote
        fs = os.path.join(ROOT, unquote(path).lstrip("/"))
        if PAGES and not exact_case(unquote(path)):
            return self._not_found()  # GitHub Pages is case-sensitive; macOS isn't

        if os.path.isdir(fs):
            index = os.path.join(fs, "index.html")
            if os.path.isfile(index):
                if PAGES and not raw.endswith("/"):
                    return self._redirect(raw + "/" + (("?" + query) if query else ""))
                self.path = path.rstrip("/") + "/index.html" if path != "/" else "/index.html"
                return super().send_head()
        if os.path.isfile(fs):
            self.path = path
            return super().send_head()

        _, ext = os.path.splitext(path)
        if not ext and not PAGES:
            self.path = "/index.html"
            return super().send_head()
        return self._not_found()

    def log_message(self, fmt, *args):
        if "--quiet" not in sys.argv:
            super().log_message(fmt, *args)


if __name__ == "__main__":
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    try:
        httpd = http.server.ThreadingHTTPServer(("", PORT), Handler)
    except OSError as e:
        sys.exit(f"Port {PORT} is already in use ({e.strerror}).\n"
                 f"  • The site may already be running: open http://localhost:{PORT}{BASE}\n"
                 f"  • Or pick another port:            python3 serve.py {PORT + 1}")
    with httpd:
        print(f"Sayf Elkousy — serving {ROOT}\n  → http://localhost:{PORT}{BASE}", flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
