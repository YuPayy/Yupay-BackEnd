import { z } from "zod";

export const createPaymentSchema = z.object({
    body: z.object({
        notaId: z.number().int().positive(),
        amount: z.number().positive("Amount harus positif"),
    }),
});

export const verifyPaymentSchema = z.object({
    params: z.object({
        paymentId: z.coerce.number().int().positive(),
    }),
    body: z.object({
        status: z.enum(["confirmed", "rejected"]),
    }),
});

export const rejectPaymentSchema = z.object({
    params: z.object({
        paymentId: z.coerce.number().int().positive(),
    }),
    body: z.object({
        reason: z.string().min(5).max(500),
    }),
});

export const getPaymentsByNotaSchema = z.object({
    params: z.object({
        notaId: z.coerce.number().int().positive(),
    }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>["body"];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type RejectPaymentInput = z.infer<typeof rejectPaymentSchema>;
export type GetPaymentsByNotaInput = z.infer<typeof getPaymentsByNotaSchema>["params"];
