import { Router } from "express";
import { GroupController } from "./group.controller";
import { authMiddleware } from "../auth/auth.middleware"; // gunakan middleware JWT yang sudah ada

const router = Router();

router.post("/", authMiddleware, GroupController.createGroup);
router.post("/:groupId/invite", authMiddleware, GroupController.inviteUser);
router.get("/invites", authMiddleware, GroupController.getUserInvites);
router.put("/:groupId/respond", authMiddleware, GroupController.respondInvite);

export default router;
