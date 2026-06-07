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
  if (title.includes("пурнима") || title.includes("полнолуние") || title.includes("purnima") || title.includes("full moon")) {
    return "purnima";
  }
  return title
    .split(/[:—-]/)[0]
    .replace(/["'«»()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isLowQualitySplitTopic(topic) {
  const title = cleanText(topic?.title).toLowerCase();
  const line = cleanText(topic?.line).toLowerCase();
  return (
    title.includes("асцендент") ||
    title.includes("ascendant") ||
    title.includes("вне периода") ||
    line.includes("вне периода") ||
    line.includes("· low") ||
    /^луна\s+в\s+/.test(title) ||
    /^moon\s+in\s+/.test(title)
  );
}

function isArticleTopic(topic) {
  return cleanText(topic?.kind).toLowerCase() === "article";
}

function dayFromIsoDate(value, fallback) {
  const match = cleanText(value).match(/^\d{4}-\d{2}-(\d{2})$/);
  return match ? Number(match[1]) : fallback;
}

function extractJuneDays(topic) {
  const text = [topic?.title, topic?.line, topic?.summary, topic?.article].map(cleanText).join(" ");
  const days = [];
  const pattern = /(\d{1,2})(?:\s*[–-]\s*(\d{1,2}))?\s*(?:июня|june)/gi;
  let match;
  while ((match = pattern.exec(text))) {
    days.push(Number(match[1]));
    if (match[2]) {
      days.push(Number(match[2]));
    }
  }
  return days.filter((day) => Number.isFinite(day));
}

function isInsideRequestedWindow(topic, payload) {
  if (isArticleTopic(topic)) return true;
  const fromDay = dayFromIsoDate(payload.dateFrom, 7);
  const toDay = dayFromIsoDate(payload.dateTo, 30);
  const days = extractJuneDays(topic);
  if (!days.length) return true;
  return Math.max(...days) >= fromDay && Math.min(...days) <= toDay;
}

function buildPrompt(payload) {
  const preferredSources = cleanText(payload.preferredSources);
  const excludedSources = Array.isArray(payload.excludedSources)
    ? payload.excludedSources.map(cleanText).filter(Boolean).slice(0, 120)
    : [];
  const dateFrom = cleanText(payload.dateFrom) || "2026-06-07";
  const dateTo = cleanText(payload.dateTo) || "2026-06-30";

  return [
    "Ты BAURUM Research & Source Agent.",
    "",
    "Задача: запусти новый web research и найди 20 реальных источников для будущих BAURUM-постов.",
    "",
    "Состав выдачи:",
    "- примерно 15 тем типа article: реальные статьи, написанные людьми, без обязательной привязки к датам периода;",
    `- примерно 5 тем типа event: календарные события, Panchang/Vedic calendar, Jyotish transit articles, Hindu festival notes за период ${dateFrom} - ${dateTo};`,
    "",
    "Что искать в article:",
    "- подробные статьи про Джйотиш, грахи, ретроградность, экзальтацию/дебилитацию, накшатры, йоги, даши, упайи, камни, мантры, Экадаши, Пурниму, Амавасью;",
    "- статьи вроде: что значит ретроградный Юпитер, как проявляется Меркурий в экзальтации, как работает желтый сапфир в традиции, что такое Гаджакесари-йога;",
    "- также ищи evergreen-статьи: 9 планет Джйотиш, 27 накшатр, Раху/Кету, Шани Саде-Сати, Мангал Доша, Будха/Меркурий и речь, Шукры/Венера и вкус, Сурья и рубин, Чандра и жемчуг, Мангала и коралл, Сатурн и синий сапфир;",
    "- это должны быть именно страницы со смысловым текстом, а не короткие календарные строки;",
    "- если не хватает актуальных статей, добирай качественными evergreen-статьями без привязки к датам;",
    "",
    "Что искать в event:",
    "- события в указанном периоде: Экадаши, Пурнима, Амавасья, важные ведические праздники, заметные Jyotish-транзиты;",
    "",
    "Общие правила:",
    "- источники должны существовать и иметь URL;",
    "- можно использовать англоязычные источники, но темы вернуть на русском;",
    "- не придумывай события и положения планет;",
    "- не используй заранее заданный seed-list и не повторяй старые демо-темы, если не нашел их заново через web search;",
    "- каждая тема должна опираться на конкретную найденную страницу;",
    "- все 20 тем должны быть уникальными: не повторяй одно и то же событие, title, URL или смысл под разными номерами;",
    "- если нашел одно событие на нескольких сайтах, выбери лучший источник и оставь только одну карточку;",
    `- для kind=event не включай события раньше ${dateFrom} и позже ${dateTo};`,
    "- не делай отдельные карточки вида 'один транзит для разных асцендентов/знаков' — это один источник и одна тема, а не 12 тем;",
    "- не повторяй Jupiter/Guru in Cancer больше одного раза; если эта тема найдена, оставь только лучшую карточку и переходи к другим событиям;",
    "- не возвращай 'служебные QA-карточки', cross-check warnings или внутренние заметки для редакции;",
    "- каждая карточка должна быть пригодна как самостоятельный контент-повод для BAURUM, а не как кусок одной большой статьи;",
    "- если источник western/tropical, пометь это в line, но лучше отдавай приоритет Jyotish/sidereal;",
    "- не ограничивайся заранее заданными темами, ищи реальные найденные публикации.",
    preferredSources ? `Предпочитаемые источники от пользователя: ${preferredSources}` : "",
    excludedSources.length ? `Не используй эти уже найденные URL: ${excludedSources.join(", ")}` : "",
    "",
    "Верни строго JSON без markdown:",
    "{",
    '  "topics": [',
    "    {",
    '      "kind": "article или event",',
    '      "title": "русское название темы",',
    '      "line": "article/event · источник/система · дата/период если есть · relevance",',
    '      "summary": "500-700 символов: полноценная выжимка найденной статьи или события. Что там сказано, какие ключевые идеи, структура мысли автора, важные детали и почему это может стать постом.",',
    '      "angle": "коротко: как раскрыть это в большом BAURUM-посте",',
    '      "risk": "короткая техническая пометка, можно пустую строку",',
    '      "source": "https://...",',
    '      "article": "500-700 символов пересказа источника простым русским языком: что именно написано, какие тезисы, примеры, выводы и полезный смысл. Без служебных фраз и без риск-блока."',
    "    }",
    "  ]",
    "}",
    "",
    "Нужно ровно 20 уникальных тем: минимум 15 article и максимум 5 event. Не возвращай темы без источника. Не возвращай дубликаты."
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
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          kind: { type: "string", enum: ["article", "event"] },
          title: { type: "string" },
          line: { type: "string" },
          summary: { type: "string" },
          angle: { type: "string" },
          risk: { type: "string" },
          source: { type: "string" },
          article: { type: "string" }
        },
        required: ["kind", "title", "line", "summary", "angle", "risk", "source", "article"]
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
        if (
          !cleanText(topic?.source) ||
          seenTopics.has(key) ||
          seenSemanticTopics.has(semanticKey) ||
          isLowQualitySplitTopic(topic) ||
          !isInsideRequestedWindow(topic, payload)
        ) {
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
    topics: topics.slice(0, 20)
  });
};
