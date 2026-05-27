# Storage and Automation Proposal

## MVP Approach

Start simple and durable:

1. GitHub/local repo stores prompts, schemas, and runner code.
2. Notion stores the human editorial calendar and approvals.
3. Google Sheets stores the publishing queue.
4. Source cards are stored as JSON/Markdown artifacts.
5. Telegram bot sends review messages and later can publish approved rows.

## Data Flow

```text
Agent run
  -> source_cards/*.json
  -> topic_candidates in Notion or Google Sheets
  -> Pavel approval
  -> final posts in Notion Content Calendar
  -> approved rows in Google Sheets
  -> Telegram publishing script
```

## Recommended Tables / Files

### Source Cards

MVP:

```text
agent_system/artifacts/source_cards/YYYY-MM-DD/*.json
```

Later:

Supabase table `source_cards`.

### Topic Candidates

MVP:

Google Sheet tab `Topic Candidates`.

Columns:

- `candidate_id`
- `status`
- `title`
- `source_url`
- `micro_summary_300_chars`
- `why_now`
- `baurum_angle`
- `gemstone_relevance`
- `recommended_format`
- `cta_idea`
- `risk_note`
- `score`
- `pavel_notes`

### Content Publishing Queue

Google Sheet tab `Content Publishing Queue`.

Columns are documented in `publishing/google_sheets_queue.md`.

### Notion

Use `Content Calendar` for:

- selected topics;
- final drafts;
- approval status;
- publication status;
- links to source cards and source URLs.

Use `Automation Logs` for:

- workflow start/end;
- agent errors;
- source count;
- final output links.

## Why This Setup

Google Sheets is practical for scripts and Telegram publication.
Notion is better for visual control and editorial planning.
GitHub is best for versioning prompts and workflow logic.

This avoids putting everything in one tool too early.

