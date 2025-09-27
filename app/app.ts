import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors"; // ✅ Tambahkan ini
import authRoutes from "../src/modules/auth/auth.route";
import "../src/modules/auth/google.passport";

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
    </div>
  `);
});

app.use("/auth", authRoutes);

export default app;
