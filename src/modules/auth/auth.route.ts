// src/modules/auth/auth.route.ts
import { Router } from "express";
import passport from "passport";
import cookieSession from "cookie-session";
import jwt from "jsonwebtoken";
import {
  registerController,
  loginController,
  forgotPasswordController,
  resetPasswordController,
} from "./auth.controller";

const router = Router();

// Login dengan Google OAuth2
router.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY || "yupaycookie"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

router.use(passport.initialize());
router.use(passport.session());

router.post("/register", registerController);
router.post("/login", loginController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    const user = req.user as {
      user_id?: number;
      email?: string;
      displayName?: string;
      photos?: { value: string }[];
    } | undefined;

    let token: string | null = null;
    if (user && user.user_id && user.email) {
      token = jwt.sign(
        { userId: user.user_id, email: user.email, name: user.displayName },
        process.env.JWT_SECRET || "yupaysecret",
        { expiresIn: "7d" }
      );
    }

    /*res.json({
      user: {
        email: user?.email || null,
        name: user?.displayName || null,
        picture: user?.photos?.[0]?.value || null,
      },
      provider: "google",
      token,
    });*/
    res.redirect(`http://localhost:3001/pages/home?token=${token}`);
  }
);

export default router;
