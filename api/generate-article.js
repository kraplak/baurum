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
  const topic = payload.topic || {};
  const preferredSources = cleanText(payload.preferredSources);
  const rewriteInstruction = cleanText(payload.rewriteInstruction);

  return [
    "Напиши готовый Telegram-пост для BAURUM на русском языке.",
    "",
    "Тон BAURUM:",
    "- уверенный, живой, авторитетный;",
    "- ведическая астрология / Джйотиш без западной путаницы;",
    "- камень не декоративный символ, а природный проводник энергии планеты;",
    "- без медицинских обещаний и без обещаний удачи всем подряд;",
    "- если речь о камне, подчеркни: нужна натальная карта, качество камня и осознанный подбор;",
    "- не пиши служебные фразы вроде 'для BAURUM важно', 'пост о том', 'хороший материал';",
    "- не пересказывай источник сухо, сделай пригодный к публикации текст.",
    "",
    "Структура:",
    "1. Заголовок первой строкой.",
    "2. 4-7 коротких абзацев.",
    "3. Конкретный смысл для человека: характер, поведение, решение, энергия планеты.",
    "4. Мягкий переход к камню или консультации, если уместно.",
    "",
    "Тема:",
    `Название: ${cleanText(topic.title)}`,
    `Краткое содержание: ${cleanText(topic.summary)}`,
    `Угол: ${cleanText(topic.angle)}`,
    `Риск/ограничение: ${cleanText(topic.risk)}`,
    `Источник: ${cleanText(topic.source)}`,
    preferredSources ? `Предпочитаемые источники/контекст: ${preferredSources}` : "",
    rewriteInstruction ? `Правка пользователя: ${rewriteInstruction}` : "",
    "",
    "Верни только готовый текст поста. Без JSON, без комментариев."
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

  const prompt = buildPrompt(payload);
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: prompt,
      temperature: 0.7,
      max_output_tokens: 1200
    })
  });
  const openaiPayload = await openaiResponse.json().catch(() => null);

  if (!openaiResponse.ok) {
    return sendJson(response, openaiResponse.status, {
      ok: false,
      error: "OpenAI generation failed",
      openai: openaiPayload
    });
  }

  const text = extractOutputText(openaiPayload);
  if (!text) {
    return sendJson(response, 502, { ok: false, error: "OpenAI returned empty text" });
  }

  return sendJson(response, 200, {
    ok: true,
    model,
    text
  });
};
