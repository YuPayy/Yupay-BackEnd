import { Request, Response } from "express";
import * as paymentService from "./payment.service";
import { rejectPaymentSchema } from "./payment.schema";

export const createPaymentHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        if (!req.file) {
            return res.status(400).json({ status: "error", message: "File bukti wajib di-upload (field: proof)" });
        }
        const { notaId, amount } = req.body;
        const payment = await paymentService.createPayment(userId, Number(notaId), Number(amount), req.file);
        return res.status(201).json({ status: "success", data: payment });
    } catch (error: any) {
        console.error("createPayment error:", error.message, error.stack);
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const getPaymentsByNotaHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const notaId = parseInt(req.params.notaId, 10);
        const payments = await paymentService.getPaymentsByNota(notaId);
        return res.status(200).json({ status: "success", data: payments });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const verifyPaymentHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const paymentId = parseInt(req.params.paymentId, 10);
        const { status } = req.body;
        const updated = await paymentService.verifyPayment(paymentId, userId, status);
        return res.status(200).json({ status: "success", data: updated });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};

export const rejectPaymentHandler = async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user?.userId;
        if (!userId) {
            return res.status(401).json({ status: "error", message: "Unauthorized" });
        }
        const parsed = rejectPaymentSchema.safeParse({
            params: req.params,
            body: req.body,
        });
        if (!parsed.success) {
            return res.status(400).json({
                status: "error",
                message: "Validation failed",
                errors: parsed.error.flatten(),
            });
        }
        const paymentId = parsed.data.params.paymentId;
        const reason = parsed.data.body.reason;
        const updated = await paymentService.rejectPayment(paymentId, userId, reason);
        return res.status(200).json({ status: "success", data: updated });
    } catch (error: any) {
        const status = error.statusCode || 500;
        return res.status(status).json({ status: "error", message: error.message });
    }
};
