import { Router } from "express";
import * as paymentController from "./payment.controller";
import { uploadPaymentProof } from "../../utils/upload";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Payment
 *     description: Payment & upload bukti transfer
 */

router.post("/", uploadPaymentProof.single("proof"), paymentController.createPaymentHandler);
router.get("/nota/:notaId", paymentController.getPaymentsByNotaHandler);
router.patch("/:paymentId/verify", paymentController.verifyPaymentHandler);

export default router;
