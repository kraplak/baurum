# BAURUM Agent Console Architecture

The console must be built as an extensible operating layer, not as a hardcoded
dashboard for one workflow.

## Core Design Principle

Everything is a module:

- workflow definitions;
- agents;
- run steps;
- artifacts;
- approval points;
- publishing targets;
- integrations;
- UI panels.

The app should be able to add a new workflow without rewriting the whole
interface.

## Workflow Definition Model

Each workflow should be described by a versioned definition:

```ts
type WorkflowDefinition = {
  id: string;
  version: string;
  name: string;
  area: string;
  description: string;
  inputSchema: JsonSchema;
  stages: WorkflowStage[];
  artifactTypes: ArtifactType[];
  approvalPoints: ApprovalPoint[];
  outputs: WorkflowOutput[];
  integrations: IntegrationRef[];
};
```

The UI reads this definition and renders:

- launch form;
- stage tracker;
- review inbox;
- artifact tabs;
- publishing controls;
- run log.

## Stage Model

```ts
type WorkflowStage = {
  id: string;
  name: string;
  agentId: string;
  inputArtifactTypes: string[];
  outputArtifactTypes: string[];
  requiresHumanApproval?: boolean;
  canRetry: boolean;
};
```

This lets us add, remove, or reorder stages without redesigning the UI.

## Artifact Model

Artifacts are the durable handoff between agents.

Examples:

- `content_brief`;
- `source_card`;
- `topic_candidate`;
- `approved_topic`;
- `telegram_draft`;
- `visual_pack`;
- `publishing_row`;
- `landing_page_outline`;
- `reels_script`;
- `seo_article`.

Each artifact stores:

- type;
- version;
- workflow run ID;
- source agent;
- status;
- JSON payload;
- optional markdown body;
- external links;
- created/updated timestamps.

## Approval Model

Human control is a first-class part of the architecture.

Approval objects should support:

- approve;
- request changes;
- reject;
- park for later;
- add note;
- assign publish date;
- choose from multiple candidates.

Approval can happen from:

- web console;
- Telegram bot;
- later: Notion button/status sync.

## Integration Layer

Integrations should be adapters, not hardcoded inside workflows.

Initial adapters:

- Notion adapter;
- Google Sheets adapter;
- Telegram adapter;
- Canva/image adapter;
- GitHub adapter;
- OpenAI Agents runner.

Later adapters:

- Instagram/Meta;
- YouTube;
- Tilda;
- Supabase Storage;
- analytics exports.

## Recommended Database Tables

- `workflows`
- `workflow_versions`
- `agents`
- `agent_versions`
- `runs`
- `run_steps`
- `artifacts`
- `approvals`
- `integrations`
- `publishing_targets`
- `publishing_queue`
- `activity_log`

## UI Shell

The shell should stay stable:

1. Workflows
2. Run Brief
3. Stage Tracker
4. Review Inbox
5. Artifact Workspace
6. Publishing Queue
7. Source Library
8. Activity Log
9. Settings / Integrations

New workflows should add new definitions and artifact renderers, not new
one-off pages.

## MVP Rule

Start with hardcoded mock workflow data for UX.
Then replace mock data with Supabase records while keeping the same UI contract.

Do not connect every integration before the interaction model is comfortable.

