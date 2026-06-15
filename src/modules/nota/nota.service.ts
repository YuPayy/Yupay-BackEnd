import { PrismaClient } from "@prisma/client";
import { CreateNotaInput } from "./nota.schema";

const prisma = new PrismaClient();

export const createNota = async (data: any) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Buat Header Nota
        const nota = await tx.nota.create({
            data: {
                payer_id: Number(data.payer_id),
                tanggalTransaksi: new Date(data.tanggalTransaksi),
                totalHarga: Number(data.totalHarga),
                status: data.status,
                // 2. Buat Item sekaligus (Nested Write)
                items: {
                    create: (data.items || []).map((item: any) => ({
                        namaItem: item.namaItem,
                        quantity: Number(item.quantity),
                        harga: Number(item.harga),
                    })),
                },
            },
            include: {
                items: true,
            },
        });
        return nota;
    });
};

export const getNotaById = async (id: number) => {
    return await prisma.nota.findUnique({
        where: { nota_id: id },
        include: { items: true, payer: true },
    });
};