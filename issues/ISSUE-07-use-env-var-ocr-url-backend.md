# ISSUE #07 — Ganti Hardcoded URL di `ocr.service.ts` dengan Environment Variable

**Fase**: 4 (Integrasi)
**Prioritas**: Medium
**Status**: Open
**File terkait**: `Backend/src/modules/nota/ocr.service.ts`, `Backend/.env`

---

## Deskripsi

URL Python OCR service di `ocr.service.ts` di-hardcode sebagai `http://localhost:5000/ocr`. Padahal di `.env` sudah ada variabel `PYTHON_OCR_URL` yang tidak pernah dibaca.

Ini jadi masalah saat:
- Deploy ke production (URL beda)
- Python OCR jalan di port lain
- Testing dengan mock server

## Lokasi Bug

```typescript
// Backend/src/modules/nota/ocr.service.ts — baris 11
const pythonResponse = await axios.post('http://localhost:5000/ocr', formData, {
//                                       ^^^^^^^^^^^^^^^^^^^^^^^^^ hardcoded
```

```env
# Backend/.env — baris 40
PYTHON_OCR_URL=http://localhost:5000/ocr   # <-- tidak pernah dibaca
```

## Solusi

Ganti hardcoded URL dengan `process.env.PYTHON_OCR_URL`:

```typescript
// Backend/src/modules/nota/ocr.service.ts
const OCR_URL = process.env.PYTHON_OCR_URL || 'http://localhost:5000/ocr';

export const ocrService = {
    async scanReceipt(imageBuffer: Buffer) {
        // ...
        const pythonResponse = await axios.post(OCR_URL, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        // ...
    }
};
```

## Langkah Pengerjaan

1. Buka `Backend/src/modules/nota/ocr.service.ts`
2. Tambah variabel `OCR_URL` yang baca dari `process.env.PYTHON_OCR_URL` dengan fallback
3. Ganti hardcoded URL di `axios.post()` dengan `OCR_URL`
4. Pastikan `dotenv.config()` sudah dipanggil di `app.ts` sebelum module ini di-import (sudah OK di baris 11)

## Validasi

1. Set `PYTHON_OCR_URL=http://localhost:9999/test` di `.env`
2. Jalankan server, panggil endpoint scan
3. Error message harus menunjukkan koneksi ke port `9999`, bukan `5000`

## Dependensi

- Issue #01 harus selesai (komentar `.env` fix)

## Label

`improvement`, `config`, `security`
