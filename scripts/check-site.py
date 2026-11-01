#!/usr/bin/env python3
"""Static checks for the deployed site.

The site has no build step, so these checks are the cheapest way to catch a
broken reference before it reaches a host: every local link and resource must
resolve, no page may reach a third party, the inline transition rule must match
its CSP hash, and the sitemap must agree with the pages it lists.

Run from the repository root:

    python3 scripts/check-site.py

Exit status is 1 when any check fails. Only the standard library is used so the
CI job needs nothing beyond Python 3.
"""

from __future__ import annotations

import base64
import hashlib
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://pebril.dev"
PAGES = ["index.html", "404.html", *sorted(str(p.relative_to(ROOT)) for p in (ROOT / "journal").rglob("index.html"))]

RESOURCE_ATTRS = {
    "src", "srcset", "poster", "data", "action", "formaction",
    "background", "xlink:href",
}
LINK_RELS_WITH_URL = {
    "stylesheet", "icon", "apple-touch-icon", "preload", "prefetch", "manifest",
    "canonical", "alternate", "describedby", "dns-prefetch", "preconnect",
}
ALLOWED_EXTERNAL_HOSTS = {"pebril.dev", "www.pebril.dev"}

failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)


class PageScanner(HTMLParser):
    def __init__(self, path: Path) -> None:
        super().__init__(convert_charrefs=True)
        self.path = path
        self.local_refs: list[tuple[str, str]] = []
        self.external_resources: list[tuple[str, str]] = []
        self.styles: list[str] = []
        self.csp: str | None = None
        self.icons: list[str] = []
        self._in_style = False

    def handle_starttag(self, tag, attrs):  # noqa: ANN001, D401
        attributes = dict(attrs)
        if tag == "meta" and attributes.get("http-equiv", "").lower() == "content-security-policy":
            self.csp = attributes.get("content", "")
        if tag == "style":
            self._in_style = True
        if tag == "link":
            rels = set(attributes.get("rel", "").lower().split())
            href = attributes.get("href")
            if href:
                if "icon" in rels or "apple-touch-icon" in rels:
                    self.icons.append(href)
                if rels & LINK_RELS_WITH_URL:
                    self._record(href, f"<link rel={attributes.get('rel')}>")

        for attribute in RESOURCE_ATTRS:
            value = attributes.get(attribute)
            if not value:
                continue
            if attribute == "srcset":
                for candidate in value.split(","):
                    url = candidate.strip().split(" ")[0]
                    if url:
                        self._record(url, f"<{tag} srcset>")
            else:
                self._record(value, f"<{tag} {attribute}>")


    def handle_endtag(self, tag):  # noqa: ANN001, D401
        if tag == "style":
            self._in_style = False

    def handle_data(self, data):  # noqa: ANN001, D401
        if self._in_style:
            self.styles.append(data)

    def _record(self, url: str, where: str) -> None:
        url = url.strip()
        if not url or url.startswith("#") or url.startswith("data:") or url.startswith("blob:"):
            return
        parts = urlsplit(url)
        if parts.scheme or parts.netloc:
            if parts.netloc not in ALLOWED_EXTERNAL_HOSTS:
                self.external_resources.append((url, where))
            else:
                self.local_refs.append((parts.path or "/", where))
            return
        self.local_refs.append((parts.path, where))


def resolve(page: Path, path: str) -> Path:
    if path.startswith("/"):
        target = ROOT / path.lstrip("/")
    else:
        target = (page.parent / path).resolve()
    if path.endswith("/") or target.is_dir():
        return target / "index.html"
    return target


def check_pages() -> None:
    for relative in PAGES:
        page_path = ROOT / relative
        if not page_path.exists():
            fail(f"{relative}: listed page is missing")
            continue
        scanner = PageScanner(page_path)
        scanner.feed(page_path.read_text(encoding="utf-8"))
        for url, where in scanner.local_refs:
            target = resolve(page_path, url)
            if not target.exists():
                fail(f"{relative}: {where} -> {url} does not resolve ({target.relative_to(ROOT)})")
        for url, where in scanner.external_resources:
            fail(f"{relative}: {where} reaches {url}")

        source = page_path.read_text(encoding="utf-8")
        if 'http-equiv="refresh"' in source:
            # Hugo writes a language alias page for /journal/zh/; it only redirects.
            continue
        if scanner.csp is None:
            fail(f"{relative}: no Content-Security-Policy meta")
        else:
            match = re.search(r"style-src ([^;]+)", scanner.csp)
            if not match:
                fail(f"{relative}: CSP has no style-src")
            elif scanner.styles:
                digest = hashlib.sha256("".join(scanner.styles).encode("utf-8")).digest()
                expected = "sha256-" + base64.b64encode(digest).decode("ascii")
                if expected not in match.group(1):
                    fail(f"{relative}: inline <style> hash is {expected}, not declared in CSP")

        if "/journal/" not in f"/{relative}":
            if "favicon.ico" not in " ".join(scanner.icons):
                fail(f"{relative}: no favicon.ico link")
            for icon in ("/favicon.ico", "/assets/icon.svg", "/assets/icon-180.png"):
                if not (ROOT / icon.lstrip("/")).exists():
                    fail(f"{relative}: icon file {icon} is missing")


def check_stylesheets() -> None:
    pattern = re.compile(r"url\(\s*['\"]?([^'\")]+)['\"]?\s*\)")
    for sheet in [*sorted((ROOT / "src").glob("*.css")), *sorted((ROOT / "assets" / "fonts").glob("*.css")), ROOT / "journal" / "journal.css"]:
        for url in pattern.findall(sheet.read_text(encoding="utf-8")):
            if url.startswith("data:") or urlsplit(url).scheme:
                if urlsplit(url).netloc and urlsplit(url).netloc not in ALLOWED_EXTERNAL_HOSTS:
                    fail(f"{sheet.relative_to(ROOT)}: external resource {url}")
                continue
            target = (sheet.parent / url).resolve()
            if not target.exists():
                fail(f"{sheet.relative_to(ROOT)}: url({url}) does not resolve")


def check_sitemap() -> None:
    sitemap = (ROOT / "sitemap.xml").read_text(encoding="utf-8")
    urls = re.findall(r"<loc>([^<]+)</loc>", sitemap)
    if not urls:
        fail("sitemap.xml: no <loc> entries")
    for url in urls:
        if not url.startswith(SITE):
            fail(f"sitemap.xml: {url} is not on {SITE}")
            continue
        path = urlsplit(url).path
        target = resolve(ROOT / "index.html", path)
        if not target.exists():
            fail(f"sitemap.xml: {url} has no page")
            continue
        body = target.read_text(encoding="utf-8")
        canonical = re.search(r'<link rel="canonical" href="([^"]+)"', body)
        if not canonical:
            fail(f"{target.relative_to(ROOT)}: no canonical link")
        elif canonical.group(1) != url:
            fail(f"{target.relative_to(ROOT)}: canonical {canonical.group(1)} != sitemap {url}")
    for forbidden in ("lastmod", "priority", "changefreq"):
        if forbidden in sitemap:
            fail(f"sitemap.xml: unexpected {forbidden}")


def check_robots_and_llms() -> None:
    robots = (ROOT / "robots.txt").read_text(encoding="utf-8")
    if f"Sitemap: {SITE}/sitemap.xml" not in robots:
        fail("robots.txt: does not point at the sitemap")
    llms = (ROOT / "llms.txt").read_text(encoding="utf-8")
    if f"{SITE}/journal/" not in llms:
        fail("llms.txt: does not list the journal")


def main() -> int:
    check_pages()
    check_stylesheets()
    check_sitemap()
    check_robots_and_llms()
    if failures:
        print(f"{len(failures)} problem(s):", file=sys.stderr)
        for message in failures:
            print(f"  - {message}", file=sys.stderr)
        return 1
    print(f"checked {len(PAGES)} pages, stylesheets, sitemap, robots.txt and llms.txt: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())
