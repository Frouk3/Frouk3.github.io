#!/usr/bin/env python3
"""Generate blog/posts.json by scanning blog/*.html.

Writes JSON array of objects with keys: title, href, preview, mtime
"""
import os
import re
import json
from pathlib import Path


def extract_title(html: str):
    if not html:
        return None
    m = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    m = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
    if m:
        return re.sub(r"<[^>]+>", "", m.group(1)).strip()
    return None


def extract_preview(html: str):
    if not html:
        return None
    # meta og:image
    m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r'<meta[^>]+name=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html, re.I)
    if m:
        return m.group(1).strip()
    # first img
    m = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html, re.I)
    if m:
        return m.group(1).strip()
    return None


def main():
    repo_root = Path(__file__).resolve().parent.parent
    blog_dir = repo_root / 'blog'
    out_file = blog_dir / 'posts.json'

    if not blog_dir.exists():
        print('blog directory not found:', blog_dir)
        return 1

    items = []
    for entry in blog_dir.iterdir():
        if entry.is_file() and entry.suffix.lower() == '.html':
            try:
                html = entry.read_text(encoding='utf-8', errors='ignore')[:200000]
            except Exception:
                html = ''
            title = extract_title(html) or entry.name
            preview = extract_preview(html) or './assets/not-found.svg'
            mtime = entry.stat().st_mtime
            # href relative to blog folder
            href = './blog/' + entry.name
            items.append({'title': title, 'href': href, 'preview': preview, 'mtime': mtime})

    items.sort(key=lambda x: x.get('mtime', 0), reverse=True)

    with out_file.open('w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f'Generated {out_file} ({len(items)} entries)')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
