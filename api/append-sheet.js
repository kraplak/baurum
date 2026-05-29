const DEFAULT_SPREADSHEET_ID = "1GfCDBsWKi0IrhxdLZdIwmMjTfLfY9A_1g1iNE5cu6kE";
const DEFAULT_SHEET_NAME = "Лист1";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function parseGoogleCredentials() {
  const rawCredentials = process.env.GOOGLE_CREDENTIALS;
  if (rawCredentials) {
    const parsed = JSON.parse(rawCredentials);
    return {
      clientEmail: parsed.client_email,
      privateKey: parsed.private_key
    };
  }

  return {
    clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
    privateKey: process.env.GOOGLE_PRIVATE_KEY
  };
}

function normalizePrivateKey(privateKey) {
  return String(privateKey || "").replace(/\\n/g, "\n");
}

async function getAccessToken() {
  const { clientEmail, privateKey } = parseGoogleCredentials();
  const normalizedKey = normalizePrivateKey(privateKey);

  if (!clientEmail || !normalizedKey) {
    throw new Error("Missing Google service account credentials");
  }

  const crypto = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  const claims = {
    iss: clientEmail,
    scope: GOOGLE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    iat: now,
    exp: now + 3600
  };
  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(unsignedToken)
    .sign(normalizedKey, "base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

  const assertion = `${unsignedToken}.${signature}`;
  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });
  const tokenPayload = await tokenResponse.json().catch(() => null);

  if (!tokenResponse.ok || !tokenPayload?.access_token) {
    throw new Error(tokenPayload?.error_description || tokenPayload?.error || "Google auth failed");
  }

  return tokenPayload.access_token;
}

function parseSchedule(scheduledAt) {
  const raw = String(scheduledAt || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!match) {
    throw new Error("scheduledAt must look like 2026-06-05 12:00");
  }

  return {
    date: `${match[1]}.${match[2]}.${match[3]}`,
    time: `${match[4]}:${match[5]}`
  };
}

function cleanText(value) {
  return String(value || "").trim();
}

async function readBody(request) {
  let rawBody = "";
  for await (const chunk of request) {
    rawBody += chunk;
  }
  return JSON.parse(rawBody || "{}");
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Method not allowed" });
  }

  let payload;
  try {
    payload = await readBody(request);
  } catch {
    return sendJson(response, 400, { ok: false, error: "Invalid JSON body" });
  }

  let schedule;
  try {
    schedule = parseSchedule(payload.scheduledAt);
  } catch (error) {
    return sendJson(response, 400, { ok: false, error: error.message });
  }

  const title = cleanText(payload.title);
  const text = cleanText(payload.text);
  const imageUrl = cleanText(payload.imageUrl);

  if (!title && !text) {
    return sendJson(response, 400, { ok: false, error: "Missing title or text" });
  }

  const spreadsheetId = process.env.GOOGLE_SHEET_ID || DEFAULT_SPREADSHEET_ID;
  const sheetName = process.env.GOOGLE_SHEET_NAME || DEFAULT_SHEET_NAME;
  const range = `${sheetName}!A:G`;
  const row = [schedule.date, schedule.time, title, "", "", text, imageUrl];

  let accessToken;
  try {
    accessToken = await getAccessToken();
  } catch (error) {
    return sendJson(response, 501, {
      ok: false,
      error: "Google Sheets is not configured",
      setup:
        "Add GOOGLE_CREDENTIALS or GOOGLE_CLIENT_EMAIL + GOOGLE_PRIVATE_KEY to Vercel Environment Variables, share the sheet with the service account, then redeploy.",
      detail: error.message
    });
  }

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
    range
  )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const appendResponse = await fetch(appendUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ values: [row] })
  });
  const appendPayload = await appendResponse.json().catch(() => null);

  if (!appendResponse.ok) {
    return sendJson(response, appendResponse.status, {
      ok: false,
      error: "Google Sheets append failed",
      google: appendPayload
    });
  }

  return sendJson(response, 200, {
    ok: true,
    spreadsheetId,
    sheetName,
    updatedRange: appendPayload?.updates?.updatedRange,
    row
  });
};
