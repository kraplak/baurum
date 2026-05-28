# BAURUM Agent Console

Deployable static MVP for the BAURUM workflow control center.

## Purpose

This app is the future visual interface for managing agent chains:

- create and run workflows;
- review source cards and topic candidates;
- approve, revise, reject, or park outputs;
- view drafts, visuals, publishing queue, and run logs;
- gradually add new workflows as modular process definitions.

The important architectural rule: workflows are not hardcoded pages. A workflow
is a versioned definition with stages, agents, artifact types, approval points,
and integrations. The console renders that definition.

## Current Interactive Preview

`static-preview.html` now contains a front-end MVP cycle:

- renders 10 source-based topic candidates;
- lets Pavel select / unselect topics;
- opens each generated article in a modal;
- runs selected topics through workflow stages;
- supports image-generation placeholder, rewrite request, and approval to queue.
- saves preferred sources in browser `localStorage`.

This can be deployed as a public static site. The current persistence is
per-browser only. The next implementation step is shared persistence:
Supabase/Postgres or a server-side Google Sheets/Notion adapter.

## MVP Architecture

- Vercel / Next.js: interface and API routes.
- Supabase / Postgres: workflows, runs, artifacts, approvals, users.
- GitHub: versioned prompts, schemas, workflow YAML.
- Notion: editorial calendar mirror.
- Google Sheets: publishing queue for Telegram scripts.
- Telegram bot: quick approval notifications.

## Future Database Entities

- `workflows`
- `workflow_versions`
- `agents`
- `agent_versions`
- `runs`
- `run_steps`
- `source_cards`
- `topic_candidates`
- `artifacts`
- `approvals`
- `integrations`
- `publishing_targets`
- `publishing_queue`
- `activity_log`

See `ARCHITECTURE.md` for the extensible module model.

## Deploy

The static MVP can be deployed by Vercel from this folder. `vercel.json` disables
the install/build step and serves the folder as static output.

## Run Locally

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173/static-preview.html
```

## Publishing Queue

The production publishing path is:

```text
Agent Console -> Google Sheets Content Publishing Queue -> Apps Script -> Telegram
```

In the UI, `Опубликовать` means:

- final draft is approved;
- the console chooses the next free weekly slot;
- the row is scheduled for Google Sheets;
- Telegram publishes it later from the sheet.

See:

- `../agent_system/publishing/google_sheets_queue.md`
- `../agent_system/publishing/google_apps_script_telegram_publisher.js`
- `../agent_system/publishing/autonomous_publishing_flow.md`

## Telegram Publishing Smoke Test

The repo still has a direct publish adapter at `/api/publish-telegram`.
Use it only for backend smoke testing or a manual fallback. The normal user flow
should publish from Google Sheets.

Required Vercel environment variables:

```text
TELEGRAM_BOT_TOKEN=123456:bot-token-from-botfather
TELEGRAM_CHAT_ID=@your_channel_or_numeric_chat_id
```

Setup:

1. Create a bot in Telegram through `@BotFather`.
2. Add the bot as an admin to the target channel or group.
3. Put the bot token and chat ID into Vercel Environment Variables.
4. Redeploy the project.
5. POST a draft to `/api/publish-telegram` for a smoke test.

Without these variables the button returns a setup error and does not publish.
