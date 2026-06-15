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
import { authLimiter, otpLimiter } from "../../middlewares/rateLimiter";

const router = Router();

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Register, login, OAuth Google, forgot/reset password
 *
 * components:
 *   schemas:
 *     RegisterRequest:
 *       type: object
 *       required: [username, email, password]
 *       properties:
 *         username: { type: string, example: bintang }
 *         email: { type: string, format: email, example: bintang@example.com }
 *         password: { type: string, format: password, minLength: 6, example: rahasia123 }
 *
 *     LoginRequest:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email: { type: string, format: email, example: bintang@example.com }
 *         password: { type: string, format: password, example: rahasia123 }
 *
 *     LoginResponse:
 *       type: object
 *       properties:
 *         status: { type: string, example: success }
 *         token: { type: string, example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... }
 *         user:
 *           $ref: '#/components/schemas/User'
 *
 *     ForgotPasswordRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email: { type: string, format: email }
 *
 *     ResetPasswordRequest:
 *       type: object
 *       required: [email, kodeOtp, newPassword]
 *       properties:
 *         email: { type: string, format: email }
 *         kodeOtp: { type: string, example: "482915" }
 *         newPassword: { type: string, format: password, minLength: 6 }
 */

router.use(
  cookieSession({
    name: "session",
    keys: [process.env.COOKIE_KEY || "yupaycookie"],
    maxAge: 24 * 60 * 60 * 1000,
  })
);

router.use(passport.initialize());
router.use(passport.session());

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register user baru
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Validasi gagal
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
router.post("/register", authLimiter, registerController);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login dengan email + password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login berhasil, kembalikan JWT token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Email atau password salah
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/login", authLimiter, loginController);

/**
 * @openapi
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Kirim OTP ke email untuk reset password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ForgotPasswordRequest'
 *     responses:
 *       200:
 *         description: OTP dikirim ke email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string, example: OTP telah dikirim ke email Anda }
 *       404:
 *         description: Email tidak terdaftar
 */
router.post("/forgot-password", otpLimiter, forgotPasswordController);

/**
 * @openapi
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password dengan OTP
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ResetPasswordRequest'
 *     responses:
 *       200:
 *         description: Password berhasil direset
 *       400:
 *         description: OTP salah atau kadaluarsa
 */
router.post("/reset-password", resetPasswordController);

/**
 * @openapi
 * /auth/google:
 *   get:
 *     tags: [Auth]
 *     summary: Mulai OAuth Google login
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect ke halaman OAuth Google
 */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @openapi
 * /auth/google/callback:
 *   get:
 *     tags: [Auth]
 *     summary: Callback dari Google OAuth
 *     security: []
 *     responses:
 *       302:
 *         description: Redirect ke frontend dengan JWT token di query
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *               example: http://localhost:3001/pages/home?token=eyJhbGc...
 */
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

    res.redirect(`http://localhost:3001/pages/home?token=${token}`);
  }
);

export default router;
