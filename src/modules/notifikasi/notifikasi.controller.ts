import type { Request, Response } from "express";
import {
  createNotifikasiSchema,
  idParamSchema,
  updateNotifikasiSchema,
} from "./notifikasi.schema";
import { notifikasiService } from "./notifikasi.service";

export const getAllNotifikasi = async (_req: Request, res: Response) => {
  const items = await notifikasiService.findAll();
  return res.status(200).json({
    message: "Berhasil mengambil data notifikasi",
    data: items,
  });
};

export const getNotifikasiById = async (req: Request, res: Response) => {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    return res.status(400).json({
      message: "Param tidak valid",
      errors: parsedParam.error.flatten(),
    });
  }

  const item = await notifikasiService.findById(parsedParam.data.id);
  if (!item) {
    return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
  }

  return res.status(200).json({
    message: "Berhasil mengambil detail notifikasi",
    data: item,
  });
};

export const createNotifikasi = async (req: Request, res: Response) => {
  const parsedBody = createNotifikasiSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      message: "Body tidak valid",
      errors: parsedBody.error.flatten(),
    });
  }

  const item = await notifikasiService.create(parsedBody.data);
  return res.status(201).json({
    message: "Notifikasi berhasil dibuat",
    data: item,
  });
};

export const updateNotifikasi = async (req: Request, res: Response) => {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    return res.status(400).json({
      message: "Param tidak valid",
      errors: parsedParam.error.flatten(),
    });
  }

  const parsedBody = updateNotifikasiSchema.safeParse(req.body);
  if (!parsedBody.success) {
    return res.status(400).json({
      message: "Body tidak valid",
      errors: parsedBody.error.flatten(),
    });
  }

  const updated = await notifikasiService.update(
    parsedParam.data.id,
    parsedBody.data
  );

  if (!updated) {
    return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
  }

  return res.status(200).json({
    message: "Notifikasi berhasil diupdate",
    data: updated,
  });
};

export const deleteNotifikasi = async (req: Request, res: Response) => {
  const parsedParam = idParamSchema.safeParse(req.params);
  if (!parsedParam.success) {
    return res.status(400).json({
      message: "Param tidak valid",
      errors: parsedParam.error.flatten(),
    });
  }

  const deleted = await notifikasiService.remove(parsedParam.data.id);
  if (!deleted) {
    return res.status(404).json({ message: "Notifikasi tidak ditemukan" });
  }

  return res.status(200).json({ message: "Notifikasi berhasil dihapus" });
};

