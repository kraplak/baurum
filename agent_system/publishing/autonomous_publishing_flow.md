# Autonomous Publishing Flow

This is the target BAURUM publishing logic for Telegram.

## Principle

Google Sheets is the publishing schedule. The bot should not invent a separate
queue. It should publish the same way the lunar calendar already works:

```text
Google Sheet row A-G
  -> date and time become the schedule
  -> publisher bot sends the row to Telegram
  -> old rows remain as archive
```

## Sheet Structure

| Column | Meaning |
| --- | --- |
| A | Publication date, keep the existing `YYYY.MM.DD` format |
| B | Publication time |
| C | Lunar day number or article title |
| D | Lunar day start date |
| E | Lunar day start time |
| F | Main text |
| G | Image URL, optional |

Optional service columns may be added to the right for status and diagnostics,
but they must not change the core A-G logic.

Do not rewrite the date format in column A. The current working format is
year-month-day, for example `2026.05.28`.

## Lunar Calendar

The lunar calendar is updated as a full monthly block from one trusted source.
Do not update it weekly from mixed sources.

Routine:

1. Once a month, find or use one trusted source for the next month.
2. Prepare the full lunar-cycle date/time block.
3. Update future lunar-calendar rows.
4. Leave already published rows as archive.
5. Let the bot keep publishing rows by date and time.

## New BAURUM Articles

Generated articles use the same table logic.

When Pavel approves a generated article, the console should append a normal
future row:

- A: publication date;
- B: publication time;
- C: title;
- D/E: empty for normal articles;
- F: final Telegram text;
- G: optional image URL.

The publisher bot then posts it like any other scheduled row.

The console writes through `/api/append-sheet`. That endpoint needs Google
service-account credentials in the deployment environment and the Moon Calendar
sheet shared with that service account.

## MVP Test Cycle

1. Copy the current lunar-calendar Google Sheet into Pavel's Google Drive.
2. Keep columns A-G.
3. Share the sheet with the Google service-account email.
4. Set `GOOGLE_SHEET_ID`, `GOOGLE_WORKSHEET_NAME`, Telegram token, and channel id.
5. Run `publisher_bot`.
6. Add one test row scheduled 5 minutes ahead.
7. Confirm the bot publishes it.

## Important Rule

No weekly lunar-calendar patching. One source, one full monthly update.
