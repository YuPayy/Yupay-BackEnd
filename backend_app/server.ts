import http from "http";
import app from "./app";
import { initSocket } from "./socket";
import { startDebtReminderJob } from "../src/jobs/debtReminder";
import chalk from "chalk";

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
initSocket(server);
startDebtReminderJob();

server.listen(PORT, () => {
    console.log(chalk.green.bold("🚀 Yupay Backend is now running!"));
    console.log(chalk.blue(`🌐 Open in browser: http://localhost:${PORT}`));
    console.log(chalk.yellow("💡 Press CTRL+C to stop the server"));
}).on("error", (err) => {
    console.error(chalk.red("❌ Failed to start server:"), err);
});
