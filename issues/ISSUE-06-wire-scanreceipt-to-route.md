# ISSUE #06 — Wire `scanReceipt` ke Endpoint `POST /scan` di `nota.route.ts`

**Fase**: 3 (Routing)
**Prioritas**: High
**Status**: Open
**File terkait**: `Backend/src/modules/nota/nota.route.ts`, `Backend/src/modules/nota/nota.controller.ts`, `Backend/src/modules/nota/ocr.service.ts`

---

## Deskripsi

Fungsi `ocrService.scanReceipt()` sudah ditulis di `ocr.service.ts`, tapi **tidak dipanggil dari endpoint manapun**. Tidak ada route yang menerima upload gambar dan meneruskannya ke OCR service.

## Lokasi

```typescript
// Backend/src/modules/nota/ocr.service.ts — baris 3-32
export const ocrService = {
    async scanReceipt(imageBuffer: Buffer) {
        // ... kirim ke Python OCR, return formatted data
    }
};
// ^^ Fungsi ini tidak dipanggil dari route manapun
```

```typescript
// Backend/src/modules/nota/nota.route.ts — hanya punya:
router.post("/", notaController.createNotaHandler);
router.get("/:id", notaController.getNotaHandler);
// ^^ Tidak ada endpoint untuk scan/OCR
```

## Solusi

1. Install `multer` untuk handle file upload:
   ```bash
   npm install multer @types/multer
   ```

2. Tambahkan handler di `nota.controller.ts`:
   ```typescript
   import { ocrService } from "./ocr.service";

   export const scanReceiptHandler = async (req: Request, res: Response) => {
       try {
           if (!req.file) {
               return res.status(400).json({ error: "File gambar diperlukan" });
           }
           const result = await ocrService.scanReceipt(req.file.buffer);
           res.json(result);
       } catch (error) {
           res.status(500).json({ error: "OCR processing failed" });
       }
   };
   ```

3. Tambahkan route di `nota.route.ts`:
   ```typescript
   import multer from "multer";
   const upload = multer({ storage: multer.memoryStorage() });

   router.post("/scan", upload.single("image"), notaController.scanReceiptHandler);
   ```

## Langkah Pengerjaan

1. `npm install multer @types/multer` di folder Backend
2. Tambah handler `scanReceiptHandler` di `nota.controller.ts`
3. Tambah route `POST /scan` di `nota.route.ts` dengan multer middleware
4. Tes compile: `npx tsc --noEmit`

## Validasi

```bash
# Setelah Issue #05 selesai (nota routes mounted)
curl -X POST http://localhost:3000/api/v1/nota/scan \
  -F "image=@/path/to/receipt.jpg"
```

Harus return JSON result dari OCR (atau error message jika Python OCR belum jalan).

## Dependensi

- Issue #02 harus selesai dulu (axios terinstal)
- Issue #05 harus selesai dulu (nota routes mounted)

## Label

`feature`, `routing`, `ocr`
