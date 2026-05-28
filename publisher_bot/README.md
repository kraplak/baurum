# BAURUM Telegram Publisher Bot

This bot keeps the existing lunar-calendar publishing logic.

The Google Sheet is the publishing schedule. The bot reads rows, checks the
date/time, and posts the row to the BAURUM Telegram channel when the time
comes.

## Sheet Structure

The main columns stay simple:

| Column | Meaning |
| --- | --- |
| A | Publication date, keep the existing `YYYY.MM.DD` format |
| B | Publication time |
| C | Lunar day number or article title |
| D | Lunar day start date |
| E | Lunar day start time |
| F | Main text |
| G | Image URL, optional |

The bot does not require extra workflow columns. Do not change the date format
in column A: the working table intentionally uses year, then month, then day.

Optional service columns may be added to the right:

| Column header | Meaning |
| --- | --- |
| `status` or `статус` | `published`, `failed`, etc. |
| `published_at` or `опубликовано` | Actual publication time |
| `telegram_message_id` or `message_id` | Telegram message id |
| `publish_error` or `ошибка` | Last publication error |

If those service columns are present, the bot updates them. If they are absent,
the bot still publishes normally.

## How It Works

1. Reads the configured worksheet.
2. Uses columns A-G as the source of truth.
3. Schedules every future row with date, time, and text/title.
4. Publishes at the scheduled moment.
5. Re-syncs the sheet every few minutes.
6. Skips rows marked `published`, `failed`, `skip`, or `archived` when a status
   column exists.

This preserves the old lunar-calendar behavior: past rows stay in the sheet as
archive, future rows are the active schedule, and once a month the lunar-cycle
dates can be updated for the next period.

## Environment

Copy `.env.example` to `.env` locally or set these values on the server:

```text
TELEGRAM_TOKEN=
CHANNEL_ID=
ERROR_CHANNEL_ID=
GOOGLE_SHEET_ID=
GOOGLE_WORKSHEET_NAME=Лист1
GOOGLE_CREDENTIALS=
GOOGLE_CREDENTIALS_FILE=
LOCAL_TZ=Europe/Warsaw
SYNC_EVERY_MINUTES=5
SHEET_HAS_HEADER=true
```

`GOOGLE_CREDENTIALS` may be a full service-account JSON string. Alternatively,
set `GOOGLE_CREDENTIALS_FILE=credentials.json`.

Do not commit real tokens or service-account JSON.

## Google Setup

1. Copy or create the lunar-calendar sheet in Pavel's Google Drive.
2. Keep the columns A-G as described above.
3. Create a Google Cloud service account.
4. Share the Google Sheet with the service-account email.
5. Put the service-account JSON into the server as `GOOGLE_CREDENTIALS`.

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
place for this scheduler because they do not stay alive.

The command is:

```bash
python bot.py
```

## Test Row

Add one future row:

- A: tomorrow's date
- B: time 5 minutes ahead
- C: test title or lunar day number
- D: lunar start date, optional for non-lunar articles
- E: lunar start time, optional for non-lunar articles
- F: test text
- G: optional image URL

The bot should publish it at the scheduled time. If service columns exist, it
will also mark the row as `published`.
