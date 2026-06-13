import easyocr
import cv2
import numpy as np
import re

reader = easyocr.Reader(['id', 'en'], gpu=False)

def preprocess_image(img):
    if img is None or img.size == 0:
        return None
    if len(img.shape) == 2:
        return img
    if len(img.shape) == 3 and img.shape[2] == 1:
        return img.squeeze()
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    return gray


def extract_total_from_text(raw_text):
    if not raw_text:
        return None
    clean_content = raw_text.replace('\n', ' ').upper()
    all_amounts = re.findall(r"(?:RP|IDR)?[\s\.]*([\d\.,]+)", clean_content)
    valid_numbers = []
    for amt in all_amounts:
        num_only = re.sub(r"[.,\s]", "", amt)
        if num_only and 4 <= len(num_only) <= 7:
            valid_numbers.append(int(num_only))
    if valid_numbers:
        return valid_numbers[-1]
    return None


async def extract_text_and_total(file):
    image_bytes = await file.read()
    if not image_bytes:
        return {"raw_text": "", "total": None, "status": "error", "error": "empty file"}

    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        return {"raw_text": "", "total": None, "status": "error", "error": "invalid image"}

    processed = preprocess_image(img)
    if processed is None:
        return {"raw_text": "", "total": None, "status": "error", "error": "preprocess failed"}

    try:
        results = reader.readtext(processed, paragraph=True)
    except Exception as e:
        return {"raw_text": "", "total": None, "status": "error", "error": f"OCR error: {e}"}

    full_text_list = [res[1] for res in results]
    raw_text = "\n".join(full_text_list)
    total = extract_total_from_text(raw_text)

    return {
        "raw_text": raw_text,
        "total": total,
        "status": "success"
    }
