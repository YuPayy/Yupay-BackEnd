import { z } from "zod";

export const createGroupSchema = z.object({
    body: z.object({
        title: z.string().min(3, "Judul group minimal 3 karakter"),
        description: z.string().optional(),
    }),
});

export const inviteUserSchema = z.object({
    body: z.object({
        friendId: z.number(), // id user yang diinvite
    }),
});

export const respondInviteSchema = z.object({
    body: z.object({
        status: z.enum(["accepted", "rejected"]),
    }),
});
