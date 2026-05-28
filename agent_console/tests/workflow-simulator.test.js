const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const sourcePath = path.join(__dirname, "..", "app", "workflow-simulator.js");
const source = fs.readFileSync(sourcePath, "utf8");
const context = { window: {} };

vm.createContext(context);
vm.runInContext(source, context);

const simulator = context.window.BaurumWorkflow;

assert.equal(simulator.agents.length, 6);
assert.deepEqual(
  JSON.parse(JSON.stringify(simulator.agents.map((agent) => agent.id))),
  ["director", "research", "strategy", "writer", "editor", "visual"]
);

const topic = {
  id: "jupiter-yellow-sapphire",
  title: "Юпитер и желтый сапфир",
  summary: "Тема о знании, наставничестве и ответственности в традиции Джйотиш.",
  angle: "Показать желтый сапфир как аккуратный мост к традиции, без обещаний.",
  risk: "Не обещать удачу и не рекомендовать камень всем.",
  source: "manual-source"
};

const result = simulator.runAgentChain(topic, {
  preferredSources: "trusted jyotish source",
  publicationWindow: "1-7 июня 2026"
});

assert.equal(result.topicId, topic.id);
assert.equal(result.status, "visual_ready");
assert.equal(result.steps.length, 6);
assert.equal(result.steps[0].agentName, "Content Director");
assert.match(result.steps[0].internalPrompt, /content brief/i);
assert.match(result.finalTelegramText, /Юпитер/);
assert.match(result.visualBrief.imagePrompt, /editorial/i);
assert.equal(result.publishing.status, "draft_review");
