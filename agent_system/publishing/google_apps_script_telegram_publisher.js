/**
 * BAURUM Google Sheets -> Telegram publisher.
 *
 * Use this in the Google Sheet that contains the "Content Publishing Queue" tab.
 *
 * Script Properties required:
 * - TELEGRAM_BOT_TOKEN
 * - TELEGRAM_CHAT_ID
 *
 * Recommended trigger:
 * - publishDueRows every 5 or 10 minutes.
 */

const QUEUE_SHEET_NAME = "Content Publishing Queue";
const TIMEZONE = "Europe/Warsaw";

const STATUS = {
  APPROVED: "approved",
  SCHEDULED: "scheduled",
  PUBLISHING: "publishing",
  PUBLISHED: "published",
  FAILED: "failed"
};

function publishDueRows() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty("TELEGRAM_BOT_TOKEN");
  const chatId = props.getProperty("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    throw new Error("Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in Script Properties.");
  }

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(QUEUE_SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet "${QUEUE_SHEET_NAME}" not found.`);
  }

  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return;

  const headers = values[0].map(String);
  const column = createColumnMap(headers);
  const now = new Date();

  values.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const status = getCell(row, column, "status").toLowerCase().trim();
    const scheduledAt = parseDate(getCell(row, column, "scheduled_at"));
    const postText = getCell(row, column, "post_text").trim();

    if (!postText) return;
    if (![STATUS.APPROVED, STATUS.SCHEDULED].includes(status)) return;
    if (!scheduledAt || scheduledAt > now) return;

    setCell(sheet, rowNumber, column, "status", STATUS.PUBLISHING);
    setCell(sheet, rowNumber, column, "last_attempt_at", formatDate(now));

    try {
      const result = sendTelegramMessage(token, chatId, postText);
      setCell(sheet, rowNumber, column, "status", STATUS.PUBLISHED);
      setCell(sheet, rowNumber, column, "published_at", formatDate(new Date()));
      setCell(sheet, rowNumber, column, "telegram_message_id", result.message_id || "");
      setCell(sheet, rowNumber, column, "publish_error", "");
    } catch (error) {
      setCell(sheet, rowNumber, column, "status", STATUS.FAILED);
      setCell(sheet, rowNumber, column, "publish_error", error.message);
    } finally {
      incrementAttemptCount(sheet, rowNumber, row, column);
    }
  });
}

function createTelegramPublisherTrigger() {
  ScriptApp.newTrigger("publishDueRows").timeBased().everyMinutes(10).create();
}

function sendTelegramMessage(token, chatId, text) {
  const response = UrlFetchApp.fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });

  const body = JSON.parse(response.getContentText());
  if (!body.ok) {
    throw new Error(body.description || "Telegram API error");
  }

  return body.result;
}

function createColumnMap(headers) {
  return headers.reduce((map, header, index) => {
    map[header] = index;
    return map;
  }, {});
}

function getCell(row, column, name) {
  const index = column[name];
  if (index === undefined) return "";
  return String(row[index] || "");
}

function setCell(sheet, rowNumber, column, name, value) {
  const index = column[name];
  if (index === undefined) return;
  sheet.getRange(rowNumber, index + 1).setValue(value);
}

function incrementAttemptCount(sheet, rowNumber, row, column) {
  const current = Number(getCell(row, column, "attempt_count") || 0);
  setCell(sheet, rowNumber, column, "attempt_count", current + 1);
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(date) {
  return Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd HH:mm:ss");
}
