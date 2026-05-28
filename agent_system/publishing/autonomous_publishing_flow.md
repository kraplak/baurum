# Autonomous Publishing Flow

This is the target BAURUM publishing logic for Telegram and later other
channels.

## Principle

The agent console should not be the final publisher in normal operation.
The console prepares content and sends approved material into a Google Sheets
publishing queue. A scheduled publisher reads that queue and posts due rows to
Telegram.

This matches the existing lunar calendar workflow: the table is visible,
editable, auditable, and easy to debug.

## System Roles

### Agent Console

- runs topic research and writing chains;
- lets Pavel review topics and final drafts;
- writes approved/scheduled rows into Google Sheets;
- shows queue status for convenience.

### Google Sheets

The sheet is the operational source of truth for publication.

It stores:

- content text;
- schedule;
- status;
- channel;
- source workflow;
- publication result;
- errors;
- Telegram message id.

### Apps Script / Publisher Bot

Runs on a timer.

It:

- reads `Content Publishing Queue`;
- finds rows with `status = approved` or `scheduled`;
- checks `scheduled_at <= now`;
- posts `post_text` to Telegram;
- writes back `published_at`, `telegram_message_id`, or `publish_error`.

### Telegram Bot

The bot only publishes. It does not decide what should be published.
The decision is represented by row status and schedule.

## MVP Test Cycle

1. Move the lunar calendar table into Pavel's Google account.
2. Add a tab named `Content Publishing Queue`.
3. Add columns from `google_sheets_queue.md`.
4. Install `google_apps_script_telegram_publisher.js` in the sheet.
5. Create or reconnect the Telegram bot through `@BotFather`.
6. Add bot token and target chat/channel ID to Apps Script Properties.
7. Add the bot as admin to the Telegram channel.
8. Add one test row:
   - `status = scheduled`;
   - `scheduled_at = now + 5 minutes`;
   - `channel = telegram`;
   - `post_text = short test post`.
9. Wait for the trigger to publish.
10. Confirm the row becomes `published` and gets `telegram_message_id`.

## Content Types

The same queue should publish:

- lunar calendar posts;
- weekly BAURUM blog/Telegram posts;
- article announcements;
- Instagram/Reels captions later, if a separate publisher adapter exists.

Use `source_workflow` to distinguish:

- `lunar_calendar`;
- `astro_weekly_content`;
- `manual`;
- `blog_article`;
- `instagram_adaptation`.

## Important Rule

Automation can publish only rows that are explicitly approved or scheduled.
Draft rows must never be published.

Human control stays in the table:

- edit text;
- change scheduled date;
- set status;
- inspect published rows;
- inspect failed rows.
