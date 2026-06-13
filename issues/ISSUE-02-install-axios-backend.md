# ISSUE #02 — Install `axios` di Backend

**Fase**: 1 (Konfigurasi & Alat)
**Prioritas**: High
**Status**: Open
**File terkait**: `Backend/package.json`, `Backend/src/modules/nota/ocr.service.ts`

---

## Deskripsi

File `ocr.service.ts` menggunakan `import axios from 'axios'` (baris 1), tapi `axios` **tidak ada** di `package.json` (baik `dependencies` maupun `devDependencies`).

Akibatnya:
- `npm install` tidak akan menginstal `axios`
- Setiap kode yang meng-import `ocr.service.ts` akan crash dengan error `Cannot find module 'axios'`

## Lokasi Bug

```typescript
// Backend/src/modules/nota/ocr.service.ts — baris 1
import axios from 'axios';  // <-- module tidak terinstal
```

## Solusi

Install `axios` sebagai dependency:

```bash
cd Backend
npm install axios
```

## Langkah Pengerjaan

1. Buka terminal di folder `Backend/`
2. Jalankan `npm install axios`
3. Verifikasi `axios` sudah masuk di `package.json` → `dependencies`

## Validasi

```bash
node -e "require('axios'); console.log('axios OK')"
```

Harus output: `axios OK`

## Label

`bug`, `dependency`, `quick-win`
