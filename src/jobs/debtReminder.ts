import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { notifikasiService } from "../modules/notifikasi/notifikasi.service";

const prisma = new PrismaClient();

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export const runDebtReminder = async (): Promise<number> => {
    const cutoff = new Date(Date.now() - THREE_DAYS_MS);

    const overduePayments = await prisma.payment.findMany({
        where: {
            status: { in: ["pending", "unpaid"] },
            createdAt: { lt: cutoff },
        },
        include: {
            nota: { select: { nota_id: true, totalHarga: true } },
            from: { select: { user_id: true, username: true } },
        },
    });

    let notified = 0;
    for (const payment of overduePayments) {
        await notifikasiService.createReminder(
            payment.from_user_id,
            "Pengingat Pembayaran",
            `Pembayaran untuk Nota #${payment.nota_id} sudah lewat 3 hari. Segera selesaikan pembayaran Anda.`
        );
        notified += 1;
    }

    console.info(
        `[cron] Debt reminder: ${overduePayments.length} overdue, ${notified} notifications sent`
    );

    return notified;
};

export const startDebtReminderJob = (): void => {
    if (process.env.ENABLE_CRON !== "true") {
        console.info("[cron] Debt reminder disabled (ENABLE_CRON != true)");
        return;
    }

    const timezone = process.env.CRON_TIMEZONE || "Asia/Jakarta";
    const schedule = "0 8 * * *";

    cron.schedule(
        schedule,
        () => {
            runDebtReminder().catch((err) => {
                console.error("[cron] Debt reminder failed:", err);
            });
        },
        { timezone }
    );

    console.info(
        `[cron] Debt reminder job started — schedule: "${schedule}", timezone: ${timezone}`
    );
};
