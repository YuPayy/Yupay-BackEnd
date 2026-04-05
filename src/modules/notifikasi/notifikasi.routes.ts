import { Router } from "express";
import {
  createNotifikasi,
  deleteNotifikasi,
  getAllNotifikasi,
  getNotifikasiById,
  updateNotifikasi,
} from "./notifikasi.controller";

const notifikasiRouter = Router();

notifikasiRouter.get("/", getAllNotifikasi);
notifikasiRouter.get("/:id", getNotifikasiById);
notifikasiRouter.post("/", createNotifikasi);
notifikasiRouter.patch("/:id", updateNotifikasi);
notifikasiRouter.delete("/:id", deleteNotifikasi);

export default notifikasiRouter;

