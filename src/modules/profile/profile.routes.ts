import { Router } from "express";
import { ProfileController } from "./profile.controller";
import { authMiddleware } from "../auth/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/token", ProfileController.getProfileByToken);
router.get("/", ProfileController.list);
router.post("/", ProfileController.create);
router.put("/", ProfileController.update);

export default router;
