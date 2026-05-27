# Astro / Vedic Content Chain Review

Version: `1.0.0-draft`

Purpose: create a controlled content-production chain for BAURUM: sourced
astrological/Vedic topics, Pavel's topic selection, BAURUM-style writing,
editing, visual brief, and publishing queue.

## Chain Overview

```text
Pavel request
  -> Content Director
  -> Research & Source Agent
  -> Topic Strategy Agent
  -> Pavel selects topics
  -> Vedic Content Writer
  -> Editor & Publishing Prep Agent
  -> Visual Agent
  -> Pavel approves publication
  -> Google Sheets / Notion / Telegram queue
```

## Agent 01: Content Director

File: `agents/astro_content_chain/01_content_director.md`

Role: receives Pavel's task and turns it into an operational brief.

Responsible for:

- selecting workflow mode;
- defining period and output count;
- setting research requirements;
- deciding whether gemstone references are natural, optional, or not relevant;
- handing a precise brief to the researcher.

Not responsible for:

- writing posts;
- inventing topics;
- doing source research.

Output: `content_brief.schema.json`

## Agent 02: Research & Source Agent

File: `agents/astro_content_chain/02_research_source_agent.md`

Role: finds the origin of topics and creates source cards.

Responsible for:

- finding articles, posts, calendar events, traditional explanations, BAURUM assets;
- preserving URLs;
- creating a micro-summary up to 300 characters;
- creating an extended summary for the writer;
- storing optional full-text references only when needed;
- separating facts, interpretations, and risks.

Not responsible for:

- writing final BAURUM copy;
- forcing gemstone angles;
- inventing sources or exact timings.

Output: `source_research_pack.schema.json`

Core object: `source_card.schema.json`

## Agent 03: Topic Strategy Agent

File: `agents/astro_content_chain/03_topic_strategy_agent.md`

Role: filters many source cards into a small human-review list.

Responsible for:

- scoring topics by relevance, depth, BAURUM fit, channel potential, and risk;
- preparing 10-14 candidates if Pavel wants 7 final posts;
- showing each candidate with source URL and 300-character summary;
- marking gemstone relevance as natural, optional, not relevant, or caution.

Not responsible for:

- deciding final topics without Pavel;
- writing final posts.

Output: `topic_selection_pack.schema.json`

Human checkpoint: Pavel chooses topics.

## Agent 04: Vedic Content Writer

File: `agents/astro_content_chain/04_vedic_content_writer.md`

Role: writes original BAURUM content from approved source-based topics.

Responsible for:

- using source cards and extended summaries;
- reinterpreting, not copying;
- adding Vedic/Jyotish meaning where appropriate;
- translating symbolism into human experience;
- mentioning gemstones only when useful and natural;
- producing Telegram draft and optional blog/short-video derivatives.

Not responsible for:

- final approval;
- visual direction;
- publishing metadata.

Output: `content_draft_pack.schema.json`

## Agent 05: Editor & Publishing Prep Agent

File: `agents/astro_content_chain/05_editor_publishing_prep_agent.md`

Role: final editor and operational packager.

Responsible for:

- protecting BAURUM voice;
- checking overclaiming, copying, and weak CTA;
- preparing final Telegram text;
- preparing approval message for Pavel;
- preparing Google Sheets row;
- preparing Notion payload.

Not responsible for:

- final publication without approval;
- generating visuals.

Output: `editorial_publishing_pack.schema.json`

## Agent 06: Visual Agent

File: `agents/astro_content_chain/06_visual_agent.md`

Role: creates visual concept and image prompt.

Responsible for:

- visual concept;
- Canva brief;
- image generation prompt;
- negative prompt;
- dimensions for Telegram/blog/Instagram;
- deciding whether jewelry/gemstone should appear visually.

Temporary style direction:

```text
refined, symbolic, high-end jewelry editorial, warm natural light,
tactile materiality, elegant composition, quiet sacred atmosphere;
no cheap mysticism, no neon zodiac, no direct sales layout by default
```

Output: `visual_pack.schema.json`

## Storage Proposal

### GitHub / Local Repo

Use for:

- agent prompts;
- workflow YAML;
- JSON schemas;
- runner code;
- version history.

Current path:

```text
agent_system/
```

### Notion

Use as the human operating layer.

Recommended databases:

- `Content Calendar`: selected topics, final posts, statuses, scheduled dates.
- `AI Agents`: agent definitions and current versions.
- `Automation Logs`: every run, error, approval, publication.

Notion should show the editorial picture, not become the only machine queue.

### Google Sheets

Use as publishing queue and simple machine-readable table.

Recommended sheet: `Content Publishing Queue`

Key statuses:

- `draft_review`
- `needs_changes`
- `approved`
- `scheduled`
- `published`
- `failed`

Only rows with `status = approved` should be published by downstream Telegram
scripts.

### Artifact Store

Use for source summaries and optional full text.

MVP options:

- local markdown/json files in repo or workspace;
- Google Drive docs for long research packs;
- Supabase/Postgres later when the runner exists.

Token discipline:

- pass links + micro-summary + extended summary by default;
- pass full text only for central sources that need deep rewriting.

## Topic Candidate Review Format

Example of what Pavel should receive:

```text
1. Mars in Scorpio: disciplined force
Source: https://...
Summary: Material about Mars intensifying will, conflict, hidden pressure, and the need for inner discipline.
Why now: relevant during the transit window.
BAURUM angle: strength without aggression; gemstone mention optional/caution.
Format: Telegram post + short video.
CTA: reflect/save or ask for chart-based suitability.
Risk: avoid recommending red coral directly.
```

## Gemstone Policy

Gemstones are not the center by default.

They appear only as:

- cultural/Jyotish context;
- subtle symbolic bridge;
- BAURUM construction note;
- invitation to consultation when personal suitability matters.

Avoid:

- "wear this stone and your life will change";
- direct product push in every post;
- gemstone recommendation without chart context;
- turning every Vedic topic into sales copy.

