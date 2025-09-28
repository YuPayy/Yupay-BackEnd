// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } from "./auth.schema";
import { registerUser, loginUser, forgotPasswordService, resetPasswordService } from "./auth.service";

// Register user
export const registerController = async (req: Request, res: Response) => {
    try {
        const parsed = registerSchema.parse(req.body);
        const user = await registerUser(
            parsed.username,
            parsed.email,
            parsed.password
        );

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
            }
        });
    } catch (err: any) {
        return res.status(400).json({
            error: err.message || "Invalid input",
        });
    }
};

// Login user
export const loginController = async (req: Request, res: Response) => {
    try {
        const parsed = loginSchema.parse(req.body);

        // Ambil user beserta profile
        const { user, token } = await loginUser(parsed.identifier, parsed.password);

        // Ambil profile user (gunakan prisma include di loginUser)
        const profile = user.Profile
            ? { name: user.Profile.name, image: user.Profile.image }
            : null;

        return res.status(200).json({
            message: "Login successful",
            token,
            user: {
                id: user.user_id,
                username: user.username,
                email: user.email,
            },
            profile
        });
    } catch (err: any) {
        return res.status(400).json({
            error: err.message || "Invalid credentials",
        });
    }
};

// Forgot password
export const forgotPasswordController = async (req: Request, res: Response) => {
    try {
        const { email } = forgotPasswordSchema.parse(req.body);
        await forgotPasswordService(email);
        return res.status(200).json({ message: "OTP sent to your email" });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to send OTP" });
    }
};

// Reset password
export const resetPasswordController = async (req: Request, res: Response) => {
    let body = req.body;

    if (body && typeof body === "object") {
        if (!body.otp && body.token) {
            body = { ...body, otp: body.token };
        }
    }

    if (!body.email) {
        return res.status(400).json({ error: "Missing required field: email" });
    }
    if (!body.otp) {
        return res.status(400).json({ error: "Missing required field: otp" });
    }
    if (!body.newPassword) {
        return res.status(400).json({ error: "Missing required field: newPassword" });
    }

    const parsed = resetPasswordSchema.safeParse(body);
    if (!parsed.success) {
        const issues = parsed.error?.issues;
        return res.status(400).json({
            error: Array.isArray(issues)
                ? issues.map(e => ({ path: e.path, message: e.message }))
                : "Invalid input"
        });
    }

    try {
        const { email, otp, newPassword } = parsed.data;
        await resetPasswordService(email, otp, newPassword);

        return res.status(200).json({ message: "Password updated successfully" });
    } catch (err: any) {
        return res.status(400).json({ error: err.message || "Failed to reset password" });
    }
};
