# Google Sheets Publishing Table

Google Sheets stays the operational publishing schedule for BAURUM Telegram
posts.

The logic is intentionally simple and keeps the existing lunar-calendar
workflow: the bot reads publication date and time from the sheet and posts the
row to Telegram when that moment arrives.

## Main Columns

| Column | Meaning |
| --- | --- |
| A | Publication date |
| B | Publication time |
| C | Title |
| D | Main text |
| E | Image URL, optional |

The lunar calendar and new BAURUM articles can live in the same table. New
articles are appended as normal future rows with the same date/time/title/text
structure.

## Optional Service Columns

These columns may be added to the right, but they are not required for the bot
to publish:

| Header | Meaning |
| --- | --- |
| `status` or `статус` | `published`, `failed`, `skip`, etc. |
| `published_at` or `опубликовано` | Actual publication time |
| `telegram_message_id` or `message_id` | Telegram message id |
| `publish_error` or `ошибка` | Last publication error |

If service columns exist, the bot writes publication results there. If they do
not exist, publication still works.

## Publishing Flow

```text
Google Sheet row with future date/time
  -> publisher bot schedules the row
  -> Telegram post is sent at the scheduled moment
  -> optional service columns are updated
  -> old rows remain in the sheet as archive
```

## Monthly Lunar Calendar Update

The lunar-calendar rows should be updated as a whole monthly block from one
trusted source. Do not patch the month week by week from mixed sources, because
that can create date/time drift and duplicate or missing posts.

The intended routine is:

1. Pick one source for the next month.
2. Prepare the full next-month lunar cycle.
3. Replace or append the relevant future calendar rows.
4. Keep already published rows as archive.
5. Add separate BAURUM article rows below/around the calendar rows with normal
   future publication dates.

## Agent Console Rule

When the console says `Опубликовать`, it should add a normal future row to this
table. It should not bypass the table and should not invent another publishing
queue.
