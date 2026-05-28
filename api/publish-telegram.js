const TELEGRAM_API_BASE = "https://api.telegram.org";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID || process.env.TELEGRAM_TARGET_CHAT_ID;

  if (!token || !chatId) {
    return sendJson(response, 501, {
      ok: false,
      error: "Telegram is not configured",
      setup:
        "Add TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Vercel Environment Variables, then redeploy."
    });
  }

  let rawBody = "";
  let payload = {};
  try {
    for await (const chunk of request) {
      rawBody += chunk;
    }
    payload = JSON.parse(rawBody || "{}");
  } catch {
    return sendJson(response, 400, { ok: false, error: "Invalid JSON body" });
  }

  const text = String(payload.text || "").trim();
  if (!text) {
    return sendJson(response, 400, { ok: false, error: "Missing text" });
  }

  const telegramResponse = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const telegramResult = await telegramResponse.json().catch(() => null);

  if (!telegramResponse.ok || !telegramResult?.ok) {
    return sendJson(response, 502, {
      ok: false,
      error: "Telegram publish failed",
      telegram: telegramResult
    });
  }

  return sendJson(response, 200, {
    ok: true,
    messageId: telegramResult.result.message_id,
    chatId: telegramResult.result.chat.id
  });
};
