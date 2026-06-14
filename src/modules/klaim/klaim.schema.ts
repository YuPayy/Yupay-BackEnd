import { z } from "zod";

export const joinNotaSchema = z.object({
    params: z.object({
        notaId: z.coerce.number().int().positive(),
    }),
});

export const upsertClaimsSchema = z.object({
    body: z.object({
        participantId: z.number().int().positive(),
        items: z.array(
            z.object({
                itemId: z.number().int().positive(),
                quantity: z.number().int().min(1, "Minimal quantity 1"),
            })
        ).min(1, "Minimal satu item harus diklaim"),
    }),
});

export const getClaimsSchema = z.object({
    params: z.object({
        participantId: z.coerce.number().int().positive(),
    }),
});

export const getSplitResultSchema = z.object({
    params: z.object({
        notaId: z.coerce.number().int().positive(),
    }),
});

export type JoinNotaInput = z.infer<typeof joinNotaSchema>["params"];
export type UpsertClaimInput = z.infer<typeof upsertClaimsSchema>["body"];
export type GetClaimsInput = z.infer<typeof getClaimsSchema>["params"];
export type GetSplitResultInput = z.infer<typeof getSplitResultSchema>["params"];
