# Notion Mapping for Astro Content Chain

Recommended target database: `Content Calendar`.

## Suggested Properties

Use existing fields where available. Add these later if needed:

- `Workflow ID`
- `Content ID`
- `Channel`
- `Status`
- `Scheduled at`
- `Source theme`
- `CTA type`
- `Agent run URL`
- `Google Sheets row URL`
- `Visual status`
- `Approval status`
- `Learning notes`

## Relationship to Google Sheets

Notion is the human editorial calendar. Google Sheets is the operational queue
for scripts that publish or sync content.

Do not make Notion the only machine queue unless the publishing script is also
Notion-native.

