# Old Telegram Bot Migration

Archive analyzed:

`/Users/kraplak/Desktop/Astro_t_botOLD 2.zip`

Secrets were present in the archive environment file, but they should not be
copied into the repository.

## What The Old Bot Is

The old system is a Python background worker, not a frontend/backend web app.

Main files:

- `bot.py` - reads Google Sheets, schedules Telegram posts, sends errors.
- `requirements.txt` - Python dependencies.
- `runtime.txt` - Python runtime for Heroku-style hosting.
- `Procfile` - worker command: `python bot.py`.
- `.env` - real Telegram/Google configuration.
- `credentials.json` - present but empty in the archive.

The old Git remote points to `git@github.com:zerlik/Astro_t_p_bot.git`.

## How The Old Bot Works

1. Loads environment variables.
2. Connects to Google Sheets through a Google service account.
3. Opens the configured spreadsheet by `GOOGLE_SHEET_ID`.
4. Reads the first worksheet.
5. Expects lunar-calendar columns:
   - `Дата публикации`
   - `Время публикации`
   - `Номер лунного дня`
   - `Начало лунного дня дата`
   - `Начало лунного дня время`
   - `Текст публикации`
6. Schedules future posts in memory with APScheduler.
7. Sends Telegram messages through aiogram.
8. Optionally sends errors to an error channel.

## Important Problems In The Old Bot

- It does not write `published`, `failed`, or `telegram_message_id` back to the
  sheet.
- It reads only `sheet1`, so tab names are not explicit.
- It is tied to old Russian lunar-calendar columns.
- It keeps scheduled jobs only in memory, so a server restart rebuilds schedule
  from the sheet.
- The archive `.env` uses `GOOGLE_APPLICATION_CREDENTIALS`; the code mainly
  expects `GOOGLE_CREDENTIALS` or `GOOGLE_CREDENTIALS_FILE`. The new bot supports
  all three.

## Migration Decision

Use the old bot as the technical base, but keep Pavel's simple sheet logic.
The new implementation lives in:

`publisher_bot/`

The new bot:

- reads columns A-E: date, time, title, text, optional image;
- schedules future rows exactly like the old lunar-calendar bot;
- keeps old lunar-calendar publishing behavior;
- can also publish new BAURUM article rows appended below the calendar rows;
- writes status/message id/error only if optional service columns exist.

## Installation Plan

1. Copy or create the Google Sheet in Pavel's Google Drive.
2. Keep the simple columns A-E: date, time, title, text, optional image.
3. Optionally add service columns to the right: `status`, `published_at`,
   `telegram_message_id`, `publish_error`.
4. Create a Google service account.
5. Share the Google Sheet with the service-account email.
6. Create or reconnect the Telegram bot through `@BotFather`.
7. Add the bot as admin to the Telegram channel.
8. Deploy `publisher_bot` as a long-running worker on Render/Railway/Fly/VPS.
9. Set env vars from `publisher_bot/.env.example`.
10. Add one test row scheduled 5 minutes ahead.
11. Confirm the row becomes `published`.

## Hosting Note

Vercel is good for the console and serverless endpoints. This specific publisher
should not run as a Vercel function because it must stay alive and poll the
sheet continuously.
