# Google Sheets Publishing Queue

Google Sheets is the operational publishing queue for BAURUM content.
The console and agents prepare rows; a Telegram publisher script reads due rows
on a timer and updates the status after publication.

This is the same operational model as the lunar calendar workflow: the table is
easy to inspect, easy to correct manually, and the automation has one clear job.

## Publishing Flow

```text
Agent Console / weekly workflow
  -> creates draft and visual brief
  -> Pavel approves or edits
  -> approved row is written to Google Sheets
  -> Apps Script trigger checks due rows every few minutes
  -> Telegram bot publishes approved/scheduled rows
  -> sheet is updated with status, published_at, telegram_message_id, errors
```

The UI may keep a direct Telegram publish button only as a smoke-test/manual
fallback. The default production path is scheduled publication from Google
Sheets.

## Sheet Name

`Content Publishing Queue`

## Columns

1. `content_id`
2. `status`
3. `channel`
4. `scheduled_at`
5. `published_at`
6. `title`
7. `post_text`
8. `cta`
9. `visual_asset_url`
10. `visual_brief`
11. `utm_source`
12. `utm_medium`
13. `utm_campaign`
14. `approval_by`
15. `approval_notes`
16. `telegram_message_id`
17. `publish_error`
18. `last_attempt_at`
19. `attempt_count`
20. `source_workflow`
21. `source_topic_id`
22. `source_url`
23. `content_type`
24. `performance_views`
25. `performance_reactions`
26. `performance_replies`
27. `performance_clicks`
28. `learning_notes`

## Status Values

- `draft_review`
- `needs_changes`
- `approved`
- `scheduled`
- `publishing`
- `published`
- `failed`
- `archived`

## Publishing Rule

Only rows with `status = approved` or `status = scheduled` and
`scheduled_at <= now()` may be published by the downstream Telegram script.

After publishing, the script should set:

- `status = published`;
- `published_at`;
- `telegram_message_id`, if available.

If publishing fails, the script should set:

- `status = failed`;
- `publish_error`;
- `last_attempt_at`;
- increment `attempt_count`.

## Approval Rule

The agent system may create rows but must not silently publish. Human approval is
required until Pavel explicitly changes this policy.

For automatic publishing, the human approval point is the row status:
once Pavel or an editor sets `status` to `approved` / `scheduled`, the bot may
publish it when `scheduled_at` arrives.

## Lunar Calendar Compatibility

The lunar calendar can use the same queue with:

- `source_workflow = lunar_calendar`;
- `content_type = lunar_day`;
- `title = lunar day headline`;
- `post_text = final Telegram post`;
- `scheduled_at = exact publication datetime`;
- `channel = telegram`;
- `status = scheduled` or `approved`.

This lets lunar calendar posts and generated BAURUM articles publish through the
same Telegram bot and the same sheet.
