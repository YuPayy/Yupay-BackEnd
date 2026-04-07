import { Router } from "express";
import * as notaController from "./nota.controller";
// Asumsi kamu punya middleware validasi schema
// import { validate } from "../../middleware/validate";
// import { createNotaSchema } from "./nota.schema";

const router = Router();

// Endpoint untuk simpan nota (bisa dipanggil setelah OCR selesai di frontend)
router.post("/", notaController.createNotaHandler);

// Endpoint untuk ambil detail nota
router.get("/:id", notaController.getNotaHandler);

export default router;