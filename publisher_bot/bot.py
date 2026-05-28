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
WORKSHEET_NAME = os.getenv("GOOGLE_WORKSHEET_NAME", "Лунный календарь")
LOCAL_TZ_NAME = os.getenv("LOCAL_TZ", "Europe/Warsaw")
SYNC_EVERY_MINUTES = int(os.getenv("SYNC_EVERY_MINUTES", "5"))
SHEET_HAS_HEADER = os.getenv("SHEET_HAS_HEADER", "true").lower() != "false"

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


def excel_date_to_datetime(value: Any) -> Optional[datetime]:
    if value in (None, "", " "):
        return None

    if isinstance(value, (int, float)):
        return datetime(1899, 12, 30) + timedelta(days=float(value))

    raw = str(value).strip()
    try:
        if raw.replace(".", "", 1).isdigit():
            return datetime(1899, 12, 30) + timedelta(days=float(raw))
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%Y.%m.%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, fmt)
        except ValueError:
            continue

    logger.warning("Unsupported date format: %s", raw)
    return None


def excel_time_to_hhmm(value: Any) -> Optional[str]:
    if value in (None, "", " "):
        return None

    if isinstance(value, (int, float)):
        total_minutes = int(float(value) * 24 * 60)
        hours = total_minutes // 60
        minutes = total_minutes % 60
        return f"{hours:02d}:{minutes:02d}"

    raw = str(value).strip()
    try:
        if raw.replace(".", "", 1).isdigit():
            total_minutes = int(float(raw) * 24 * 60)
            hours = total_minutes // 60
            minutes = total_minutes % 60
            return f"{hours:02d}:{minutes:02d}"
    except ValueError:
        pass

    for fmt in ("%H:%M", "%H.%M", "%H:%M:%S"):
        try:
            return datetime.strptime(raw, fmt).strftime("%H:%M")
        except ValueError:
            continue

    logger.warning("Unsupported time format: %s", raw)
    return None


def parse_run_at(date_value: Any, time_value: Any) -> Optional[datetime]:
    publish_date = excel_date_to_datetime(date_value)
    publish_time = excel_time_to_hhmm(time_value)
    if not publish_date or not publish_time:
        return None

    naive_dt = datetime.strptime(
        f"{publish_date.strftime('%Y-%m-%d')} {publish_time}",
        "%Y-%m-%d %H:%M",
    )
    return LOCAL_TZ.localize(naive_dt).astimezone(pytz.UTC)


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
    title = sanitize_html(str(row.get("title", "")).strip())
    body = sanitize_html(str(row.get("text", "")).strip())

    if title and body:
        return f"<b>{title}</b>\n\n{body}"
    return body or title


def build_job_id(row: Dict[str, Any], run_at_utc: datetime) -> str:
    payload = "|".join(
        [
            str(row.get("row_number", "")),
            run_at_utc.isoformat(),
            str(row.get("date", "")),
            str(row.get("time", "")),
            str(row.get("title", "")),
            str(row.get("text", "")),
        ]
    )
    digest = hashlib.sha1(payload.encode("utf-8")).hexdigest()
    return f"publish_{row.get('row_number')}_{digest}"


def header_map(raw_header: List[str]) -> Dict[str, int]:
    aliases = {
        "status": {"status", "статус"},
        "published_at": {"published_at", "опубликовано", "дата публикации факт"},
        "telegram_message_id": {"telegram_message_id", "message_id", "telegram id"},
        "publish_error": {"publish_error", "ошибка", "error"},
    }
    normalized = {value.strip().lower(): index + 1 for index, value in enumerate(raw_header)}
    result: Dict[str, int] = {}
    for key, names in aliases.items():
        for name in names:
            if name in normalized:
                result[key] = normalized[name]
                break
    return result


def load_rows() -> tuple[List[str], Dict[str, int], List[Dict[str, Any]]]:
    values = sheet.get_all_values()
    if not values:
        raise RuntimeError("Google Sheet is empty")

    raw_header = values[0] if SHEET_HAS_HEADER else []
    rows = values[1:] if SHEET_HAS_HEADER else values
    start_row = 2 if SHEET_HAS_HEADER else 1
    optional_cols = header_map(raw_header)

    records: List[Dict[str, Any]] = []
    for index, values_row in enumerate(rows, start=start_row):
        padded = values_row + [""] * max(0, 5 - len(values_row))
        record = {
            "row_number": index,
            "date": padded[0],
            "time": padded[1],
            "title": padded[2],
            "text": padded[3],
            "image_url": padded[4],
        }
        if optional_cols.get("status") and len(values_row) >= optional_cols["status"]:
            record["status"] = values_row[optional_cols["status"] - 1]
        records.append(record)

    return raw_header, optional_cols, records


def update_optional_columns(
    optional_cols: Dict[str, int],
    row_number: int,
    values: Dict[str, Any],
) -> None:
    cells = []
    for key, value in values.items():
        col = optional_cols.get(key)
        if col:
            cells.append(gspread.Cell(row_number, col, value))

    if cells:
        sheet.update_cells(cells, value_input_option="USER_ENTERED")


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


async def publish_row(row: Dict[str, Any], optional_cols: Dict[str, int], run_at_utc: datetime) -> None:
    row_number = int(row["row_number"])
    update_optional_columns(
        optional_cols,
        row_number,
        {"status": "publishing", "publish_error": ""},
    )

    try:
        message = format_message(row)
        image_url = str(row.get("image_url", "")).strip()
        if not message:
            raise RuntimeError("text is empty")

        if image_url:
            if len(message) <= 1024:
                sent = await bot.send_photo(chat_id=CHANNEL_ID, photo=image_url, caption=message)
            else:
                await bot.send_photo(chat_id=CHANNEL_ID, photo=image_url)
                sent = await bot.send_message(chat_id=CHANNEL_ID, text=message)
        else:
            sent = await bot.send_message(chat_id=CHANNEL_ID, text=message)

        update_optional_columns(
            optional_cols,
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
        update_optional_columns(
            optional_cols,
            row_number,
            {"status": "failed", "publish_error": error[:500]},
        )
        logger.exception("Failed to publish row %s: %s", row_number, error)
        await send_error_to_channel(error, traceback.format_exc())


def prepare_future_posts(records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    prepared: List[Dict[str, Any]] = []
    now_utc = utc_now()

    for row in records:
        status = str(row.get("status", "")).strip().lower()
        if status in {"published", "publishing", "failed", "skip", "archive", "archived"}:
            continue

        run_at_utc = parse_run_at(row.get("date"), row.get("time"))
        if not run_at_utc:
            continue
        if run_at_utc <= now_utc:
            continue
        if not str(row.get("text", "")).strip() and not str(row.get("title", "")).strip():
            continue

        row["run_at_utc"] = run_at_utc
        row["job_id"] = build_job_id(row, run_at_utc)
        prepared.append(row)

    return prepared


async def sync_schedule() -> None:
    try:
        _, optional_cols, records = await asyncio.to_thread(load_rows)
        posts = prepare_future_posts(records)
    except Exception as exc:  # noqa: BLE001
        error = f"Failed to read publishing table: {exc}"
        logger.exception(error)
        await send_error_to_channel(error, traceback.format_exc())
        return

    desired_job_ids = {post["job_id"] for post in posts}
    for post in posts:
        scheduler.add_job(
            publish_row,
            "date",
            run_date=post["run_at_utc"],
            id=post["job_id"],
            replace_existing=True,
            args=[post, optional_cols, post["run_at_utc"]],
            misfire_grace_time=300,
        )
        logger.info(
            "Planned row %s at %s",
            post["row_number"],
            post["run_at_utc"].isoformat(),
        )

    for job in scheduler.get_jobs():
        if job.id == "sync_posts":
            continue
        if job.id not in desired_job_ids:
            scheduler.remove_job(job.id)

    logger.info("Schedule sync complete. Future posts planned: %s", len(posts))


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
