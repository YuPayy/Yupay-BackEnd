# ISSUE #01 — Fix Sintaks Komentar di `.env`

**Fase**: 1 (Konfigurasi & Alat)
**Prioritas**: High
**Status**: Open
**File terkait**: `Backend/.env`

---

## Deskripsi

Baris 39 di file `.env` menggunakan `//` untuk komentar. Format ini **tidak valid** untuk file `.env` — library `dotenv` hanya mengenali `#` sebagai karakter komentar.

Akibatnya, baris `// Python OCR Service Configuration` bisa di-parse sebagai variabel environment yang salah dan menyebabkan error yang sulit di-debug.

## Lokasi Bug

```
# Backend/.env — baris 39
// Python OCR Service Configuration   <-- SALAH
PYTHON_OCR_URL=http://localhost:5000/ocr
```

## Solusi

Ganti `//` menjadi `#`:

```env
# Python OCR Service Configuration
PYTHON_OCR_URL=http://localhost:5000/ocr
```

## Langkah Pengerjaan

1. Buka `Backend/.env`
2. Cari semua baris yang menggunakan `//` sebagai komentar
3. Ganti semuanya menjadi `#`
4. Simpan file

## Validasi

- Jalankan `node -e "require('dotenv').config(); console.log(process.env.PYTHON_OCR_URL)"` dari folder `Backend/`
- Harus output: `http://localhost:5000/ocr`

## Label

`bug`, `config`, `quick-win`
