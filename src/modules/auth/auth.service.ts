// src/modules/auth/auth.service.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { addMinutes, isAfter } from "date-fns";

const prisma = new PrismaClient();

const sendEmail = async (to: string, subject: string, html: string) => {
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    await transporter.sendMail({
        from: `"Yupay" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
    });
};

process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export const registerUser = async (username: string, email: string, password: string) => {
    const existingUser = await prisma.user.findFirst({
        where: { OR: [{ username }, { email }] }
    });

    if (existingUser) {
        throw new Error("Username or email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            username,
            email,
            passwordHash: hashedPassword,
        }
    });

    return user;
};

export const loginUser = async (identifier: string, password: string) => {
    const user = await prisma.user.findFirst({
        where: {
            OR: [
                { username: identifier },
                { email: identifier }
            ]
        },
        include: {
            Profile: true
        }
    });

    if (!user) {
        throw new Error("User not found");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        throw new Error("Invalid password");
    }

    const token = jwt.sign(
        { userId: user.user_id, username: user.username, email: user.email },
        process.env.JWT_SECRET || "yupaysecret",
        { expiresIn: "7d" }
    );

    return { user, token };
};

export const forgotPasswordService = async (email: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Email not found");

    // Generate 6 digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = addMinutes(new Date(), 5);

    // Simpan OTP ke tabel Otp
    await prisma.otp.create({
        data: {
            user_id: user.user_id,
            kodeOtp: otp,
            expiredAt: expireAt,
            status: "active",
        },
    });

    await sendEmail(
        email,
        "Yupay - OTP for Password Reset",
        `Your OTP code is: <b>${otp}</b>. It will expire in 5 minutes.`
    );
};

export const resetPasswordService = async (email: string, otp: string, newPassword: string) => {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error("Email not found");

    const otpRecord = await prisma.otp.findFirst({
        where: {
            user_id: user.user_id,
            kodeOtp: otp,
            status: "active",
        },
        orderBy: { expiredAt: "desc" },
    });

    if (!otpRecord) throw new Error("Invalid OTP");
    if (isAfter(new Date(), otpRecord.expiredAt)) throw new Error("OTP expired");

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { user_id: user.user_id },
        data: { passwordHash: hashedPassword },
    });

    // Update status OTP menjadi "used" berdasarkan otp_id
    await prisma.otp.update({
        where: { otp_id: otpRecord.otp_id },
        data: { status: "used" },
    });
};
