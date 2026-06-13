import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Profile
 *     description: User profile & QRIS management
 *
 * components:
 *   schemas:
 *     ProfileRequest:
 *       type: object
 *       required: [username, name]
 *       properties:
 *         username: { type: string, example: bintang }
 *         name: { type: string, example: Bintang Ridwan }
 *         image: { type: string, example: https://example.com/avatar.png }
 *
 *     QrisRequest:
 *       type: object
 *       required: [qrisCode]
 *       properties:
 *         qrisCode: { type: string, example: "00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000000403" }
 */

router.use(authMiddleware);

/**
 * @openapi
 * /profile/token:
 *   get:
 *     tags: [Profile]
 *     summary: Get profile dari JWT token (user yang sedang login)
 *     responses:
 *       200:
 *         description: Profile ditemukan
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Profile belum dibuat
 */
router.get("/token", ProfileController.getProfileByToken);

/**
 * @openapi
 * /profile:
 *   get:
 *     tags: [Profile]
 *     summary: List semua profile
 *     responses:
 *       200:
 *         description: List profile
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", ProfileController.list);

/**
 * @openapi
 * /profile:
 *   post:
 *     tags: [Profile]
 *     summary: Buat profile baru untuk user yang sedang login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileRequest'
 *     responses:
 *       201:
 *         description: Profile berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", ProfileController.create);

/**
 * @openapi
 * /profile:
 *   put:
 *     tags: [Profile]
 *     summary: Update profile user yang sedang login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileRequest'
 *     responses:
 *       200:
 *         description: Profile berhasil diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Profile tidak ditemukan
 */
router.put("/", ProfileController.update);

/**
 * @openapi
 * /profile/qris:
 *   get:
 *     tags: [Profile]
 *     summary: Get QRIS code user yang sedang login
 *     responses:
 *       200:
 *         description: QRIS code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 qrisCode: { type: string }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/qris", ProfileController.getQrisController);

/**
 * @openapi
 * /profile/qris:
 *   post:
 *     tags: [Profile]
 *     summary: Upload QRIS code baru
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QrisRequest'
 *     responses:
 *       201:
 *         description: QRIS berhasil di-upload
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/qris", ProfileController.uploadQrisController);

/**
 * @openapi
 * /profile/qris:
 *   put:
 *     tags: [Profile]
 *     summary: Edit QRIS code
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QrisRequest'
 *     responses:
 *       200:
 *         description: QRIS berhasil diupdate
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: QRIS belum ada
 */
router.put("/qris", ProfileController.editQrisController);

/**
 * @openapi
 * /profile/qris:
 *   delete:
 *     tags: [Profile]
 *     summary: Hapus QRIS code
 *     responses:
 *       200:
 *         description: QRIS berhasil dihapus
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: QRIS tidak ditemukan
 */
router.delete("/qris", ProfileController.deleteQrisController);

export default router;
