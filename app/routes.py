import os
import logging
from dotenv import load_dotenv
from fastapi import APIRouter, File, UploadFile, HTTPException
import httpx
from app.ocr import extract_text_and_total

load_dotenv()

logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

router = APIRouter()

TS_BACKEND_URL = os.getenv("TS_BACKEND_URL", "http://localhost:3000/api/v1/nota")
INTERNAL_AUTH_TOKEN = os.getenv("INTERNAL_AUTH_TOKEN", "")
CALLBACK_TIMEOUT_S = float(os.getenv("CALLBACK_TIMEOUT_S", "10"))
SYNC_CALLBACK_ENABLED = os.getenv("SYNC_CALLBACK_ENABLED", "true").lower() == "true"

if not INTERNAL_AUTH_TOKEN:
    logger.warning(
        "INTERNAL_AUTH_TOKEN tidak di-set! Callback ke Backend TS akan di-skip."
    )

ALLOWED_MIME = {"image/jpeg", "image/jpg", "image/png", "image/webp"}
MAX_FILE_MB = 15


@router.post("/ocr")
async def read_ocr(file: UploadFile = File(..., alias="image")):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(
            status_code=400,
            detail=f"File harus berupa gambar. Dapat: {file.content_type}",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail=f"File terlalu besar. Maks {MAX_FILE_MB}MB",
        )

    try:
        logger.info(f"Memulai proses OCR untuk file: {file.filename} ({len(file_bytes)} bytes)")
        result = await extract_text_and_total_bytes(file_bytes, file.filename or "receipt.jpg")

        if result.get("status") == "error":
            logger.error(f"OCR gagal: {result.get('error')}")
            raise HTTPException(
                status_code=500,
                detail=f"OCR processing error: {result.get('error')}",
            )

        if result["total"] is None:
            logger.warning("OCR berhasil tapi gagal menemukan angka nominal (total)")

        result["synced_to_ts"] = False

        if SYNC_CALLBACK_ENABLED and INTERNAL_AUTH_TOKEN:
            payload = {
                "merchant_info": "Detected from OCR",
                "raw_text": result["raw_text"],
                "total_amount": result["total"],
                "filename": file.filename,
                "status": result["status"],
            }

            try:
                async with httpx.AsyncClient(timeout=CALLBACK_TIMEOUT_S) as client:
                    response = await client.post(
                        TS_BACKEND_URL,
                        json=payload,
                        headers={"Authorization": f"Bearer {INTERNAL_AUTH_TOKEN}"},
                    )

                if response.status_code == 200:
                    logger.info(f"Berhasil sinkronisasi data ke Backend TS: {TS_BACKEND_URL}")
                    result["synced_to_ts"] = True
                else:
                    logger.error(
                        f"Backend TS menolak data: {response.status_code} - {response.text[:200]}"
                    )
            except httpx.TimeoutException:
                logger.error(f"Timeout {CALLBACK_TIMEOUT_S}s saat menghubungi Backend TS")
            except Exception as e:
                logger.error(f"Gagal menghubungi Backend TS: {type(e).__name__}: {e}")
        elif not SYNC_CALLBACK_ENABLED:
            logger.info("SYNC_CALLBACK_ENABLED=false, skip callback")
        elif not INTERNAL_AUTH_TOKEN:
            logger.warning("Skip callback: INTERNAL_AUTH_TOKEN kosong")

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error pada sistem OCR: {e}")
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan internal: {e}")


async def extract_text_and_total_bytes(file_bytes: bytes, filename: str):
    from app.ocr import extract_text_and_total
    from fastapi import UploadFile
    import io

    fake_file = UploadFile(filename=filename, file=io.BytesIO(file_bytes))
    return await extract_text_and_total(fake_file)
