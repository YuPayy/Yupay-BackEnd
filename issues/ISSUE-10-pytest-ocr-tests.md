# ISSUE #10 — Setup pytest Tests untuk Python OCR Service

**Fase**: 5 (Testing)
**Prioritas**: High
**Status**: Open
**File terkait**: `main.py`, `app/ocr.py`, `app/routes.py`, `requirements.txt`

---

## Deskripsi

Python OCR service tidak punya test sama sekali. Perlu setup `pytest` + `httpx` (async test client untuk FastAPI) untuk test:
- Fungsi OCR murni (`extract_total_from_text`, `preprocess_image`)
- API endpoint `/ocr` (integration via `TestClient`)
- Error handling (file bukan gambar, file terlalu besar, dll)

## Lingkup Test

### A. Setup Infrastructure

1. **`requirements-dev.txt`** — test-only deps: `pytest`, `pytest-asyncio`, `httpx`
2. **`pytest.ini`** atau **`pyproject.toml`** — config: asyncio mode, test discovery
3. **`tests/conftest.py`** — fixtures: FastAPI TestClient, sample images
4. **`tests/fixtures/`** — folder gambar test: `receipt_valid.jpg`, `receipt_blurry.jpg`, `not_image.txt`
5. **`.env.test`** — override: `SYNC_CALLBACK_ENABLED=false` (jangan callback ke Backend saat test)

### B. Test Cases

#### 1. Unit Tests — `extract_total_from_text` (`tests/test_ocr_unit.py`)

| # | Test Case | Input | Expected |
|---|---|---|---|
| 1 | Total standar "RP 125.000" | `"Nasi goreng\nRP 125.000"` | `125000` |
| 2 | Total tanpa prefix "85000" | `"Item A\n85000"` | `85000` |
| 3 | Total dengan IDR "IDR 50.000" | `"Subtotal IDR 50.000\nTax 5000"` | `5000` (terakhir valid) |
| 4 | Total dengan titik "Rp 1.250.000" | `"Total Rp 1.250.000"` | `1250000` |
| 5 | Tidak ada angka valid | `"Terima kasih"` | `None` |
| 6 | Angka terlalu pendek (3 digit) | `"Total 500"` | `None` |
| 7 | Angka terlalu panjang (8 digit) | `"Total 99999999"` | `None` |
| 8 | Multiple amounts → ambil terakhir | `"Item 25000\nItem 30000\nTotal 55000"` | `55000` |
| 9 | Case insensitive "rp" lowercase | `"total rp 75.000"` | `75000` |

#### 2. Unit Tests — `preprocess_image` (`tests/test_ocr_unit.py`)

| # | Test Case | Expected |
|---|---|---|
| 1 | Input gambar RGB → output grayscale | Shape channel = 1 (atau 2D) |
| 2 | Input gambar sudah grayscale | Error atau handle gracefully |
| 3 | Input gambar RGBA (4 channel) | Tidak crash |

#### 3. Integration Tests — API Endpoint (`tests/test_api.py`)

| # | Test Case | Method | Endpoint | Input | Expected |
|---|---|---|---|---|---|
| 1 | Health check | GET | `/` | — | 200 + "running" |
| 2 | Upload valid JPEG | POST | `/ocr` | `receipt_valid.jpg` | 200 + `raw_text` + `total` |
| 3 | Upload valid PNG | POST | `/ocr` | `receipt.png` | 200 |
| 4 | Upload non-image | POST | `/ocr` | `not_image.txt` (content_type `text/plain`) | 400 |
| 5 | Upload tanpa file | POST | `/ocr` | no body | 422 |
| 6 | Upload file > 15MB | POST | `/ocr` | big file | 413 |
| 7 | File corrupt (bytes random) | POST | `/ocr` | random bytes as JPEG | 500 + error message |
| 8 | Callback disabled | POST | `/ocr` | valid image, `SYNC_CALLBACK_ENABLED=false` | 200 + `synced_to_ts: false` |

#### 4. Mock Strategy

| Dependency | Mock? | Cara |
|---|---|---|
| `easyocr.Reader` | **Yes** — mock `readtext()` | `unittest.mock.patch` return fixed text |
| `httpx.AsyncClient` | **Yes** — mock callback | `pytest-httpx` atau `unittest.mock.AsyncMock` |
| `cv2.imdecode` | **Optional** — mock untuk speed | Return dummy numpy array |

## Struktur File

```
tests/
├── conftest.py              # fixtures, TestClient, env override
├── test_ocr_unit.py         # unit tests untuk extract_total, preprocess
├── test_api.py              # integration tests untuk /ocr endpoint
└── fixtures/
    ├── receipt_valid.jpg     # gambar struk asli (bisa dari internet)
    ├── receipt_blurry.jpg    # gambar blur
    └── not_image.txt         # file teks biasa
```

## Langkah Pengerjaan

1. Tambah deps ke `requirements.txt` atau buat `requirements-dev.txt`:
   ```
   pytest
   pytest-asyncio
   httpx
   ```
2. Buat `pyproject.toml` atau `pytest.ini` untuk config
3. Buat `tests/conftest.py` dengan:
   - FastAPI `TestClient` fixture
   - Mock `easyocr.Reader` agar test cepat (EasyOCR download model ~100MB)
   - Set `SYNC_CALLBACK_ENABLED=false`
4. Buat `tests/fixtures/` dengan sample images
5. Tulis `test_ocr_unit.py` (9+ test cases)
6. Tulis `test_api.py` (8+ test cases)
7. Run: `.venv/bin/python -m pytest tests/ -v`

## Validasi

```bash
cd /path/to/project
source .venv/bin/activate
pytest tests/ -v --tb=short
pytest tests/ --cov=app --cov-report=term-missing
```

Target: **90%+ coverage** untuk `app/ocr.py`, **80%+** untuk `app/routes.py`.

## Dependensi

- Issue #03 harus selesai (`httpx` + `python-dotenv` terinstall)
- Issue #08 harus selesai (env vars di `routes.py`)
- `.venv` harus ada

## Label

`testing`, `pytest`, `python`, `ocr`
