# Buarum Notion OS Setup

This folder contains the technical setup package for creating the Buarum Notion OS MVP databases through the Notion API.

## Created container page

`Buarum OS`:
https://www.notion.so/3657222f634881f0b757fa4d0e9ace36

## What this setup creates

MVP databases:

1. Tasks
2. Projects
3. Integration Inbox
4. Leads
5. Clients
6. Deals / Orders
7. Follow-ups
8. Products / SKU
9. Gemstones
10. Production Orders
11. Content Calendar
12. SOP
13. Automation Logs
14. AI Agents

## What Pavel needs to confirm

1. Open Notion integrations:
   https://www.notion.so/my-integrations
2. Create a new internal integration:
   - Name: `Buarum OS Codex`
   - Workspace: your Buarum workspace
   - Capabilities: Read content, Update content, Insert content
3. Copy the integration token.
4. Open the Notion page `Buarum OS`.
5. Click `...` → `Connections` / `Add connections`.
6. Add `Buarum OS Codex`.
7. Put the token into `notion_os/.env` locally:

```bash
cp notion_os/.env.example notion_os/.env
```

Then replace `secret_xxx` with the real token.

Do not paste the token into Notion pages or public chat.

## Run

```bash
python3 notion_os/setup_notion_os.py
```

The script is idempotent by database title: it checks existing child databases under the parent page and skips databases that already exist.

## Current constraint

This script creates core database schemas. Advanced Notion views and relation properties are partially limited because relation targets must exist first. The setup script handles this in two passes where practical.

