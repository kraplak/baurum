"use client";

import {
  Activity,
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  FileText,
  GitBranch,
  Image,
  LayoutDashboard,
  Library,
  ListChecks,
  Play,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Sparkles,
  X
} from "lucide-react";
import { useMemo, useState } from "react";

type Workflow = {
  id: string;
  name: string;
  area: string;
  status: "ready" | "draft" | "paused";
  description: string;
  activeRuns: number;
  waitingReview: number;
  published: number;
  rejected: number;
  stages: {
    name: string;
    agent: string;
    status: "done" | "active" | "waiting";
  }[];
};

const workflows: Workflow[] = [
  {
    id: "astro-weekly-content",
    name: "Astro / Vedic Content",
    area: "Content",
    status: "ready",
    description:
      "Source cards, topic selection, Telegram posts, visual brief and publishing queue.",
    activeRuns: 2,
    waitingReview: 6,
    published: 12,
    rejected: 4,
    stages: [
      { name: "Brief", agent: "Content Director", status: "done" },
      { name: "Sources", agent: "Research & Source Agent", status: "done" },
      { name: "Topic choice", agent: "Topic Strategy Agent", status: "active" },
      { name: "Writing", agent: "Vedic Content Writer", status: "waiting" },
      { name: "Editorial", agent: "Editor & Publishing Prep", status: "waiting" },
      { name: "Visual", agent: "Visual Agent", status: "waiting" }
    ]
  },
  {
    id: "reels-script-lab",
    name: "Reels Script Lab",
    area: "Video",
    status: "draft",
    description:
      "Turns approved content themes into hooks, spoken scripts, shot lists and caption packs.",
    activeRuns: 0,
    waitingReview: 0,
    published: 0,
    rejected: 0,
    stages: [
      { name: "Brief", agent: "Video Director", status: "waiting" },
      { name: "Hooks", agent: "Hook Strategist", status: "waiting" },
      { name: "Script", agent: "Short Script Writer", status: "waiting" },
      { name: "Shot list", agent: "Production Planner", status: "waiting" }
    ]
  },
  {
    id: "landing-funnel-builder",
    name: "Landing Funnel Builder",
    area: "Website",
    status: "draft",
    description:
      "Builds page logic, offer blocks, objections, CTA sequence and testing notes.",
    activeRuns: 0,
    waitingReview: 1,
    published: 0,
    rejected: 0,
    stages: [
      { name: "Offer", agent: "Offer Architect", status: "done" },
      { name: "Page map", agent: "Funnel Strategist", status: "active" },
      { name: "Copy", agent: "Landing Copywriter", status: "waiting" },
      { name: "QA", agent: "Conversion Editor", status: "waiting" }
    ]
  }
];

const topicCandidates = [
  {
    id: "tc-001",
    title: "Jupiter and yellow sapphire: knowledge, weight, responsibility",
    status: "review",
    score: 0.91,
    source:
      "A source-based piece on Jupiter as wisdom, teachers, growth and the discipline behind prosperity.",
    baurum:
      "Can become a non-sales reflection on maturity, guidance and why strong stones require discernment.",
    gemstone: "natural"
  },
  {
    id: "tc-002",
    title: "Full Moon week: what becomes visible when emotion reaches form",
    status: "approved",
    score: 0.86,
    source:
      "A weekly calendar note connecting the full moon window with culmination, visibility and release.",
    baurum:
      "Good Telegram post with no direct stone bridge; can close with a reflective question.",
    gemstone: "not relevant"
  },
  {
    id: "tc-003",
    title: "Mars themes: strength without aggression",
    status: "parked",
    score: 0.78,
    source:
      "An article on Mars transits, pressure, courage and conflict patterns in personal action.",
    baurum:
      "Useful later for red coral context, but needs caution and a more precise timing window.",
    gemstone: "caution"
  }
];

const sources = [
  {
    title: "Jupiter as teacher and measure of inner abundance",
    url: "source-card/src-2026-05-27-001",
    summary:
      "300-char summary stored for review. Extended summary is stored separately for the writer.",
    quality: "High"
  },
  {
    title: "Moon phase calendar for the coming week",
    url: "source-card/src-2026-05-27-002",
    summary:
      "Timing-focused source card with facts separated from traditional interpretation.",
    quality: "Medium"
  }
];

const queue = [
  {
    title: "Full Moon week: what becomes visible",
    channel: "Telegram",
    status: "approved",
    date: "2026-05-29 10:00"
  },
  {
    title: "Jupiter and yellow sapphire",
    channel: "Telegram + Blog",
    status: "draft_review",
    date: "2026-06-01 09:30"
  }
];

const draftText = `Юпитер в ведической традиции связан не просто с ростом, а с тем, что делает рост устойчивым: знанием, наставничеством, доверием к порядку и способностью выдерживать собственный путь.

Жёлтый сапфир часто связывают с Юпитером, но это не делает его универсальным камнем для всех. В Jyotish сильный камень всегда требует внимательности: важны карта, качество камня, металл, посадка и то, зачем человек вообще обращается к этой теме.

Иногда вопрос не в том, чтобы “усилить удачу”, а в том, чтобы стать человеком, который способен нести больше смысла, ответственности и ясности.`;

function statusLabel(status: Workflow["status"]) {
  if (status === "ready") return "Ready";
  if (status === "draft") return "Draft";
  return "Paused";
}

function StageIcon({ status }: { status: "done" | "active" | "waiting" }) {
  if (status === "done") {
    return (
      <span className="stage-check done">
        <Check />
      </span>
    );
  }

  if (status === "active") {
    return (
      <span className="stage-check">
        <RefreshCw />
      </span>
    );
  }

  return (
    <span className="stage-check">
      <CircleDashed />
    </span>
  );
}

export function AgentConsole() {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState(workflows[0].id);
  const [tab, setTab] = useState("topics");
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.id === selectedWorkflowId) ?? workflows[0],
    [selectedWorkflowId]
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">B</div>
          <div>
            <div className="brand-name">BAURUM</div>
            <div className="brand-subtitle">Agent Console</div>
          </div>
        </div>

        <nav className="nav-section">
          <div className="nav-label">Control</div>
          <button className="nav-button active">
            <LayoutDashboard /> Dashboard
          </button>
          <button className="nav-button">
            <GitBranch /> Workflows
          </button>
          <button className="nav-button">
            <ListChecks /> Review
          </button>
          <button className="nav-button">
            <CalendarDays /> Calendar
          </button>
        </nav>

        <nav className="nav-section">
          <div className="nav-label">Library</div>
          <button className="nav-button">
            <Library /> Sources
          </button>
          <button className="nav-button">
            <Archive /> Artifacts
          </button>
          <button className="nav-button">
            <Activity /> Runs
          </button>
          <button className="nav-button">
            <Settings /> Settings
          </button>
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <div className="eyebrow">Modular Workflow Management</div>
            <h1>Agent Console</h1>
          </div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search">
              <Search />
            </button>
            <button className="secondary-button">
              <Plus /> Workflow
            </button>
            <button className="primary-button">
              <Play /> Run
            </button>
          </div>
        </header>

        <section className="dashboard-grid">
          <div className="detail-stack">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Workflows</h2>
                  <p className="panel-note">Versioned process modules</p>
                </div>
                <span className="badge">{workflows.length} total</span>
              </div>

              <div className="workflow-list">
                {workflows.map((workflow) => (
                  <button
                    key={workflow.id}
                    className={`workflow-item ${workflow.id === selectedWorkflow.id ? "active" : ""}`}
                    onClick={() => setSelectedWorkflowId(workflow.id)}
                  >
                    <div className="workflow-title-row">
                      <div>
                        <div className="workflow-name">{workflow.name}</div>
                        <p className="workflow-desc">{workflow.description}</p>
                      </div>
                      <span
                        className={`badge ${
                          workflow.status === "ready"
                            ? "green"
                            : workflow.status === "draft"
                              ? "gold"
                              : ""
                        }`}
                      >
                        {statusLabel(workflow.status)}
                      </span>
                    </div>

                    <div className="mini-stats">
                      <div className="mini-stat">
                        <div className="stat-value">{workflow.activeRuns}</div>
                        <div className="stat-label">Active</div>
                      </div>
                      <div className="mini-stat">
                        <div className="stat-value">{workflow.waitingReview}</div>
                        <div className="stat-label">Review</div>
                      </div>
                      <div className="mini-stat">
                        <div className="stat-value">{workflow.published}</div>
                        <div className="stat-label">Published</div>
                      </div>
                      <div className="mini-stat">
                        <div className="stat-value">{workflow.rejected}</div>
                        <div className="stat-label">Parked</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Run Brief</h2>
                  <p className="panel-note">Rendered from workflow input schema</p>
                </div>
                <button className="secondary-button">
                  <Sparkles /> Save
                </button>
              </div>
              <div className="content-area">
                <div className="run-form">
                  <div className="field">
                    <label>Period</label>
                    <select defaultValue="week">
                      <option value="week">Next week</option>
                      <option value="month">Next month</option>
                      <option value="custom">Custom range</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Final outputs</label>
                    <input defaultValue="7 posts" />
                  </div>
                  <div className="field">
                    <label>Primary channel</label>
                    <select defaultValue="telegram">
                      <option value="telegram">Telegram</option>
                      <option value="blog">Blog</option>
                      <option value="instagram">Instagram</option>
                      <option value="youtube">YouTube</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Topic candidates</label>
                    <input defaultValue="14" />
                  </div>
                  <div className="field full">
                    <label>Manual topics</label>
                    <textarea defaultValue="Jupiter and yellow sapphire; important lunar events; one free topic from Pavel" />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="detail-stack">
            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Current Chain</h2>
                  <p className="panel-note">Stages, agents and approval points</p>
                </div>
                <ChevronRight />
              </div>
              <div className="stage-track">
                {selectedWorkflow.stages.map((stage) => (
                  <div key={`${selectedWorkflow.id}-${stage.name}`} className="stage-item">
                    <StageIcon status={stage.status} />
                    <div>
                      <div className="stage-name">{stage.name}</div>
                      <div className="stage-agent">{stage.agent}</div>
                    </div>
                    <span
                      className={`badge ${
                        stage.status === "done"
                          ? "green"
                          : stage.status === "active"
                            ? "gold"
                            : ""
                      }`}
                    >
                      {stage.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Review Inbox</h2>
                  <p className="panel-note">Waiting for Pavel</p>
                </div>
                <span className="badge gold">6 items</span>
              </div>
              <div className="content-area">
                <div className="approval-row">
                  <div>
                    <div className="queue-title">Choose topics for next week</div>
                    <p className="muted">14 candidates prepared by Topic Strategy Agent</p>
                  </div>
                  <button className="primary-button">
                    <ListChecks /> Review
                  </button>
                </div>
              </div>
            </section>
          </div>
        </section>

        <section className="panel" style={{ marginTop: 18 }}>
          <div className="panel-header">
            <div>
                  <h2 className="panel-title">{selectedWorkflow.name}</h2>
                  <p className="panel-note">Artifacts, approvals and publishing state</p>
                </div>
            <div className="topbar-actions">
              <button className="secondary-button">
                <RefreshCw /> Sync
              </button>
              <button className="primary-button">
                <Send /> Export
              </button>
            </div>
          </div>

          <div className="tabs">
            {[
              ["topics", "Topics"],
              ["sources", "Sources"],
              ["draft", "Draft"],
              ["visual", "Visual"],
              ["queue", "Queue"],
              ["activity", "Activity"]
            ].map(([value, label]) => (
              <button
                key={value}
                className={`tab ${tab === value ? "active" : ""}`}
                onClick={() => setTab(value)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="content-area">
            {tab === "topics" && (
              <div className="topic-table">
                {topicCandidates.map((topic) => (
                  <div className="topic-card" key={topic.id}>
                    <div className="meta-row">
                      <div>
                        <div className="topic-title">{topic.title}</div>
                        <p className="topic-summary">{topic.source}</p>
                      </div>
                      <span
                        className={`badge ${
                          topic.status === "approved"
                            ? "green"
                            : topic.status === "parked"
                              ? "plum"
                              : "gold"
                        }`}
                      >
                        {topic.status}
                      </span>
                    </div>
                    <p className="topic-summary">{topic.baurum}</p>
                    <div className="topic-actions">
                      <span className="badge">Score {topic.score}</span>
                      <span className="badge">{topic.gemstone}</span>
                      <button className="status-button approve">
                        <Check /> Approve
                      </button>
                      <button className="status-button">
                        <RefreshCw /> Revise
                      </button>
                      <button className="status-button reject">
                        <X /> Park
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "sources" && (
              <div className="source-list">
                {sources.map((source) => (
                  <div className="source-card" key={source.url}>
                    <div className="source-row">
                      <div>
                        <div className="source-title">{source.title}</div>
                        <p className="muted">{source.url}</p>
                      </div>
                      <span className="badge green">{source.quality}</span>
                    </div>
                    <p className="topic-summary" style={{ marginTop: 8 }}>
                      {source.summary}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === "draft" && (
              <div className="draft-preview">
                <div className="meta-row">
                  <div>
                    <div className="topic-title">Jupiter and yellow sapphire</div>
                    <p className="muted">Final editor pass pending</p>
                  </div>
                  <span className="badge gold">draft_review</span>
                </div>
                <div className="draft-body">{draftText}</div>
                <div className="topic-actions">
                  <button className="status-button approve">
                    <Check /> Approve
                  </button>
                  <button className="status-button">
                    <RefreshCw /> Revise
                  </button>
                  <button className="status-button reject">
                    <X /> Reject
                  </button>
                </div>
              </div>
            )}

            {tab === "visual" && (
              <div className="draft-preview">
                <div className="visual-preview">
                  <div className="visual-label">Refined symbolic visual direction</div>
                </div>
                <div className="source-card">
                  <div className="source-title">Visual brief v0</div>
                  <p className="topic-summary" style={{ marginTop: 8 }}>
                    Warm editorial light, tactile materiality, quiet sacred atmosphere.
                    Gemstone appears only if the theme naturally calls for it.
                  </p>
                </div>
              </div>
            )}

            {tab === "queue" && (
              <div className="queue-list">
                {queue.map((item) => (
                  <div className="queue-card" key={item.title}>
                    <div className="queue-row">
                      <div>
                        <div className="queue-title">{item.title}</div>
                        <p className="muted">
                          {item.channel} · {item.date}
                        </p>
                      </div>
                      <span className={`badge ${item.status === "approved" ? "green" : "gold"}`}>
                        {item.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "activity" && (
              <div className="activity-list">
                {[
                  "Topic Strategy Agent prepared 14 candidates",
                  "Research & Source Agent stored 18 source cards",
                  "Content Director created weekly brief",
                  "Visual Agent waiting for approved final text"
                ].map((item) => (
                  <div className="activity-card" key={item}>
                    <div className="source-row">
                      <p className="muted">{item}</p>
                      <FileText />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
