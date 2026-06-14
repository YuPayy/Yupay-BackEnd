import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const joinNota = async (userId: number, notaId: number) => {
    // Cek nota exists
    const nota = await prisma.nota.findUnique({ where: { nota_id: notaId } });
    if (!nota) {
        const err: any = new Error("Nota tidak ditemukan");
        err.statusCode = 404;
        throw err;
    }

    // Cek duplicate join
    const existing = await prisma.splitParticipant.findFirst({
        where: { nota_id: notaId, user_id: userId },
    });
    if (existing) {
        const err: any = new Error("Already joined this nota");
        err.statusCode = 400;
        throw err;
    }

    return await prisma.splitParticipant.create({
        data: {
            nota_id: notaId,
            user_id: userId,
            statusKlaim: "active",
        },
        include: { user: { select: { user_id: true, username: true } } },
    });
};

export const upsertClaims = async (
    participantId: number,
    items: { itemId: number; quantity: number }[]
) => {
    return await prisma.$transaction(async (tx) => {
        // Hapus klaim lama participant ini
        await tx.klaimItem.deleteMany({
            where: { participant_id: participantId },
        });

        // Buat klaim baru
        for (const item of items) {
            await tx.klaimItem.create({
                data: {
                    item_id: item.itemId,
                    participant_id: participantId,
                    quantity: item.quantity,
                },
            });
        }

        return tx.klaimItem.findMany({
            where: { participant_id: participantId },
            include: { item: true },
        });
    });
};

export const getClaims = async (participantId: number) => {
    return await prisma.klaimItem.findMany({
        where: { participant_id: participantId },
        include: { item: true },
    });
};

/**
 * Hitung split bill:
 * 1. Subtotal per user = sum(item.harga * klaimItem.quantity)
 * 2. Selisih = nota.totalHarga - sum(subtotal semua user) -> pajak/service charge
 * 3. Pajak proporsional = subtotal_user * (selisih / sum(subtotal))
 * 4. Total akhir = subtotal + pajak
 */
export const getSplitResult = async (notaId: number) => {
    const nota = await prisma.nota.findUnique({
        where: { nota_id: notaId },
        include: {
            items: true,
            participants: {
                include: {
                    user: { select: { user_id: true, username: true } },
                    claims: { include: { item: true } },
                },
            },
        },
    });

    if (!nota) {
        const err: any = new Error("Nota tidak ditemukan");
        err.statusCode = 404;
        throw err;
    }

    // Hitung subtotal per participant
    const participants = nota.participants.map((p) => {
        const subtotal = p.claims.reduce(
            (sum, c) => sum + Number(c.item.harga) * c.quantity,
            0
        );
        return {
            user_id: p.user.user_id,
            username: p.user.username,
            participant_id: p.participant_id,
            subtotal,
            pajakProporsional: 0,
            totalAkhir: subtotal,
            items: p.claims.map((c) => ({
                klaim_id: c.klaim_id,
                item_id: c.item_id,
                namaItem: c.item.namaItem,
                quantity: c.quantity,
                harga: Number(c.item.harga),
            })),
        };
    });

    // Hitung pajak proporsional
    const totalSubtotal = participants.reduce((sum, p) => sum + p.subtotal, 0);
    const selisih = Number(nota.totalHarga) - totalSubtotal;
    if (selisih > 0 && totalSubtotal > 0) {
        for (const p of participants) {
            p.pajakProporsional = Math.round((p.subtotal * selisih) / totalSubtotal);
            p.totalAkhir = p.subtotal + p.pajakProporsional;
        }
    }

    return {
        nota_id: nota.nota_id,
        totalHarga: Number(nota.totalHarga),
        totalSubtotal,
        selisih,
        participants,
    };
};
