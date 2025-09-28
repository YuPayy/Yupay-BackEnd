import { z } from "zod";

export const profileUpdateSchema = z.object({
  name: z.string().optional(),
  image: z.string().url().optional()
});

export const createProfileSchema = z.object({
  name: z.string().min(1, "Name wajib diisi"),
  image: z.string().url("Image harus berupa URL").optional(),
  userId: z.number(),
  username: z.string().min(3, "Username wajib diisi")
});

export const updateProfileSchema = profileUpdateSchema;

export type CreateProfileInput = z.infer<typeof createProfileSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
