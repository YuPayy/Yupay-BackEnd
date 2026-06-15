import { z } from "zod";

export const createNotaSchema = z.object({
    body: z.object({
        payer_id: z.number().int().positive(),
        tanggalTransaksi: z.string().datetime(),
        totalHarga: z.number().positive(),
        status: z.string().default("pending"),
        items: z.array(
            z.object({
                namaItem: z.string(),
                quantity: z.number().int().positive(),
                harga: z.number().positive(),
            })
        ),
    }),
});

export type CreateNotaInput = z.infer<typeof createNotaSchema>["body"];