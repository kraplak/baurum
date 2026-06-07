function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
  }
  return JSON.parse(rawBody || "{}");
}

function cleanText(value) {
  return String(value || "").trim();
}

function buildPrompt(payload) {
  const preferredSources = cleanText(payload.preferredSources);
  const dateFrom = cleanText(payload.dateFrom) || "2026-06-07";
  const dateTo = cleanText(payload.dateTo) || "2026-06-30";

  return [
    "Ты BAURUM Research & Source Agent.",
    "",
    `Задача: найди в интернете 30 реальных актуальных тем для Telegram/блога BAURUM на период ${dateFrom} - ${dateTo}.`,
    "",
    "Что искать:",
    "- реальные статьи, календарные заметки, Panchang/Vedic calendar, Jyotish transit articles, Hindu festival notes;",
    "- темы про Джйотиш, лунный календарь, Экадаши, Пурниму, Амавасью, транзиты планет, грахи и камни;",
    "- источники должны существовать и иметь URL;",
    "- можно использовать англоязычные источники, но темы вернуть на русском;",
    "- не придумывай события и положения планет;",
    "- если источник western/tropical, явно пометь риск, но лучше отдавай приоритет Jyotish/sidereal;",
    "- не ограничивайся заранее заданными темами, ищи реальные найденные публикации.",
    preferredSources ? `Предпочитаемые источники от пользователя: ${preferredSources}` : "",
    "",
    "Верни строго JSON без markdown:",
    "{",
    '  "topics": [',
    "    {",
    '      "title": "русское название темы",',
    '      "line": "тип источника · дата/период · relevance score",',
    '      "summary": "400-500 символов: что найдено в источнике и почему это может быть темой",',
    '      "angle": "BAURUM angle: как раскрыть это для аудитории бренда",',
    '      "risk": "что нельзя обещать / где нужна осторожность",',
    '      "source": "https://...",',
    '      "article": "короткий source card с фактом, датой, системой астрологии и применением"',
    "    }",
    "  ]",
    "}",
    "",
    "Нужно ровно 30 тем. Не возвращай темы без источника."
  ]
    .filter(Boolean)
    .join("\n");
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string") {
    return payload.output_text.trim();
  }

  const chunks = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") {
        chunks.push(content.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

function parseJsonText(text) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(cleaned);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Method not allowed" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return sendJson(response, 501, {
      ok: false,
      error: "OpenAI is not configured",
      setup: "Add OPENAI_API_KEY in Vercel Environment Variables, then redeploy."
    });
  }

  let payload;
  try {
    payload = await readBody(request);
  } catch {
    return sendJson(response, 400, { ok: false, error: "Invalid JSON body" });
  }

  const model = process.env.OPENAI_RESEARCH_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload),
      tools: [{ type: "web_search_preview", search_context_size: "medium" }],
      temperature: 0.4,
      max_output_tokens: 8000
    })
  });
  const openaiPayload = await openaiResponse.json().catch(() => null);

  if (!openaiResponse.ok) {
    return sendJson(response, openaiResponse.status, {
      ok: false,
      error: "OpenAI research failed",
      openai: openaiPayload
    });
  }

  const text = extractOutputText(openaiPayload);
  let parsed;
  try {
    parsed = parseJsonText(text);
  } catch {
    return sendJson(response, 502, {
      ok: false,
      error: "Research returned invalid JSON",
      text
    });
  }

  const topics = Array.isArray(parsed?.topics) ? parsed.topics : [];
  return sendJson(response, 200, {
    ok: true,
    model,
    topics: topics.slice(0, 30)
  });
};
