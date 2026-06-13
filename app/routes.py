from fastapi import APIRouter, File, UploadFile, HTTPException
from app.ocr import extract_text_and_total
import httpx
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

TS_BACKEND_URL = "http://your-ts-backend-api.com/v1/bills/process-ocr"
INTERNAL_AUTH_TOKEN = "YUPAY_SECRET_KEY_123"

@router.post("/ocr")
async def read_ocr(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File harus berupa gambar (png/jpg/jpeg)")

    try:
        logger.info(f"Memulai proses OCR untuk file: {file.filename}")
        result = await extract_text_and_total(file)

        if result["total"] is None:
            logger.warning("OCR berhasil tapi gagal menemukan angka nominal (total)")

        async with httpx.AsyncClient() as client:
            try:
                payload = {
                    "merchant_info": "Detected from OCR",
                    "raw_text": result["raw_text"],
                    "total_amount": result["total"],
                    "filename": file.filename,
                    "status": result["status"]
                }

                response = await client.post(
                    TS_BACKEND_URL,
                    json=payload,
                    headers={"Authorization": f"Bearer {INTERNAL_AUTH_TOKEN}"},
                    timeout=10.0
                )

                if response.status_code == 200:
                    logger.info("Berhasil sinkronisasi data ke Backend TS")
                    result["synced_to_ts"] = True
                else:
                    logger.error(f"Backend TS menolak data: {response.status_code}")
                    result["synced_to_ts"] = False

            except Exception as e:
                logger.error(f"Gagal menghubungi Backend TS: {str(e)}")
                result["synced_to_ts"] = False

        return result

    except Exception as e:
        logger.error(f"Error pada sistem OCR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Terjadi kesalahan internal: {str(e)}")
