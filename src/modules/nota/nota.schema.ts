import { z } from "zod";

export const createNotaSchema = z.object({
    body: z.object({
        payer_id: z.number(),
        tanggalTransaksi: z.string().datetime(),
        totalHarga: z.number(),
        status: z.string().default("pending"),
        items: z.array(
            z.object({
                namaItem: z.string(),
                quantity: z.number(),
                harga: z.number(),
            })
        ),
    }),
});

export type CreateNotaInput = z.infer<typeof createNotaSchema>["body"];