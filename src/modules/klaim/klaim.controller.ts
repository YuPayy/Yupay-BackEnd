import { Request, Response } from "express";
import * as klaimService from "./klaim.service";

export const joinNotaHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const notaId = parseInt(req.params.notaId, 10);
        const participant = await klaimService.joinNota(userId, notaId);
        return res.status(201).json({ status: "success", data: participant });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const upsertClaimsHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const { participantId, items } = req.body;
        const claims = await klaimService.upsertClaims(participantId, items);
        return res.status(200).json({ status: "success", data: claims });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const getClaimsHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const participantId = parseInt(req.params.participantId, 10);
        const claims = await klaimService.getClaims(participantId);
        return res.status(200).json({ status: "success", data: claims });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const getSplitResultHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const notaId = parseInt(req.params.notaId, 10);
        const result = await klaimService.getSplitResult(notaId);
        return res.status(200).json({ status: "success", data: result });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};
