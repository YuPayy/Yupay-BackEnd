import { Router } from "express";
import { addFriendController, confirmFriendController, listFriendsController, searchFriendController, unfriendController, listPendingFriendsController } from "./friends.controller";

const router = Router();

router.get("/search", searchFriendController);
router.post("/add", addFriendController);
router.post("/confirm", confirmFriendController);
router.post("/unfriend", unfriendController);
router.get("/", listFriendsController);
router.get("/pending", listPendingFriendsController);

export default router;
