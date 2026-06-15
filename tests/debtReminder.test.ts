import { runDebtReminder } from "../src/jobs/debtReminder";
import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";

jest.mock("node-cron", () => ({
    schedule: jest.fn(),
}));

beforeEach(async () => {
    await cleanDatabase();
});

afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
});

describe("Debt Reminder Cron (Issue #28)", () => {
    it("1. should send notifications only for payments older than 3 days", async () => {
        const payer = await registerAndLogin("cronpayer1");
        const debtor = await registerAndLogin("crondebtor1");

        const notaRes = await getRequest()
            .post("/api/v1/nota")
            .send({
                payer_id: payer.user_id,
                tanggalTransaksi: new Date().toISOString(),
                totalHarga: 50000,
                status: "open",
                items: [{ namaItem: "X", quantity: 1, harga: 50000 }],
            });
        const nota = notaRes.body.data;

        await getRequest()
            .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
            .set(authHeader(debtor.token));

        const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
        const recentDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);

        await prisma.payment.create({
            data: {
                nota_id: nota.nota_id,
                from_user_id: debtor.user_id,
                to_user_id: payer.user_id,
                amount: 25000,
                status: "pending",
                createdAt: oldDate,
                updatedAt: oldDate,
            },
        });

        await prisma.payment.create({
            data: {
                nota_id: nota.nota_id,
                from_user_id: debtor.user_id,
                to_user_id: payer.user_id,
                amount: 25000,
                status: "pending",
                createdAt: recentDate,
                updatedAt: recentDate,
            },
        });

        const sent = await runDebtReminder();
        expect(sent).toBe(1);

        const notifs = await prisma.notifikasi.findMany({
            where: { userId: debtor.user_id },
        });
        expect(notifs).toHaveLength(1);
        expect(notifs[0].title).toBe("Pengingat Pembayaran");
    });

    it("2. should NOT notify for confirmed payments", async () => {
        const payer = await registerAndLogin("cronpayer2");
        const debtor = await registerAndLogin("crondebtor2");

        const notaRes = await getRequest()
            .post("/api/v1/nota")
            .send({
                payer_id: payer.user_id,
                tanggalTransaksi: new Date().toISOString(),
                totalHarga: 50000,
                status: "open",
                items: [{ namaItem: "X", quantity: 1, harga: 50000 }],
            });
        const nota = notaRes.body.data;

        const oldDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

        await prisma.payment.create({
            data: {
                nota_id: nota.nota_id,
                from_user_id: debtor.user_id,
                to_user_id: payer.user_id,
                amount: 50000,
                status: "confirmed",
                createdAt: oldDate,
                updatedAt: oldDate,
            },
        });

        const sent = await runDebtReminder();
        expect(sent).toBe(0);

        const notifs = await prisma.notifikasi.findMany({
            where: { userId: debtor.user_id },
        });
        expect(notifs).toHaveLength(0);
    });
});
