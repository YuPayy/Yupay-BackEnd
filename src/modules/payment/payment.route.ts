import { Router } from "express";
import * as paymentController from "./payment.controller";
import { uploadPaymentProof } from "../../utils/upload";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Payment
 *     description: Payment & upload bukti transfer
 *
 * components:
 *   schemas:
 *     CreatePaymentRequest:
 *       type: object
 *       required: [notaId, amount, proof]
 *       properties:
 *         notaId:
 *           type: integer
 *           example: 42
 *         amount:
 *           type: number
 *           example: 50000
 *         proof:
 *           type: string
 *           format: binary
 *           description: File bukti transfer (jpg, png, pdf)
 *
 *     Payment:
 *       type: object
 *       properties:
 *         payment_id: { type: integer, example: 1 }
 *         nota_id: { type: integer, example: 42 }
 *         payer_id: { type: integer, example: 1 }
 *         to_user_id: { type: integer, example: 2 }
 *         amount: { type: number, example: 50000 }
 *         proof_url: { type: string, example: /uploads/payments/payment-123.jpg }
 *         status: { type: string, enum: [pending, confirmed, rejected] }
 *         createdAt: { type: string, format: date-time }
 *
 *     VerifyPaymentRequest:
 *       type: object
 *       required: [status]
 *       properties:
 *         status:
 *           type: string
 *           enum: [confirmed, rejected]
 *           description: Status baru pembayaran
 */

/**
 * @openapi
 * /api/v1/payment:
 *   post:
 *     tags: [Payment]
 *     summary: Buat pembayaran baru + upload bukti transfer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/CreatePaymentRequest'
 *     responses:
 *       201:
 *         description: Pembayaran berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/", uploadPaymentProof.single("proof"), paymentController.createPaymentHandler);

/**
 * @openapi
 * /api/v1/payment/nota/{notaId}:
 *   get:
 *     tags: [Payment]
 *     summary: Get daftar pembayaran berdasarkan nota
 *     parameters:
 *       - in: path
 *         name: notaId
 *         required: true
 *         schema: { type: integer }
 *         description: ID nota
 *     responses:
 *       200:
 *         description: Daftar pembayaran
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Payment'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.get("/nota/:notaId", paymentController.getPaymentsByNotaHandler);

/**
 * @openapi
 * /api/v1/payment/{paymentId}/verify:
 *   patch:
 *     tags: [Payment]
 *     summary: Verifikasi / ubah status pembayaran
 *     description: Hanya penerima (to_user_id) yang bisa verifikasi. Status diubah jadi confirmed atau rejected.
 *     parameters:
 *       - in: path
 *         name: paymentId
 *         required: true
 *         schema: { type: integer }
 *         description: ID payment
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VerifyPaymentRequest'
 *     responses:
 *       200:
 *         description: Status pembayaran berhasil diupdate
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, example: success }
 *                 data:
 *                   $ref: '#/components/schemas/Payment'
 *       400:
 *         $ref: '#/components/responses/NotFound'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.patch("/:paymentId/verify", paymentController.verifyPaymentHandler);

export default router;
