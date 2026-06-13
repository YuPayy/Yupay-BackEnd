import { Router } from "express";
import { addFriendController, confirmFriendController, listFriendsController, searchFriendController, unfriendController, listPendingFriendsController } from "./friends.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Friends
 *     description: Friend request, list, unfriend
 *
 * components:
 *   schemas:
 *     AddFriendRequest:
 *       type: object
 *       required: [friendId]
 *       properties:
 *         friendId: { type: integer, example: 2 }
 *
 *     ConfirmFriendRequest:
 *       type: object
 *       required: [friendId, status]
 *       properties:
 *         friendId: { type: integer, example: 2 }
 *         status: { type: string, enum: [accepted, rejected] }
 *
 *     UnfriendRequest:
 *       type: object
 *       required: [friendId]
 *       properties:
 *         friendId: { type: integer, example: 2 }
 */

/**
 * @openapi
 * /friends/search:
 *   get:
 *     tags: [Friends]
 *     summary: Cari user berdasarkan username/email
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         example: bintang
 *     responses:
 *       200:
 *         description: Hasil pencarian
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/search", searchFriendController);

/**
 * @openapi
 * /friends/add:
 *   post:
 *     tags: [Friends]
 *     summary: Kirim friend request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddFriendRequest'
 *     responses:
 *       201:
 *         description: Friend request terkirim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Friendship'
 *       400:
 *         description: Sudah berteman / request pending
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/add", addFriendController);

/**
 * @openapi
 * /friends/confirm:
 *   post:
 *     tags: [Friends]
 *     summary: Accept atau reject friend request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConfirmFriendRequest'
 *     responses:
 *       200:
 *         description: Status friend request diupdate
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Friend request tidak ditemukan
 */
router.post("/confirm", confirmFriendController);

/**
 * @openapi
 * /friends/unfriend:
 *   post:
 *     tags: [Friends]
 *     summary: Hapus pertemanan
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UnfriendRequest'
 *     responses:
 *       200:
 *         description: Berhasil unfriend
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/unfriend", unfriendController);

/**
 * @openapi
 * /friends:
 *   get:
 *     tags: [Friends]
 *     summary: List semua teman (status: accepted)
 *     responses:
 *       200:
 *         description: List teman
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", listFriendsController);

/**
 * @openapi
 * /friends/pending:
 *   get:
 *     tags: [Friends]
 *     summary: List friend request yang masuk (status: pending)
 *     responses:
 *       200:
 *         description: List pending request
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Friendship'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/pending", listPendingFriendsController);

export default router;
