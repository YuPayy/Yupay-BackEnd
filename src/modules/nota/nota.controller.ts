import { Request, Response } from "express";
import * as notaService from "./nota.service";

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