import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/token", ProfileController.getProfileByToken);
router.get("/", ProfileController.list);
router.post("/", ProfileController.create);
router.put("/", ProfileController.update);
router.get("/qris", ProfileController.getQrisController);
router.post("/qris", ProfileController.uploadQrisController);
router.put("/qris", ProfileController.editQrisController);
router.delete("/qris", ProfileController.deleteQrisController);

export default router;
