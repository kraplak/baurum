const HUBSPOT_BASE = "https://api.hubapi.com";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

async function readBody(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;

  const contentType = String(request.headers["content-type"] || "").toLowerCase();
  if (contentType.includes("application/json")) return JSON.parse(raw || "{}");

  const params = new URLSearchParams(raw);
  return Object.fromEntries(params.entries());
}

function clean(value) {
  return String(value || "").trim();
}

function first(payload, names) {
  for (const name of names) {
    const value = clean(payload[name]);
    if (value) return value;
  }
  return "";
}

function requestType(payload) {
  const form = first(payload, ["formname", "tildaspec-formname", "Form name"]).toLowerCase();
  if (/jyotish|natal|натал/.test(form)) return "natal_chart";
  if (/special|custom|кольц|ring/.test(form)) return "special_order";
  if (/subscribe|newsletter|подпис/.test(form)) return "newsletter";
  return "general_inquiry";
}

function language(payload) {
  const page = first(payload, ["referrer", "page", "page_url"]);
  if (/\/ru(?:\/|$|#)/i.test(page)) return "ru";
  if (/\/en(?:\/|$|#)/i.test(page)) return "en";
  return "en";
}

async function hubspot(path, options = {}) {
  const response = await fetch(`${HUBSPOT_BASE}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${process.env.HUBSPOT_SERVICE_KEY}`,
      "content-type": "application/json",
      ...(options.headers || {})
    }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.message || `HubSpot request failed (${response.status})`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

async function upsertContact(email, properties) {
  try {
    return await hubspot(`/crm/v3/objects/contacts/${encodeURIComponent(email)}?idProperty=email`, {
      method: "PATCH",
      body: JSON.stringify({ properties })
    });
  } catch (error) {
    if (error.status !== 404) throw error;
    return hubspot("/crm/v3/objects/contacts", {
      method: "POST",
      body: JSON.stringify({ properties: { email, ...properties } })
    });
  }
}

async function findDealByRequestId(requestId) {
  if (!requestId) return null;
  const result = await hubspot("/crm/v3/objects/deals/search", {
    method: "POST",
    body: JSON.stringify({
      filterGroups: [{ filters: [{ propertyName: "baurum_tilda_request_id", operator: "EQ", value: requestId }] }],
      properties: ["dealname", "baurum_tilda_request_id"],
      limit: 1
    })
  });
  return result.results?.[0] || null;
}

async function createDeal(contactId, payload, type, requestId) {
  const existing = await findDealByRequestId(requestId);
  if (existing) return existing;

  const name = first(payload, ["Name", "name", "Имя"]) || first(payload, ["Email", "email"]);
  const formName = first(payload, ["formname", "tildaspec-formname", "Form name"]) || "Website inquiry";
  return hubspot("/crm/v3/objects/deals", {
    method: "POST",
    body: JSON.stringify({
      properties: {
        dealname: `${formName} - ${name}`,
        pipeline: "default",
        dealstage: "appointmentscheduled",
        baurum_request_type: type,
        baurum_source_page: first(payload, ["referrer", "page", "page_url"]),
        baurum_tilda_request_id: requestId
      },
      associations: [{
        to: { id: contactId },
        types: [{ associationCategory: "HUBSPOT_DEFINED", associationTypeId: 3 }]
      }]
    })
  });
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("allow", "POST");
    return sendJson(response, 405, { ok: false, error: "Method not allowed" });
  }

  if (!process.env.HUBSPOT_SERVICE_KEY || !process.env.TILDA_WEBHOOK_SECRET) {
    return sendJson(response, 501, { ok: false, error: "Webhook is not configured" });
  }

  const providedSecret = clean(request.headers["x-baurum-webhook-secret"] || request.query?.secret);
  if (providedSecret !== process.env.TILDA_WEBHOOK_SECRET) {
    return sendJson(response, 401, { ok: false, error: "Unauthorized" });
  }

  let payload;
  try {
    payload = await readBody(request);
  } catch {
    return sendJson(response, 400, { ok: false, error: "Invalid request body" });
  }

  const email = first(payload, ["Email", "email", "E-mail", "Contact e-mail"]);
  if (!email || !email.includes("@")) {
    return sendJson(response, 400, { ok: false, error: "A valid email is required" });
  }

  const type = requestType(payload);
  const requestId = first(payload, ["requestid", "tranid", "tilda_request_id"]);
  const contactProperties = {
    firstname: first(payload, ["Name", "name", "Имя"]),
    phone: first(payload, ["Phone", "phone", "Телефон"]),
    baurum_request_type: type,
    baurum_page_url: first(payload, ["referrer", "page", "page_url"]),
    baurum_language: language(payload),
    baurum_birth_date: first(payload, ["Date of birth", "Дата рождения"]),
    baurum_birth_time: first(payload, ["Time of birth", "Time", "Время рождения"]),
    baurum_birth_city: first(payload, ["Place", "City", "Место рождения", "Город"]),
    baurum_preferred_design: first(payload, ["Design", "Дизайн"]),
    baurum_preferred_metal: first(payload, ["ring metal", "Metal", "Металл"]),
    baurum_preferred_gemstone: first(payload, ["Gemstone", "Камень"])
  };

  Object.keys(contactProperties).forEach((key) => {
    if (!contactProperties[key]) delete contactProperties[key];
  });

  try {
    const contact = await upsertContact(email, contactProperties);
    const deal = type === "newsletter" ? null : await createDeal(contact.id, payload, type, requestId);
    return sendJson(response, 200, { ok: true, contactId: contact.id, dealId: deal?.id || null, type });
  } catch (error) {
    console.error("Tilda to HubSpot failed", error.payload || error.message);
    return sendJson(response, 502, { ok: false, error: "HubSpot delivery failed", detail: error.message });
  }
};

module.exports._test = { requestType, language, first };
