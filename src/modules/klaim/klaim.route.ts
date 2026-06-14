import { Router } from "express";
import * as klaimController from "./klaim.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Klaim
 *     description: Split bill & klaim item management
 *
 * components:
 *   schemas:
 *     UpsertClaimItem:
 *       type: object
 *       required: [itemId, quantity]
 *       properties:
 *         itemId:
 *           type: integer
 *           example: 1
 *         quantity:
 *           type: integer
 *           example: 2
 *
 *     UpsertClaimsRequest:
 *       type: object
 *       required: [participantId, items]
 *       properties:
 *         participantId:
 *           type: integer
 *           example: 1
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UpsertClaimItem'
 *
 *     KlaimItem:
 *       type: object
 *       properties:
 *         klaim_id: { type: integer, example: 1 }
 *         participant_id: { type: integer, example: 1 }
 *         item_id: { type: integer, example: 5 }
 *         quantity: { type: integer, example: 2 }
 *         item:
 *           $ref: '#/components/schemas/Item'
 *
 *     SplitResult:
 *       type: object
 *       properties:
 *         nota_id: { type: integer, example: 42 }
 *         participants:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               participant_id: { type: integer, example: 1 }
 *               username: { type: string, example: Bintang }
 *               subtotal: { type: number, example: 50000 }
 */

/**
 * @openapi
 * /api/v1/klaim/nota/{notaId}/join:
 *   post:
 *     tags: [Klaim]
 *     summary: Bergabung sebagai participant ke dalam nota
 *     parameters:
 *       - in: path
 *         name: notaId
 *         required: true
 *         schema: { type: integer }
 *         description: ID nota
 *     responses:
 *       201:
 *         description: Berhasil bergabung
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/nota/:notaId/join", klaimController.joinNotaHandler);

/**
 * @openapi
 * /api/v1/klaim/claims:
 *   put:
 *     tags: [Klaim]
 *     summary: Upsert klaim items untuk participant tertentu
 *     description: Mengirim array item yang diklaim beserta quantity masing-masing
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpsertClaimsRequest'
 *     responses:
 *       200:
 *         description: Klaim berhasil diupdate
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.put("/claims", klaimController.upsertClaimsHandler);

/**
 * @openapi
 * /api/v1/klaim/claims/{participantId}:
 *   get:
 *     tags: [Klaim]
 *     summary: Get daftar klaim items milik participant
 *     parameters:
 *       - in: path
 *         name: participantId
 *         required: true
 *         schema: { type: integer }
 *         description: ID participant
 *     responses:
 *       200:
 *         description: Daftar klaim items
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/KlaimItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/claims/:participantId", klaimController.getClaimsHandler);

/**
 * @openapi
 * /api/v1/klaim/nota/{notaId}/split:
 *   get:
 *     tags: [Klaim]
 *     summary: Hitung hasil split bill proporsional
 *     description: Mengembalikan kalkulasi pembagian biaya per participant berdasarkan klaim
 *     parameters:
 *       - in: path
 *         name: notaId
 *         required: true
 *         schema: { type: integer }
 *         description: ID nota
 *     responses:
 *       200:
 *         description: Hasil split bill
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/SplitResult'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/nota/:notaId/split", klaimController.getSplitResultHandler);

export default router;
