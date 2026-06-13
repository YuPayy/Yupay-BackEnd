import { z } from "zod";

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const createNotifikasiSchema = z.object({
  title: z.string().min(1, "title wajib diisi"),
  message: z.string().min(1, "message wajib diisi"),
  isRead: z.boolean().optional().default(false),
});

export const updateNotifikasiSchema = createNotifikasiSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "minimal satu field harus diisi",
  });

export type CreateNotifikasiInput = z.infer<typeof createNotifikasiSchema>;
export type UpdateNotifikasiInput = z.infer<typeof updateNotifikasiSchema>;

