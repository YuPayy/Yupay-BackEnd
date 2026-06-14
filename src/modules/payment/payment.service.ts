import { PrismaClient } from "@prisma/client";
import path from "path";

const prisma = new PrismaClient();

export const createPayment = async (
    fromUserId: number,
    notaId: number,
    amount: number,
    proofFile: Express.Multer.File
) => {
    return await prisma.$transaction(async (tx) => {
        // Cek nota exists
        const nota = await tx.nota.findUnique({ where: { nota_id: notaId } });
        if (!nota) {
            const err: any = new Error("Nota tidak ditemukan");
            err.statusCode = 404;
            throw err;
        }

        // User tidak boleh bayar ke diri sendiri
        if (nota.payer_id === fromUserId) {
            const err: any = new Error("Tidak bisa membayar nota sendiri");
            err.statusCode = 400;
            throw err;
        }

        // Cek user sudah join nota (SplitParticipant exists)
        const participant = await tx.splitParticipant.findFirst({
            where: { nota_id: notaId, user_id: fromUserId },
        });
        if (!participant) {
            const err: any = new Error("User belum join nota ini");
            err.statusCode = 403;
            throw err;
        }

        // Simpan proofUrl (relative path)
        const proofUrl = `/uploads/payments/${path.basename(proofFile.path)}`;

        return await tx.payment.create({
            data: {
                nota_id: notaId,
                from_user_id: fromUserId,
                to_user_id: nota.payer_id,
                amount,
                status: "pending",
                proofUrl,
            },
            include: { from: { select: { user_id: true, username: true } }, to: { select: { user_id: true, username: true } } },
        });
    });
};

export const getPaymentsByNota = async (notaId: number) => {
    return await prisma.payment.findMany({
        where: { nota_id: notaId },
        include: { from: { select: { user_id: true, username: true } }, to: { select: { user_id: true, username: true } } },
        orderBy: { createdAt: "desc" },
    });
};

export const verifyPayment = async (paymentId: number, verifierId: number, newStatus: "confirmed" | "rejected") => {
    return await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({ where: { payment_id: paymentId } });
        if (!payment) {
            const err: any = new Error("Payment tidak ditemukan");
            err.statusCode = 404;
            throw err;
        }

        // Hanya payer (to_user_id) yang bisa verifikasi
        if (payment.to_user_id !== verifierId) {
            const err: any = new Error("Hanya penerima (payer nota) yang bisa verifikasi");
            err.statusCode = 403;
            throw err;
        }

        // Hanya payment pending yang bisa diverifikasi
        if (payment.status !== "pending") {
            const err: any = new Error(`Payment sudah berstatus ${payment.status}, tidak bisa diverifikasi lagi`);
            err.statusCode = 400;
            throw err;
        }

        // Update status
        const updated = await tx.payment.update({
            where: { payment_id: paymentId },
            data: { status: newStatus },
        });

        // Auto-update Nota.status jika semua payment confirmed
        if (newStatus === "confirmed") {
            const allPayments = await tx.payment.findMany({
                where: { nota_id: payment.nota_id },
            });
            const allConfirmed = allPayments.every((p) => p.status === "confirmed");
            if (allConfirmed) {
                await tx.nota.update({
                    where: { nota_id: payment.nota_id },
                    data: { status: "paid" },
                });
            }
        }

        return updated;
    });
};
