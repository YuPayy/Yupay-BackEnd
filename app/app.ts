import express from "express";
import authRoutes from "../src/modules/auth/auth.route";

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).send(`
    <div style="font-family: fantasy; text-align: center; margin-top: 50px;">
      <h1 style="color: #3A6F43;">🚀 Yupay Backend API</h1>
      <p>Server is running successfully 🎉</p>
    </div>
  `);
});

app.use("/auth", authRoutes);

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).send("Something broke! " + err.message);
});

export default app;
