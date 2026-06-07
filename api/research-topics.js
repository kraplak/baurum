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

function semanticTopicKey(topic) {
  const title = cleanText(topic?.title).toLowerCase();
  if ((title.includes("юпитер") || title.includes("jupiter") || title.includes("guru")) && (title.includes("рак") || title.includes("cancer") || title.includes("karka"))) {
    return "jupiter-cancer";
  }
  return title
    .split(/[:—-]/)[0]
    .replace(/["'«»()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLowQualitySplitTopic(topic) {
  const title = cleanText(topic?.title).toLowerCase();
  return title.includes("асцендент") || title.includes("ascendant");
}

function buildPrompt(payload) {
  const preferredSources = cleanText(payload.preferredSources);
  const dateFrom = cleanText(payload.dateFrom) || "2026-06-07";
  const dateTo = cleanText(payload.dateTo) || "2026-06-30";

  return [
    "Ты BAURUM Research & Source Agent.",
    "",
    `Задача: запусти новый web research и найди в интернете 30 реальных актуальных тем для Telegram/блога BAURUM на период ${dateFrom} - ${dateTo}.`,
    "",
    "Что искать:",
    "- реальные статьи, календарные заметки, Panchang/Vedic calendar, Jyotish transit articles, Hindu festival notes;",
    "- темы про Джйотиш, лунный календарь, Экадаши, Пурниму, Амавасью, транзиты планет, грахи и камни;",
    "- источники должны существовать и иметь URL;",
    "- можно использовать англоязычные источники, но темы вернуть на русском;",
    "- не придумывай события и положения планет;",
    "- не используй заранее заданный seed-list и не повторяй старые демо-темы, если не нашел их заново через web search;",
    "- каждая тема должна опираться на конкретную найденную страницу, календарное событие или статью;",
    "- все 30 тем должны быть уникальными: не повторяй одно и то же событие, title, URL или смысл под разными номерами;",
    "- если нашел одно событие на нескольких сайтах, выбери лучший источник и оставь только одну карточку;",
    "- собери смесь тем: календарные события, Jyotish-транзиты, Экадаши/Пурнима/Амавасья, грахи и камни, образовательные статьи по ведической традиции;",
    `- не включай события раньше ${dateFrom} и позже ${dateTo};`,
    "- не делай отдельные карточки вида 'один транзит для разных асцендентов/знаков' — это один источник и одна тема, а не 12 тем;",
    "- не повторяй Jupiter/Guru in Cancer больше одного раза; если эта тема найдена, оставь только лучшую карточку и переходи к другим событиям;",
    "- не возвращай 'служебные QA-карточки', cross-check warnings или внутренние заметки для редакции;",
    "- каждая карточка должна быть пригодна как самостоятельный контент-повод для BAURUM, а не как кусок одной большой статьи;",
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
    "Нужно ровно 30 уникальных тем. Не возвращай темы без источника. Не возвращай дубликаты."
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
  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw error;
    }
    return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
  }
}

const researchTopicsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    topics: {
      type: "array",
      minItems: 20,
      maxItems: 30,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          line: { type: "string" },
          summary: { type: "string" },
          angle: { type: "string" },
          risk: { type: "string" },
          source: { type: "string" },
          article: { type: "string" }
        },
        required: ["title", "line", "summary", "angle", "risk", "source", "article"]
      }
    }
  },
  required: ["topics"]
};

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

  const model = process.env.OPENAI_RESEARCH_MODEL || "gpt-4.1";
  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: buildPrompt(payload),
      tools: [{ type: "web_search", search_context_size: "medium" }],
      tool_choice: "required",
      text: {
        format: {
          type: "json_schema",
          name: "baurum_research_topics",
          strict: true,
          schema: researchTopicsSchema
        }
      },
      temperature: 0.4,
      max_output_tokens: 8000
    })
  });
  const openaiPayload = await openaiResponse.json().catch(() => null);

  if (!openaiResponse.ok) {
    console.error("OpenAI research failed", {
      status: openaiResponse.status,
      error: openaiPayload?.error
    });
    return sendJson(response, openaiResponse.status, {
      ok: false,
      error: openaiPayload?.error?.message || "OpenAI research failed",
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

  const seenTopics = new Set();
  const seenSemanticTopics = new Set();
  const topics = Array.isArray(parsed?.topics)
    ? parsed.topics.filter((topic) => {
        const key = [topic?.title, topic?.source].map((value) => cleanText(value).toLowerCase()).join("|");
        const semanticKey = semanticTopicKey(topic);
        if (!cleanText(topic?.source) || seenTopics.has(key) || seenSemanticTopics.has(semanticKey) || isLowQualitySplitTopic(topic)) {
          return false;
        }
        seenTopics.add(key);
        seenSemanticTopics.add(semanticKey);
        return true;
      })
    : [];
  return sendJson(response, 200, {
    ok: true,
    model,
    topics: topics.slice(0, 30)
  });
};
