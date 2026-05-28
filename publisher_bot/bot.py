import ast
import asyncio
import hashlib
import html
import json
import logging
import os
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import gspread
import pytz
from aiogram import Bot
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from dotenv import load_dotenv
from google.oauth2.service_account import Credentials

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)

TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHANNEL_ID = os.getenv("CHANNEL_ID")
ERROR_CHANNEL_ID = os.getenv("ERROR_CHANNEL_ID")
SHEET_ID = os.getenv("GOOGLE_SHEET_ID")
WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME", "Content Publishing Queue")
LOCAL_TZ_NAME = os.getenv("LOCAL_TZ", "Europe/Warsaw")
SYNC_EVERY_MINUTES = int(os.getenv("SYNC_EVERY_MINUTES", "5"))

if not TELEGRAM_TOKEN or not CHANNEL_ID:
    raise RuntimeError("TELEGRAM_TOKEN and CHANNEL_ID must be provided")

if not SHEET_ID:
    raise RuntimeError("GOOGLE_SHEET_ID must be provided")

try:
    LOCAL_TZ = pytz.timezone(LOCAL_TZ_NAME)
except pytz.UnknownTimeZoneError:
    logger.warning("Unknown LOCAL_TZ '%s', falling back to UTC", LOCAL_TZ_NAME)
    LOCAL_TZ = pytz.UTC

SCOPE = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

PUBLISHABLE_STATUSES = {"approved", "scheduled"}
PUBLISHABLE_CHANNELS = {"telegram", "tg", ""}

REQUIRED_HEADERS = [
    "status",
    "channel",
    "scheduled_at",
    "post_text",
]

bot = Bot(
    token=TELEGRAM_TOKEN,
    default=DefaultBotProperties(parse_mode=ParseMode.HTML),
)
scheduler = AsyncIOScheduler(timezone=pytz.UTC)


def load_service_account_credentials() -> Credentials:
    raw = os.getenv("GOOGLE_CREDENTIALS")
    if raw:
        raw_stripped = raw.strip()
        if os.path.exists(raw_stripped):
            return Credentials.from_service_account_file(raw_stripped, scopes=SCOPE)

        for parser in (json.loads, ast.literal_eval):
            try:
                parsed = parser(raw)
                if isinstance(parsed, str):
                    parsed = json.loads(parsed)
                if isinstance(parsed, dict):
                    return Credentials.from_service_account_info(parsed, scopes=SCOPE)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Failed to parse GOOGLE_CREDENTIALS via %s: %s", parser.__name__, exc)

    creds_path = (
        os.getenv("GOOGLE_CREDENTIALS_FILE")
        or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        or "credentials.json"
    )
    if creds_path and os.path.exists(creds_path):
        return Credentials.from_service_account_file(creds_path, scopes=SCOPE)

    raise RuntimeError(
        "Missing Google credentials: set GOOGLE_CREDENTIALS or GOOGLE_CREDENTIALS_FILE"
    )


def get_worksheet() -> gspread.Worksheet:
    client = gspread.authorize(load_service_account_credentials())
    spreadsheet = client.open_by_key(SHEET_ID)
    return spreadsheet.worksheet(WORKSHEET_NAME)


sheet = get_worksheet()


def utc_now() -> datetime:
    return datetime.now(pytz.UTC)


def now_for_sheet() -> str:
    return utc_now().astimezone(LOCAL_TZ).strftime("%Y-%m-%d %H:%M:%S")


def parse_datetime(value: Any) -> Optional[datetime]:
    if value in (None, "", " "):
        return None

    if isinstance(value, (int, float)):
        return pytz.UTC.localize(datetime(1899, 12, 30) + timedelta(days=float(value)))

    raw = str(value).strip()
    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%d.%m.%Y %H:%M:%S",
        "%d.%m.%Y %H:%M",
        "%Y-%m-%d",
        "%d.%m.%Y",
    )
    for fmt in formats:
        try:
            parsed = datetime.strptime(raw, fmt)
            if "%H" not in fmt:
                parsed = parsed.replace(hour=9, minute=0)
            return LOCAL_TZ.localize(parsed).astimezone(pytz.UTC)
        except ValueError:
            continue

    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            return LOCAL_TZ.localize(parsed).astimezone(pytz.UTC)
        return parsed.astimezone(pytz.UTC)
    except ValueError:
        logger.warning("Unsupported scheduled_at format: %s", raw)
        return None


def sanitize_html(text: str) -> str:
    if not text:
        return ""

    allowed_tags = ["a", "b", "i", "u", "s", "blockquote", "pre", "code"]
    escaped = html.escape(text)

    import re

    tag_pattern = re.compile(
        r"<(/?)(" + "|".join(allowed_tags) + r")(\s[^>]*)?>",
        re.IGNORECASE,
    )
    for match in tag_pattern.finditer(text):
        tag_text = match.group(0)
        escaped = escaped.replace(html.escape(tag_text), tag_text)

    return escaped


def format_message(row: Dict[str, Any]) -> str:
    title = str(row.get("title", "")).strip()
    post_text = sanitize_html(str(row.get("post_text", "")).strip())
    cta = sanitize_html(str(row.get("cta", "")).strip())

    parts = []
    if title and not post_text.startswith("<b>"):
        parts.append(f"<b>{sanitize_html(title)}</b>")
    if post_text:
        parts.append(post_text)
    if cta:
        parts.append(cta)

    return "\n\n".join(parts).strip()


def build_job_id(row_number: int, row: Dict[str, Any], run_at_utc: datetime) -> str:
    content_id = str(row.get("content_id", "")).strip()
    payload = "|".join(
        [
            str(row_number),
            content_id,
            run_at_utc.isoformat(),
            str(row.get("post_text", "")),
        ]
    )
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()
    return f"publish_{row_number}_{digest}"


async def send_error_to_channel(error_message: str, error_details: str = "") -> None:
    if not ERROR_CHANNEL_ID:
        return

    try:
        text = f"<b>BAURUM publisher error</b>\n\n<pre>{sanitize_html(error_message)}</pre>"
        if error_details:
            text += f"\n\n<pre>{sanitize_html(error_details[:1500])}</pre>"
        await bot.send_message(chat_id=ERROR_CHANNEL_ID, text=text)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to send error notification: %s", exc)


def load_records() -> tuple[List[str], List[Dict[str, Any]]]:
    values = sheet.get_all_values()
    if not values:
        raise RuntimeError("Google Sheet is empty")

    headers = [header.strip() for header in values[0]]
    missing = [header for header in REQUIRED_HEADERS if header not in headers]
    if missing:
        raise RuntimeError(f"Missing required columns: {', '.join(missing)}")

    records: List[Dict[str, Any]] = []
    for offset, row_values in enumerate(values[1:], start=2):
        record = dict(zip(headers, row_values))
        record["_row_number"] = offset
        records.append(record)

    return headers, records


def column_map(headers: List[str]) -> Dict[str, int]:
    return {header: index + 1 for index, header in enumerate(headers)}


def get_cell_update(
    cols: Dict[str, int],
    row_number: int,
    key: str,
    value: Any,
) -> Optional[gspread.Cell]:
    col = cols.get(key)
    if not col:
        return None
    return gspread.Cell(row_number, col, value)


def update_row(headers: List[str], row_number: int, values: Dict[str, Any]) -> None:
    cols = column_map(headers)
    cells = [
        cell
        for key, value in values.items()
        if (cell := get_cell_update(cols, row_number, key, value)) is not None
    ]
    if cells:
        sheet.update_cells(cells, value_input_option="USER_ENTERED")


def increment_attempt_count(row: Dict[str, Any]) -> int:
    raw = str(row.get("attempt_count", "")).strip()
    try:
        return int(raw or "0") + 1
    except ValueError:
        return 1


async def publish_row(headers: List[str], row: Dict[str, Any], run_at_utc: datetime) -> None:
    row_number = int(row["_row_number"])
    update_row(
        headers,
        row_number,
        {
            "status": "publishing",
            "last_attempt_at": now_for_sheet(),
            "attempt_count": increment_attempt_count(row),
            "publish_error": "",
        },
    )

    try:
        message = format_message(row)
        if not message:
            raise RuntimeError("post_text is empty")

        sent = await bot.send_message(chat_id=CHANNEL_ID, text=message)
        update_row(
            headers,
            row_number,
            {
                "status": "published",
                "published_at": now_for_sheet(),
                "telegram_message_id": getattr(sent, "message_id", ""),
                "publish_error": "",
            },
        )
        logger.info("Published row %s scheduled for %s", row_number, run_at_utc.isoformat())
    except Exception as exc:  # noqa: BLE001
        error = str(exc)
        update_row(
            headers,
            row_number,
            {
                "status": "failed",
                "publish_error": error[:500],
                "last_attempt_at": now_for_sheet(),
            },
        )
        logger.exception("Failed to publish row %s: %s", row_number, error)
        await send_error_to_channel(error, traceback.format_exc())


def prepare_due_posts(headers: List[str], records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    prepared: List[Dict[str, Any]] = []
    current_utc = utc_now()

    for row in records:
        status = str(row.get("status", "")).strip().lower()
        channel = str(row.get("channel", "")).strip().lower()
        run_at_utc = parse_datetime(row.get("scheduled_at"))
        post_text = str(row.get("post_text", "")).strip()

        if status not in PUBLISHABLE_STATUSES:
            continue
        if channel not in PUBLISHABLE_CHANNELS:
            continue
        if not run_at_utc or not post_text:
            continue
        if run_at_utc > current_utc:
            continue

        row["run_at_utc"] = run_at_utc
        row["job_id"] = build_job_id(int(row["_row_number"]), row, run_at_utc)
        prepared.append(row)

    return prepared


async def sync_schedule() -> None:
    try:
        headers, records = await asyncio.to_thread(load_records)
        due_posts = prepare_due_posts(headers, records)
    except Exception as exc:  # noqa: BLE001
        error = f"Failed to read publishing queue: {exc}"
        logger.exception(error)
        await send_error_to_channel(error, traceback.format_exc())
        return

    for row in due_posts:
        try:
            await publish_row(headers, row, row["run_at_utc"])
        except Exception as exc:  # noqa: BLE001
            error = f"Unexpected publish failure for row {row.get('_row_number')}: {exc}"
            logger.exception(error)
            await send_error_to_channel(error, traceback.format_exc())

    logger.info("Sync complete. Due posts published: %s", len(due_posts))


async def main() -> None:
    try:
        scheduler.start()
        await sync_schedule()
        scheduler.add_job(
            sync_schedule,
            "interval",
            minutes=SYNC_EVERY_MINUTES,
            id="sync_posts",
            replace_existing=True,
        )
        logger.info(
            "BAURUM publisher started. Sheet=%s worksheet=%s timezone=%s interval=%sm",
            SHEET_ID,
            WORKSHEET_NAME,
            LOCAL_TZ.zone,
            SYNC_EVERY_MINUTES,
        )

        try:
            while True:
                await asyncio.sleep(3600)
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down publisher...")
        finally:
            scheduler.shutdown(wait=False)
            await bot.session.close()
    except Exception as exc:  # noqa: BLE001
        error = f"Critical publisher error: {exc}"
        logger.exception(error)
        await send_error_to_channel(error, traceback.format_exc())
        raise


if __name__ == "__main__":
    asyncio.run(main())
