import { Router } from "express";
import {
  createNotifikasi,
  deleteNotifikasi,
  getAllNotifikasi,
  getNotifikasiById,
  updateNotifikasi,
} from "./notifikasi.controller";

const notifikasiRouter = Router();

/**
 * @openapi
 * tags:
 *   - name: Notifikasi
 *     description: In-app notification
 *
 * components:
 *   schemas:
 *     CreateNotifikasiRequest:
 *       type: object
 *       required: [title, message]
 *       properties:
 *         title: { type: string, example: Pembayaran Diterima }
 *         message: { type: string, example: Bintang telah membayar Rp 50.000 }
 *         isRead: { type: boolean, default: false }
 *
 *     UpdateNotifikasiRequest:
 *       type: object
 *       properties:
 *         title: { type: string }
 *         message: { type: string }
 *         isRead: { type: boolean }
 */

/**
 * @openapi
 * /api/v1/notifikasi:
 *   get:
 *     tags: [Notifikasi]
 *     summary: Get semua notifikasi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List notifikasi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notifikasi'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
notifikasiRouter.get("/", getAllNotifikasi);

/**
 * @openapi
 * /api/v1/notifikasi/{id}:
 *   get:
 *     tags: [Notifikasi]
 *     summary: Get notifikasi by ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Detail notifikasi
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notifikasi'
 *       400:
 *         description: ID tidak valid
 *       404:
 *         description: Notifikasi tidak ditemukan
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
notifikasiRouter.get("/:id", getNotifikasiById);

/**
 * @openapi
 * /api/v1/notifikasi:
 *   post:
 *     tags: [Notifikasi]
 *     summary: Buat notifikasi baru
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateNotifikasiRequest'
 *     responses:
 *       201:
 *         description: Notifikasi berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notifikasi'
 *       400:
 *         description: Body tidak valid
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
notifikasiRouter.post("/", createNotifikasi);

/**
 * @openapi
 * /api/v1/notifikasi/{id}:
 *   patch:
 *     tags: [Notifikasi]
 *     summary: Update notifikasi (partial)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateNotifikasiRequest'
 *     responses:
 *       200:
 *         description: Notifikasi diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notifikasi'
 *       400:
 *         description: ID atau body tidak valid
 *       404:
 *         description: Notifikasi tidak ditemukan
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
notifikasiRouter.patch("/:id", updateNotifikasi);

/**
 * @openapi
 * /api/v1/notifikasi/{id}:
 *   delete:
 *     tags: [Notifikasi]
 *     summary: Hapus notifikasi
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Notifikasi berhasil dihapus
 *       400:
 *         description: ID tidak valid
 *       404:
 *         description: Notifikasi tidak ditemukan
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
notifikasiRouter.delete("/:id", deleteNotifikasi);

export default notifikasiRouter;
