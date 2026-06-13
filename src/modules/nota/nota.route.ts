import { Router } from "express";
import multer from "multer";
import * as notaController from "./nota.controller";

const router = Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});

/**
 * @openapi
 * tags:
 *   - name: Nota
 *     description: Nota/bill CRUD + OCR scan
 *
 * components:
 *   schemas:
 *     CreateNotaRequest:
 *       type: object
 *       required: [payer_id, tanggalTransaksi, totalHarga]
 *       properties:
 *         payer_id: { type: integer, example: 1 }
 *         tanggalTransaksi: { type: string, format: date-time }
 *         totalHarga: { type: number, example: 125000 }
 *         status: { type: string, enum: [open, closed, paid] }
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Item'
 *
 *     NotaWithItems:
 *       allOf:
 *         - $ref: '#/components/schemas/Nota'
 *         - type: object
 *           properties:
 *             items:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Item'
 *
 *     OcrScanResult:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         data:
 *           type: object
 *           properties:
 *             tanggalTransaksi: { type: string, format: date-time }
 *             totalHarga: { type: number, example: 125000 }
 *             items:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   namaItem: { type: string, example: Nasi Goreng }
 *                   quantity: { type: integer, example: 2 }
 *                   harga: { type: number, example: 25000 }
 */

/**
 * @openapi
 * /api/v1/nota:
 *   post:
 *     tags: [Nota]
 *     summary: Buat nota baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotaRequest'
 *     responses:
 *       201:
 *         description: Nota berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nota'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", notaController.createNotaHandler);

/**
 * @openapi
 * /api/v1/nota/{id}:
 *   get:
 *     tags: [Nota]
 *     summary: Get detail nota by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detail nota
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotaWithItems'
 *       404:
 *         description: Nota tidak ditemukan
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/:id", notaController.getNotaHandler);

/**
 * @openapi
 * /api/v1/nota/scan:
 *   post:
 *     tags: [Nota]
 *     summary: Upload gambar struk → OCR → return items + total
 *     description: |
 *       Endpoint ini memproses gambar struk/nota menggunakan Python OCR microservice
 *       (EasyOCR). File akan di-forward ke `PYTHON_OCR_URL` (default: `http://localhost:5000/ocr`).
 *
 *       **Format didukung**: jpg, jpeg, png, webp (max 10MB)
 *
 *       **Flow**:
 *       1. Frontend upload gambar
 *       2. Backend validasi & forward ke Python OCR
 *       3. Python OCR extract teks + total harga
 *       4. Python OCR callback ke `TS_BACKEND_URL` dengan hasil
 *       5. Backend return hasil OCR ke frontend
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: File gambar struk/nota
 *     responses:
 *       200:
 *         description: OCR berhasil
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OcrScanResult'
 *       400:
 *         description: File tidak ada atau format tidak didukung
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: OCR processing failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/scan", upload.single("image"), notaController.scanReceiptHandler);

export default router;
