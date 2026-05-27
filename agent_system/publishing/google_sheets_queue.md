# Google Sheets Publishing Queue

This queue is designed for a simple Telegram publishing script or Apps Script.

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
17. `performance_views`
18. `performance_reactions`
19. `performance_replies`
20. `performance_clicks`
21. `learning_notes`

## Status Values

- `draft_review`
- `needs_changes`
- `approved`
- `scheduled`
- `published`
- `failed`
- `archived`

## Publishing Rule

Only rows with `status = approved` and `scheduled_at <= now()` may be published
by the downstream Telegram script.

After publishing, the script should set:

- `status = published`;
- `published_at`;
- `telegram_message_id`, if available.

## Approval Rule

The agent system may create rows but must not silently publish. Human approval is
required until Pavel explicitly changes this policy.

