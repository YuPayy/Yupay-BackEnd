import { Router } from "express";
import * as klaimController from "./klaim.controller";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Klaim
 *     description: Split bill & klaim item management
 */

router.post("/nota/:notaId/join", klaimController.joinNotaHandler);
router.put("/claims", klaimController.upsertClaimsHandler);
router.get("/claims/:participantId", klaimController.getClaimsHandler);
router.get("/nota/:notaId/split", klaimController.getSplitResultHandler);

export default router;
