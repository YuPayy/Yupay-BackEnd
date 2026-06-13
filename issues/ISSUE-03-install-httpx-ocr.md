# ISSUE #03 — Install `httpx` & Update `requirements.txt` di OCR

**Fase**: 1 (Konfigurasi & Alat)
**Prioritas**: High
**Status**: Open
**File terkait**: `OCR/requirements.txt`, `OCR/app/routes.py`

---

## Deskripsi

File `routes.py` menggunakan `import httpx` (baris 3), tapi `httpx` **tidak ada** di `requirements.txt`.

Akibatnya:
- `pip install -r requirements.txt` tidak akan menginstal `httpx`
- Service OCR akan crash saat endpoint `/ocr` dipanggil: `ModuleNotFoundError: No module named 'httpx'`

## Lokasi Bug

```python
# OCR/app/routes.py — baris 3
import httpx  # <-- tidak ada di requirements.txt
```

`requirements.txt` saat ini:
```
fastapi
uvicorn
python-multipart
opencv-python-headless
easyocr
torch
torchvision
```

## Solusi

1. Tambahkan `httpx` ke `requirements.txt`
2. Tambahkan juga `python-dotenv` (diperlukan untuk Issue #08 nanti)

```
fastapi
uvicorn
python-multipart
opencv-python-headless
easyocr
torch
torchvision
httpx
python-dotenv
```

3. Install:

```bash
cd OCR
pip install httpx python-dotenv
```

## Langkah Pengerjaan

1. Buka `OCR/requirements.txt`
2. Tambahkan `httpx` dan `python-dotenv` di baris baru
3. Jalankan `pip install -r requirements.txt`

## Validasi

```bash
python -c "import httpx; print('httpx OK')"
python -c "import dotenv; print('dotenv OK')"
```

## Label

`bug`, `dependency`, `quick-win`
