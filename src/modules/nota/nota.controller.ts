import { Request, Response } from "express";
import * as notaService from "./nota.service";
import { ocrService } from "./ocr.service";

export const createNotaHandler = async (req: Request, res: Response) => {
    try {
        const nota = await notaService.createNota(req.body);
        return res.status(201).json({
            status: "success",
            data: nota,
        });
    } catch (error: any) {
        return res.status(500).json({
            status: "error",
            message: error.message,
        });
    }
};

export const getNotaHandler = async (req: Request, res: Response) => {
    try {
        const id = parseInt(req.params.id);
        const nota = await notaService.getNotaById(id);
        if (!nota) return res.status(404).json({ message: "Nota tidak ditemukan" });

        return res.json({ status: "success", data: nota });
    } catch (error: any) {
        return res.status(500).json({ message: error.message });
    }
};

export const scanReceiptHandler = async (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: "error",
                message: "File gambar wajib di-upload (field: image)",
            });
        }

        const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!allowed.includes(req.file.mimetype)) {
            return res.status(400).json({
                status: "error",
                message: `Format tidak didukung: ${req.file.mimetype}. Gunakan jpg/png/webp`,
            });
        }

        const result = await ocrService.scanReceipt(req.file.buffer);
        return res.json({
            status: "success",
            data: result,
        });
    } catch (error: any) {
        const isUnavailable = /econnrefused|ocr processing failed/i.test(error.message || "");
        return res.status(isUnavailable ? 503 : 500).json({
            status: "error",
            message: error.message || "OCR processing failed",
        });
    }
};