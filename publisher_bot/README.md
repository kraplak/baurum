# BAURUM Telegram Publisher Bot

This bot is adapted from the old lunar calendar Telegram publisher.

It reads approved or scheduled rows from Google Sheets and publishes due rows to
the BAURUM Telegram channel. After each attempt it writes the result back to the
sheet, so the table stays the operational source of truth.

## What The Old Bot Did

The archived bot was a Python worker:

- `bot.py` used `gspread` to read one Google Sheet.
- `aiogram` sent messages to Telegram.
- `APScheduler` planned future posts in memory.
- `Procfile` ran it as a Heroku-style worker: `worker: python bot.py`.
- It expected environment variables for Telegram, Google credentials, sheet id,
  timezone, and optional error channel.

The old bot read these lunar calendar columns:

- `Дата публикации`
- `Время публикации`
- `Номер лунного дня`
- `Начало лунного дня дата`
- `Начало лунного дня время`
- `Текст публикации`

It did not write publication status back to the table.

## New Queue Columns

This publisher uses the shared BAURUM queue from
`../agent_system/publishing/google_sheets_queue.md`.

Required columns:

- `status`
- `channel`
- `scheduled_at`
- `post_text`

Recommended columns:

- `content_id`
- `published_at`
- `title`
- `telegram_message_id`
- `publish_error`
- `last_attempt_at`
- `attempt_count`
- `source_workflow`
- `content_type`

## Environment

Copy `.env.example` to `.env` locally or set these values on the server:

```text
TELEGRAM_TOKEN=
CHANNEL_ID=
ERROR_CHANNEL_ID=
GOOGLE_SHEET_ID=
GOOGLE_WORKSHEET_NAME=Content Publishing Queue
GOOGLE_CREDENTIALS=
LOCAL_TZ=Europe/Warsaw
SYNC_EVERY_MINUTES=5
```

`GOOGLE_CREDENTIALS` may be a full service-account JSON string. Alternatively,
set `GOOGLE_CREDENTIALS_FILE=credentials.json`.

Do not commit real tokens or service-account JSON.

## Google Setup

1. Create or copy the publishing Google Sheet into Pavel's Google Drive.
2. Add a tab named `Content Publishing Queue`.
3. Add the queue columns from `../agent_system/publishing/google_sheets_queue.md`.
4. Create a Google Cloud service account.
5. Share the Google Sheet with the service-account email.
6. Put the service-account JSON into the server as `GOOGLE_CREDENTIALS`.

## Telegram Setup

1. Create or reuse the bot through `@BotFather`.
2. Add the bot as admin to the Telegram channel.
3. Set `TELEGRAM_TOKEN`.
4. Set `CHANNEL_ID` to the target channel id or `@channel_username`.
5. Optional: set `ERROR_CHANNEL_ID` to receive bot errors.

## Run Locally

```bash
cd publisher_bot
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python bot.py
```

## Deploy

This is a long-running worker, so it should run on Render, Railway, Fly.io,
Heroku-style workers, or a VPS. Vercel serverless functions are not the right
place for this specific scheduler because they do not stay alive.

The command is:

```bash
python bot.py
```

## Test Row

Add one row with:

- `status`: `scheduled`
- `channel`: `telegram`
- `scheduled_at`: a time 5 minutes in the future, for example
  `2026-06-01 10:00`
- `post_text`: short test text

When the bot publishes, it changes the row to `published`, fills
`published_at`, and stores `telegram_message_id`.
