import { Router } from "express";
import { GroupController } from "./group.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Group
 *     description: Group pembayaran (split bill bersama)
 *
 * components:
 *   schemas:
 *     CreateGroupRequest:
 *       type: object
 *       required: [title]
 *       properties:
 *         title: { type: string, example: "Makan siang bareng" }
 *         description: { type: string, example: "Resto Padang Sudirman" }
 *
 *     InviteUserRequest:
 *       type: object
 *       required: [friendId]
 *       properties:
 *         friendId: { type: integer, example: 2 }
 *
 *     RespondInviteRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status: { type: string, enum: [accepted, rejected] }
 */

/**
 * @openapi
 * /group:
 *   post:
 *     tags: [Group]
 *     summary: Buat group pembayaran baru
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupRequest'
 *     responses:
 *       201:
 *         description: Group berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Nota'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post("/", authMiddleware, GroupController.createGroup);

/**
 * @openapi
 * /group/{groupId}/invite:
 *   post:
 *     tags: [Group]
 *     summary: Invite user ke group (harus owner)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InviteUserRequest'
 *     responses:
 *       201:
 *         description: Invite terkirim
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SplitParticipant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Bukan owner group
 */
router.post("/:groupId/invite", authMiddleware, GroupController.inviteUser);

/**
 * @openapi
 * /group/invites:
 *   get:
 *     tags: [Group]
 *     summary: List invite yang masuk untuk user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List invite pending
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/SplitParticipant'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/invites", authMiddleware, GroupController.getUserInvites);

/**
 * @openapi
 * /group/{groupId}/respond:
 *   put:
 *     tags: [Group]
 *     summary: Accept atau reject invite group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RespondInviteRequest'
 *     responses:
 *       200:
 *         description: Respon berhasil dicatat
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Invite tidak ditemukan
 */
router.put("/:groupId/respond", authMiddleware, GroupController.respondInvite);

export default router;
