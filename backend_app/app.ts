import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import authRoutes from "../src/modules/auth/auth.route";
import friendsRoutes from "../src/modules/friends/friends.routes";
import profileRoutes from "../src/modules/profile/profile.routes";
import groupRoutes from "../src/modules/group_pembayaran/group.routes";
import notaRoutes from "../src/modules/nota/nota.route";
import notifikasiRoutes from "../src/modules/notifikasi/notifikasi.routes";
import klaimRoutes from "../src/modules/klaim/klaim.route";
import paymentRoutes from "../src/modules/payment/payment.route";
import "../src/modules/auth/google.passport";
import { authMiddleware } from "../src/modules/auth/auth.middleware";
import { mountSwagger } from "./swagger";

dotenv.config();

const app = express();

app.use(express.json());

app.use(cors({
  origin: [
    "http://localhost:3001", 
    "https://yupay-frontend-app-4ex4-git-main-straw-hat-1be8d03a.vercel.app", 
    "https://yupay-app.vercel.app"
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);
console.log("Auth routes registered at /auth");

app.get("/", (req: Request, res: Response) => {
    res.status(200).send(`
    <div style="font-family: fantasy; text-align: center; margin-top: 50px;">
      <h1 style="color: #3A6F43;">🚀 Yupay Backend API</h1>
      <p>Server is running successfully 🎉</p>
      <p>📚 <a href="/api/docs">Swagger UI</a> | <a href="/api/docs.json">OpenAPI JSON</a></p>
    </div>
  `);
});

mountSwagger(app);

app.use("/auth", authRoutes);
app.use("/friends", authMiddleware, friendsRoutes);
app.use("/profile", profileRoutes);
app.use("/group", groupRoutes);
app.use("/api/v1/nota", notaRoutes);
app.use("/api/v1/notifikasi", authMiddleware, notifikasiRoutes);
app.use("/api/v1/klaim", authMiddleware, klaimRoutes);
app.use("/api/v1/payment", authMiddleware, paymentRoutes);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));




export default app;
