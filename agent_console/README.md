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
