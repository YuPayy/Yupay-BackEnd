import { z } from "zod";

export const addFriendSchema = z.object({
    targetUserId: z.number().refine((val) => !isNaN(val), {
        message: "targetUserId must be a number",
    }),
});
