#!/usr/bin/env python3
"""Add MVP relations and seed records to Buarum Notion OS.

This script is additive and non-destructive. It can be rerun safely enough for
schema updates; seed pages are skipped by title when they already exist.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
ENV_PATH = ROOT / ".env"
IDS_PATH = ROOT / "database_ids.md"
NOTION_VERSION = "2022-06-28"


def load_env() -> None:
    if not ENV_PATH.exists():
        raise SystemExit("Missing notion_os/.env")
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def load_ids() -> dict[str, str]:
    text = IDS_PATH.read_text(encoding="utf-8")
    ids = {}
    for name, dbid in re.findall(r"- (.*?): `([^`]+)`", text):
        ids[name] = dbid
    if not ids:
        raise SystemExit("No database IDs found.")
    return ids


def notion_request(method: str, path: str, payload: dict | None = None) -> dict:
    token = os.environ["NOTION_TOKEN"]
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
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


def patch_database(db_id: str, properties: dict) -> None:
    notion_request("PATCH", f"/databases/{db_id}", {"properties": properties})


def get_database(db_id: str) -> dict:
    return notion_request("GET", f"/databases/{db_id}")


def relation(target_db_id: str) -> dict:
    return {"relation": {"database_id": target_db_id, "type": "single_property", "single_property": {}}}


def rollup(relation_property_name: str, rollup_property_name: str) -> dict:
    return {
        "rollup": {
            "relation_property_name": relation_property_name,
            "rollup_property_name": rollup_property_name,
            "function": "show_original",
        }
    }


def title_prop(db: dict) -> str:
    for name, spec in db["properties"].items():
        if spec["type"] == "title":
            return name
    raise RuntimeError("No title property")


def rich(text: str) -> list[dict]:
    return [{"type": "text", "text": {"content": text[:1900]}}]


def title(text: str) -> list[dict]:
    return [{"type": "text", "text": {"content": text[:200]}}]


def prop_value(kind: str, value):
    if value is None:
        return None
    if kind == "title":
        return {"title": title(str(value))}
    if kind == "rich_text":
        return {"rich_text": rich(str(value))}
    if kind == "select":
        return {"select": {"name": str(value)}}
    if kind == "checkbox":
        return {"checkbox": bool(value)}
    if kind == "date":
        return {"date": {"start": str(value)}}
    if kind == "number":
        return {"number": value}
    if kind == "url":
        return {"url": str(value)}
    raise ValueError(kind)


def query_by_title(db_id: str, title_property: str, page_title: str) -> list[dict]:
    payload = {
        "filter": {
            "property": title_property,
            "title": {"equals": page_title},
        },
        "page_size": 1,
    }
    return notion_request("POST", f"/databases/{db_id}/query", payload).get("results", [])


def create_page(db_id: str, db_schema: dict, values: dict, children: list[dict] | None = None) -> str | None:
    title_name = title_prop(db_schema)
    page_title = values.get(title_name)
    if page_title and query_by_title(db_id, title_name, page_title):
        print(f"SKIP page {page_title}")
        return None

    props = {}
    for name, value in values.items():
        if name not in db_schema["properties"]:
            continue
        kind = db_schema["properties"][name]["type"]
        converted = prop_value(kind, value)
        if converted is not None:
            props[name] = converted

    payload = {"parent": {"database_id": db_id}, "properties": props}
    if children:
        payload["children"] = children
    result = notion_request("POST", "/pages", payload)
    print(f"CREATE page {page_title}")
    time.sleep(0.25)
    return result.get("id")


def paragraph(text: str) -> dict:
    return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": rich(text)}}


def heading(text: str, level: int = 2) -> dict:
    typ = f"heading_{level}"
    return {"object": "block", "type": typ, typ: {"rich_text": rich(text)}}


def main() -> int:
    load_env()
    ids = load_ids()

    print("Adding relation properties...")
    relation_updates = {
        "Tasks": {
            "Project": relation(ids["Projects"]),
            "Related Lead": relation(ids["Leads"]),
            "Related Client": relation(ids["Clients"]),
            "Related Deal": relation(ids["Deals / Orders"]),
            "Related SKU": relation(ids["Products / SKU"]),
            "Related Content": relation(ids["Content Calendar"]),
            "Related SOP": relation(ids["SOP"]),
            "AI Agent": relation(ids["AI Agents"]),
        },
        "Projects": {
            "Related tasks": relation(ids["Tasks"]),
        },
        "Integration Inbox": {
            "Related lead": relation(ids["Leads"]),
        },
        "Leads": {
            "Related client": relation(ids["Clients"]),
            "Related deal": relation(ids["Deals / Orders"]),
        },
        "Clients": {
            "Purchased products": relation(ids["Products / SKU"]),
            "Active deals": relation(ids["Deals / Orders"]),
        },
        "Deals / Orders": {
            "Client": relation(ids["Clients"]),
            "Related SKU": relation(ids["Products / SKU"]),
            "Related production order": relation(ids["Production Orders"]),
        },
        "Follow-ups": {
            "Client / lead": relation(ids["Clients"]),
            "Related deal": relation(ids["Deals / Orders"]),
        },
        "Products / SKU": {
            "Related Gemstone": relation(ids["Gemstones"]),
            "Production order": relation(ids["Production Orders"]),
            "Client / Deal": relation(ids["Deals / Orders"]),
        },
        "Gemstones": {
            "Related SKU": relation(ids["Products / SKU"]),
            "Related content": relation(ids["Content Calendar"]),
        },
        "Production Orders": {
            "Related SKU": relation(ids["Products / SKU"]),
            "Related client / deal": relation(ids["Deals / Orders"]),
        },
        "Content Calendar": {
            "Related SKU": relation(ids["Products / SKU"]),
            "Related gemstone": relation(ids["Gemstones"]),
        },
        "SOP": {
            "Related tasks": relation(ids["Tasks"]),
        },
        "AI Agents": {
            "Related SOP": relation(ids["SOP"]),
            "Related tasks": relation(ids["Tasks"]),
        },
    }

    for db_name, props in relation_updates.items():
        print(f"PATCH {db_name}")
        patch_database(ids[db_name], props)
        time.sleep(0.35)

    print("Fetching updated schemas...")
    schemas = {name: get_database(dbid) for name, dbid in ids.items()}

    print("Seeding projects...")
    projects = [
        ("Notion OS MVP", "AI", "In progress", "Create the first working operating system for Buarum."),
        ("CRM-lite", "CRM", "Planned", "Collect all leads, clients, deals and follow-ups in one system."),
        ("Website → Lead Capture", "Website", "Planned", "Route Tilda forms into Integration Inbox and Leads."),
        ("Telegram Daily SMM System", "Marketing", "Planned", "Keep daily lunar calendar and review-based content workflow stable."),
        ("Blog / SEO Funnel", "Marketing", "Planned", "Restart blog as a structured SEO funnel."),
        ("Product Catalog System", "Product", "Planned", "Create a clear SKU and gemstone database for catalog and production."),
        ("Production Tracker", "Production", "Planned", "Track jewelry production from brief to delivery."),
    ]
    for name, area, status, goal in projects:
        create_page(ids["Projects"], schemas["Projects"], {
            "Project name": name,
            "Area": area,
            "Status": status,
            "Goal": goal,
            "Success criteria": "Project has clear tasks, owner, status and first deliverable.",
        })

    print("Seeding AI agents...")
    agents = [
        ("Brand Strategist", "Keeps Buarum decisions aligned with positioning and tone.", "Brand", "Active"),
        ("SEO Writer", "Creates SEO briefs, articles and metadata.", "SEO", "Active"),
        ("Product Description Writer", "Writes SKU, gemstone and product descriptions.", "Product", "Testing"),
        ("CRM Assistant", "Summarizes leads and drafts follow-up suggestions.", "CRM", "Testing"),
        ("Content Planner", "Builds content plans across Telegram, blog, Instagram and YouTube.", "Content", "Active"),
        ("Market Research Analyst", "Researches competitors, markets, prices and trends.", "Research", "Testing"),
        ("Production Coordinator", "Tracks production stages and blockers.", "Production", "Testing"),
        ("Codex Technical Agent", "Builds integrations, scripts, Notion API setup and automations.", "Technical", "Active"),
    ]
    for name, role, area, status in agents:
        create_page(ids["AI Agents"], schemas["AI Agents"], {
            "Agent name": name,
            "Role": role,
            "Area": area,
            "Status": status,
            "Input needed": "Task context, source material, constraints, approval rules.",
            "Output format": "Structured result with next actions and blockers.",
        })

    print("Seeding SOP...")
    sops = [
        ("How to process a new lead", "CRM"),
        ("How to create a new SKU", "Product"),
        ("How to enter a new gemstone", "Product"),
        ("How to create a production order", "Production"),
        ("How to send a follow-up", "CRM"),
        ("How to create a Telegram post", "Marketing"),
        ("How to publish a blog article", "Marketing"),
        ("How to run weekly review", "AI"),
        ("How to use AI Agents", "AI"),
    ]
    for name, area in sops:
        create_page(ids["SOP"], schemas["SOP"], {
            "SOP name": name,
            "Area": area,
            "Status": "Draft",
            "Access level": "Team",
            "Checklist": "Draft checklist needed.",
        }, [heading("Purpose"), paragraph("Draft SOP. Needs owner review."), heading("Checklist"), paragraph("To be filled during implementation.")])

    print("Seeding first tasks...")
    tasks = [
        ("Create CEO Dashboard v1", "CEO", "P1 High", "In progress", "CEO Dashboard exists and links to core databases."),
        ("Review Notion OS MVP databases", "AI", "P1 High", "Review", "Pavel confirms MVP structure or requests changes."),
        ("Import first 10 products/SKU", "Product", "P1 High", "To do", "At least 10 real or sample products are entered."),
        ("Import first gemstones", "Product", "P1 High", "To do", "Gemstone database has real entries for available stones."),
        ("Map current Tilda forms", "Website", "P1 High", "To do", "All Tilda forms and destinations are documented."),
        ("Define lead data policy", "CRM", "P1 High", "To do", "Clear decision on client and natal data storage."),
        ("Create first CRM manual entry workflow", "CRM", "P1 High", "To do", "Manual lead entry works from Integration Inbox to Leads."),
        ("Document Telegram bot Google Sheet logic", "Automation", "P2 Normal", "To do", "Columns, timezone and script owner are documented."),
        ("Create Blog / SEO first article workflow", "Marketing", "P2 Normal", "To do", "Article process exists from idea to published URL."),
    ]
    for name, area, priority, status, acceptance in tasks:
        create_page(ids["Tasks"], schemas["Tasks"], {
            "Task name": name,
            "Area": area,
            "Priority": priority,
            "Status": status,
            "Codex needed": True,
            "Acceptance criteria": acceptance,
            "Automation status": "Manual",
        })

    print("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

