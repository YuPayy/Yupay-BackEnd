import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.send("Auth route works!");
});

export default router;
