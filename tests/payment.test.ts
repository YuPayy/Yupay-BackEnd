import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";
import * as fs from "fs";
import * as path from "path";

async function createNotaAndJoin(payerToken: string, payerId: number, totalHarga: number, items: any[]) {
    const notaRes = await getRequest()
        .post("/api/v1/nota")
        .send({ payer_id: payerId, tanggalTransaksi: new Date().toISOString(), totalHarga, status: "open", items });
    const nota = notaRes.body.data;
    const joinRes = await getRequest()
        .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
        .set(authHeader(payerToken));
    return { nota, participantId: joinRes.body.data.participant_id };
}

function createFakeImageBuffer(): Buffer {
    return Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82,
    ]);
}

beforeEach(async () => {
    await cleanDatabase();
    // Clean upload dir
    const uploadDir = path.join(process.cwd(), "uploads/payments");
    if (fs.existsSync(uploadDir)) {
        const files = fs.readdirSync(uploadDir);
        for (const f of files) {
            if (f !== ".gitkeep") fs.unlinkSync(path.join(uploadDir, f));
        }
    }
});

afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
});

describe("Payment Module", () => {
    describe("POST /api/v1/payment", () => {
        it("should create payment with file upload", async () => {
            const payer = await registerAndLogin("pay1");
            const user2 = await registerAndLogin("pay2");
            const { nota, participantId: _ } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const res = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });

            expect(res.status).toBe(201);
            expect(res.body.data.status).toBe("pending");
            expect(res.body.data.from_user_id).toBe(user2.user_id);
            expect(res.body.data.to_user_id).toBe(payer.user_id);
            expect(res.body.data.proofUrl).toMatch(/^\/uploads\/payments\/payment-/);

            // Verify file exists on disk
            const filename = res.body.data.proofUrl.split("/").pop();
            const filePath = path.join(process.cwd(), "uploads/payments", filename);
            expect(fs.existsSync(filePath)).toBe(true);
        });

        it("should reject payment to self", async () => {
            const payer = await registerAndLogin("self1");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);

            const res = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(payer.token))
                .field("notaId", nota.nota_id)
                .field("amount", 50000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/sendiri/i);
        });

        it("should reject without joining nota", async () => {
            const payer = await registerAndLogin("notjoin1");
            const user2 = await registerAndLogin("notjoin2");
            const notaRes = await getRequest()
                .post("/api/v1/nota")
                .send({
                    payer_id: payer.user_id,
                    tanggalTransaksi: new Date().toISOString(),
                    totalHarga: 50000,
                    status: "open",
                    items: [{ namaItem: "Item A", quantity: 1, harga: 50000 }],
                });
            const nota = notaRes.body.data;

            // user2 does NOT join nota
            const res = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });

            expect(res.status).toBe(403);
        });

        it("should reject without file", async () => {
            const payer = await registerAndLogin("nofile1");
            const user2 = await registerAndLogin("nofile2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const res = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000);

            expect(res.status).toBe(400);
        });

        it("should reject invalid file type", async () => {
            const payer = await registerAndLogin("badtype1");
            const user2 = await registerAndLogin("badtype2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            // Use a disallowed MIME type (e.g., .docx) — fileFilter will reject it
            const res = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000)
                .attach("proof", Buffer.from("fake doc content"), { filename: "bukti.docx", contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });

            expect(res.status).toBeGreaterThanOrEqual(400);
            expect(res.status).not.toBe(201);
        });
    });

    describe("PATCH /api/v1/payment/:paymentId/verify", () => {
        it("should confirm payment and update nota status to paid", async () => {
            const payer = await registerAndLogin("verify1");
            const user2 = await registerAndLogin("verify2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const payRes = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 50000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });
            const paymentId = payRes.body.data.payment_id;

            const res = await getRequest()
                .patch(`/api/v1/payment/${paymentId}/verify`)
                .set(authHeader(payer.token))
                .send({ status: "confirmed" });

            expect(res.status).toBe(200);
            expect(res.body.data.status).toBe("confirmed");

            // Cek nota status auto-update
            const notaRes = await getRequest().get(`/api/v1/nota/${nota.nota_id}`);
            expect(notaRes.body.data.status).toBe("paid");
        });

        it("should reject verification by non-payer", async () => {
            const payer = await registerAndLogin("reject1");
            const user2 = await registerAndLogin("reject2");
            const user3 = await registerAndLogin("reject3");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const payRes = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });

            // user3 mencoba verifikasi (bukan payer)
            const res = await getRequest()
                .patch(`/api/v1/payment/${payRes.body.data.payment_id}/verify`)
                .set(authHeader(user3.token))
                .send({ status: "confirmed" });

            expect(res.status).toBe(403);
        });

        it("should reject verification of already confirmed payment", async () => {
            const payer = await registerAndLogin("double1");
            const user2 = await registerAndLogin("double2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const payRes = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 50000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });
            const paymentId = payRes.body.data.payment_id;

            // Konfirmasi pertama kali
            await getRequest()
                .patch(`/api/v1/payment/${paymentId}/verify`)
                .set(authHeader(payer.token))
                .send({ status: "confirmed" });

            // Coba konfirmasi lagi
            const res = await getRequest()
                .patch(`/api/v1/payment/${paymentId}/verify`)
                .set(authHeader(payer.token))
                .send({ status: "confirmed" });

            expect(res.status).toBe(400);
        });

        it("should reject payment that is rejected (cannot re-verify)", async () => {
            const payer = await registerAndLogin("rejectfin1");
            const user2 = await registerAndLogin("rejectfin2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            const payRes = await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 50000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });
            const paymentId = payRes.body.data.payment_id;

            // Reject
            await getRequest()
                .patch(`/api/v1/payment/${paymentId}/verify`)
                .set(authHeader(payer.token))
                .send({ status: "rejected" });

            // Coba verify lagi setelah reject
            const res = await getRequest()
                .patch(`/api/v1/payment/${paymentId}/verify`)
                .set(authHeader(payer.token))
                .send({ status: "confirmed" });

            expect(res.status).toBe(400);
        });
    });

    describe("GET /api/v1/payment/nota/:notaId", () => {
        it("should list all payments for nota", async () => {
            const payer = await registerAndLogin("listpay1");
            const user2 = await registerAndLogin("listpay2");
            const { nota } = await createNotaAndJoin(payer.token, payer.user_id, 50000, [
                { namaItem: "Item A", quantity: 1, harga: 50000 },
            ]);
            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));

            await getRequest()
                .post("/api/v1/payment")
                .set(authHeader(user2.token))
                .field("notaId", nota.nota_id)
                .field("amount", 25000)
                .attach("proof", createFakeImageBuffer(), { filename: "bukti.png", contentType: "image/png" });

            const res = await getRequest()
                .get(`/api/v1/payment/nota/${nota.nota_id}`)
                .set(authHeader(payer.token));

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
        });
    });
});
