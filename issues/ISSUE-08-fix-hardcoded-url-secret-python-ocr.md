# ISSUE #08 — Fix Hardcoded URL & Secret di Python `routes.py`

**Fase**: 4 (Integrasi)
**Prioritas**: Medium
**Status**: Open
**File terkait**: `OCR/app/routes.py`, `OCR/.env` (belum ada, perlu dibuat)

---

## Deskripsi

Dua masalah keamanan & konfigurasi di `routes.py`:

### Bug 1: URL Backend placeholder

```python
# OCR/app/routes.py — baris 14
TS_BACKEND_URL = "http://your-ts-backend-api.com/v1/bills/process-ocr"
#                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ placeholder, bukan URL asli
```

URL ini **tidak pernah diganti** dan mengarah ke domain yang tidak ada. Callback ke Backend Node.js akan selalu gagal.

### Bug 2: Secret key hardcoded

```python
# OCR/app/routes.py — baris 15
INTERNAL_AUTH_TOKEN = "YUPAY_SECRET_KEY_123"
#                     ^^^^^^^^^^^^^^^^^^^^^^ hardcoded secret = security risk
```

Secret key tidak boleh ada di source code — harus di environment variable.

### Bug 3: Target endpoint tidak ada

URL callback mengarah ke `/v1/bills/process-ocr`, tapi endpoint ini **tidak ada** di Backend Node.js. Backend punya `/api/v1/nota`, bukan `/v1/bills`.

## Solusi

### 1. Buat file `OCR/.env`:

```env
# Backend TS callback URL
TS_BACKEND_URL=http://localhost:3000/api/v1/nota
INTERNAL_AUTH_TOKEN=ganti_dengan_secret_yang_aman
```

### 2. Update `OCR/app/routes.py`:

```python
import os
from dotenv import load_dotenv

load_dotenv()

TS_BACKEND_URL = os.getenv("TS_BACKEND_URL", "http://localhost:3000/api/v1/nota")
INTERNAL_AUTH_TOKEN = os.getenv("INTERNAL_AUTH_TOKEN", "")

if not INTERNAL_AUTH_TOKEN:
    logger.warning("INTERNAL_AUTH_TOKEN tidak di-set! Callback ke Backend TS akan gagal.")
```

### 3. Update `OCR/main.py` untuk load dotenv di awal:

```python
from dotenv import load_dotenv
load_dotenv()
```

## Langkah Pengerjaan

1. Buat file `OCR/.env` dengan `TS_BACKEND_URL` dan `INTERNAL_AUTH_TOKEN`
2. Tambahkan `OCR/.env` ke `.gitignore`
3. Update `OCR/app/routes.py` — ganti hardcoded values dengan `os.getenv()`
4. Pastikan `python-dotenv` sudah di `requirements.txt` (dari Issue #03)
5. Sesuaikan URL callback agar cocok dengan endpoint yang benar di Backend

## Validasi

```bash
cd OCR
python -c "
from dotenv import load_dotenv
import os
load_dotenv()
print('URL:', os.getenv('TS_BACKEND_URL'))
print('TOKEN:', os.getenv('INTERNAL_AUTH_TOKEN'))
"
```

Harus output URL dan token yang benar dari `.env`.

## Catatan Keamanan

- **JANGAN** commit file `OCR/.env` ke git
- Buat `OCR/.env.example` sebagai template tanpa nilai sensitif
- Di production, gunakan secret management (Docker secrets, dll)

## Dependensi

- Issue #03 harus selesai (`httpx` dan `python-dotenv` terinstal)
- Issue #05 harus selesai (endpoint nota mounted di Backend)

## Label

`bug`, `security`, `config`, `integration`
