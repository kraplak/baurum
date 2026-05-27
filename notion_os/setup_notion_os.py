#!/usr/bin/env python3
"""Create the Buarum Notion OS MVP databases.

Requirements:
- Python 3.9+
- NOTION_TOKEN and NOTION_PARENT_PAGE_ID in notion_os/.env or environment

This script intentionally avoids deleting or overwriting anything. It checks
existing child databases by title and skips databases that already exist.
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCHEMA_PATH = ROOT / "schema.json"
ENV_PATH = ROOT / ".env"
NOTION_VERSION = "2022-06-28"


def load_env() -> None:
    if not ENV_PATH.exists():
        return
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def notion_request(method: str, path: str, payload: dict | None = None) -> dict:
    token = os.environ.get("NOTION_TOKEN")
    if not token:
        raise SystemExit("Missing NOTION_TOKEN. Create notion_os/.env from .env.example.")

    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(
        f"https://api.notion.com/v1{path}",
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Notion API error {e.code} for {method} {path}: {body}") from e


def title_text(title_obj: list[dict]) -> str:
    return "".join(part.get("plain_text", "") for part in title_obj or [])


def list_child_databases(parent_page_id: str) -> dict[str, str]:
    existing: dict[str, str] = {}
    cursor = None
    while True:
        qs = f"?page_size=100"
        if cursor:
            qs += f"&start_cursor={cursor}"
        result = notion_request("GET", f"/blocks/{parent_page_id}/children{qs}")
        for item in result.get("results", []):
            if item.get("type") == "child_database":
                title = item.get("child_database", {}).get("title", "")
                existing[title] = item["id"]
        if not result.get("has_more"):
            break
        cursor = result.get("next_cursor")
    return existing


def property_payload(spec: dict) -> dict:
    typ = spec["type"]
    if typ == "title":
        return {"title": {}}
    if typ == "rich_text":
        return {"rich_text": {}}
    if typ == "number":
        return {"number": {"format": "number"}}
    if typ == "select":
        return {"select": {"options": [{"name": name} for name in spec.get("options", [])]}}
    if typ == "multi_select":
        return {"multi_select": {"options": [{"name": name} for name in spec.get("options", [])]}}
    if typ == "date":
        return {"date": {}}
    if typ == "people":
        return {"people": {}}
    if typ == "checkbox":
        return {"checkbox": {}}
    if typ == "url":
        return {"url": {}}
    if typ == "email":
        return {"email": {}}
    if typ == "phone_number":
        return {"phone_number": {}}
    if typ == "created_time":
        return {"created_time": {}}
    if typ == "last_edited_time":
        return {"last_edited_time": {}}
    raise ValueError(f"Unsupported property type: {typ}")


def create_database(parent_page_id: str, db: dict) -> dict:
    properties = {name: property_payload(spec) for name, spec in db["properties"].items()}
    payload = {
        "parent": {"type": "page_id", "page_id": parent_page_id},
        "icon": {"type": "emoji", "emoji": db.get("icon", "🧩")},
        "title": [{"type": "text", "text": {"content": db["name"]}}],
        "properties": properties,
    }
    return notion_request("POST", "/databases", payload)


def main() -> int:
    load_env()
    schema = json.loads(SCHEMA_PATH.read_text(encoding="utf-8"))
    parent_page_id = os.environ.get("NOTION_PARENT_PAGE_ID") or schema["parent_page_id"]
    parent_page_id = parent_page_id.replace("-", "")

    print(f"Parent page: {parent_page_id}")
    existing = list_child_databases(parent_page_id)
    print(f"Existing child databases: {', '.join(existing) if existing else 'none'}")

    created = []
    skipped = []
    for db in schema["databases"]:
        name = db["name"]
        if name in existing:
            skipped.append(name)
            print(f"SKIP  {name}")
            continue
        print(f"CREATE {name}")
        result = create_database(parent_page_id, db)
        created.append((name, result.get("id")))
        time.sleep(0.4)

    print("\nDone.")
    print(f"Created: {len(created)}")
    for name, db_id in created:
        print(f"  - {name}: {db_id}")
    print(f"Skipped: {len(skipped)}")
    for name in skipped:
        print(f"  - {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

