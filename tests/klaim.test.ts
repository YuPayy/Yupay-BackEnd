import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";

async function createNotaAndGetItems(payerToken: string, payerId: number) {
    const res = await getRequest()
        .post("/api/v1/nota")
        .send({
            payer_id: payerId,
            tanggalTransaksi: new Date().toISOString(),
            totalHarga: 125000,
            status: "open",
            items: [
                { namaItem: "Nasi Goreng", quantity: 2, harga: 25000 },
                { namaItem: "Es Teh", quantity: 1, harga: 5000 },
                { namaItem: "Ayam Bakar", quantity: 1, harga: 70000 },
            ],
        });
    return res.body.data as { nota_id: number; items: Array<{ item_id: number; namaItem: string; quantity: number; harga: number }> };
}

beforeEach(async () => {
    await cleanDatabase();
});

afterAll(async () => {
    await cleanDatabase();
    await prisma.$disconnect();
});

describe("Klaim Module", () => {
    describe("POST /api/v1/klaim/nota/:notaId/join", () => {
        it("should join nota successfully", async () => {
            const payer = await registerAndLogin("join1");
            const nota = await createNotaAndGetItems(payer.token, payer.user_id);

            const res = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(payer.token));

            expect(res.status).toBe(201);
            expect(res.body.data.nota_id).toBe(nota.nota_id);
            expect(res.body.data.user_id).toBe(payer.user_id);
            expect(res.body.data.statusKlaim).toBe("active");
        });

        it("should reject double join", async () => {
            const payer = await registerAndLogin("join2");
            const nota = await createNotaAndGetItems(payer.token, payer.user_id);

            await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(payer.token));

            const res = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(payer.token));

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/already/i);
        });

        it("should reject join to non-existent nota", async () => {
            const user = await registerAndLogin("join3");
            const res = await getRequest()
                .post("/api/v1/klaim/nota/99999/join")
                .set(authHeader(user.token));

            expect(res.status).toBe(404);
        });

        it("should reject without token (401)", async () => {
            const res = await getRequest().post("/api/v1/klaim/nota/1/join");
            expect(res.status).toBe(401);
        });
    });

    describe("PUT /api/v1/klaim/claims", () => {
        it("should create claims successfully", async () => {
            const user = await registerAndLogin("claim1");
            const nota = await createNotaAndGetItems(user.token, user.user_id);
            const joinRes = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user.token));
            const participantId = joinRes.body.data.participant_id;

            const res = await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user.token))
                .send({
                    participantId,
                    items: [
                        { itemId: nota.items[0].item_id, quantity: 1 },
                        { itemId: nota.items[1].item_id, quantity: 1 },
                    ],
                });

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(2);
        });

        it("should overwrite existing claims", async () => {
            const user = await registerAndLogin("claim2");
            const nota = await createNotaAndGetItems(user.token, user.user_id);
            const joinRes = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user.token));
            const participantId = joinRes.body.data.participant_id;

            // First claim
            await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user.token))
                .send({ participantId, items: [{ itemId: nota.items[0].item_id, quantity: 5 }] });

            // Overwrite
            const res = await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user.token))
                .send({ participantId, items: [{ itemId: nota.items[1].item_id, quantity: 1 }] });

            expect(res.status).toBe(200);
            expect(res.body.data.length).toBe(1);
            expect(res.body.data[0].item_id).toBe(nota.items[1].item_id);
        });
    });

    describe("GET /api/v1/klaim/nota/:notaId/split", () => {
        it("should calculate split correctly with 2 participants", async () => {
            const user1 = await registerAndLogin("split1");
            const user2 = await registerAndLogin("split2");
            const nota = await createNotaAndGetItems(user1.token, user1.user_id);

            // User1 claims item[0]: 2x 25000 = 50000
            const p1join = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user1.token));
            await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user1.token))
                .send({ participantId: p1join.body.data.participant_id, items: [{ itemId: nota.items[0].item_id, quantity: 2 }] });

            // User2 claims item[1] (5000) + item[2] (70000) = 75000
            const p2join = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));
            await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user2.token))
                .send({
                    participantId: p2join.body.data.participant_id,
                    items: [
                        { itemId: nota.items[1].item_id, quantity: 1 },
                        { itemId: nota.items[2].item_id, quantity: 1 },
                    ],
                });

            const res = await getRequest()
                .get(`/api/v1/klaim/nota/${nota.nota_id}/split`)
                .set(authHeader(user1.token));

            expect(res.status).toBe(200);
            const data = res.body.data;
            expect(data.nota_id).toBe(nota.nota_id);
            expect(data.totalHarga).toBe(125000);
            expect(data.participants.length).toBe(2);
            // totalSubtotal = 50000 + 75000 = 125000, no selisih
            expect(data.totalSubtotal).toBe(125000);
            expect(data.selisih).toBe(0);
            // User1 subtotal 50000, no tax
            const p1 = data.participants.find((p: any) => p.user_id === user1.user_id);
            expect(p1.subtotal).toBe(50000);
            expect(p1.totalAkhir).toBe(50000);
            // User2 subtotal 75000, no tax
            const p2 = data.participants.find((p: any) => p.user_id === user2.user_id);
            expect(p2.subtotal).toBe(75000);
            expect(p2.totalAkhir).toBe(75000);
        });

        it("should distribute tax proportionally", async () => {
            const user1 = await registerAndLogin("tax1");
            const user2 = await registerAndLogin("tax2");
            // Buat nota dengan totalHarga 110000, items 50000 + 50000
            const notaRes = await getRequest()
                .post("/api/v1/nota")
                .send({
                    payer_id: user1.user_id,
                    tanggalTransaksi: new Date().toISOString(),
                    totalHarga: 110000,
                    status: "open",
                    items: [
                        { namaItem: "Item A", quantity: 1, harga: 50000 },
                        { namaItem: "Item B", quantity: 1, harga: 50000 },
                    ],
                });
            const nota = notaRes.body.data;

            // User1 claims 50000, User2 claims 50000
            const p1join = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user1.token));
            await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user1.token))
                .send({ participantId: p1join.body.data.participant_id, items: [{ itemId: nota.items[0].item_id, quantity: 1 }] });

            const p2join = await getRequest()
                .post(`/api/v1/klaim/nota/${nota.nota_id}/join`)
                .set(authHeader(user2.token));
            await getRequest()
                .put("/api/v1/klaim/claims")
                .set(authHeader(user2.token))
                .send({ participantId: p2join.body.data.participant_id, items: [{ itemId: nota.items[1].item_id, quantity: 1 }] });

            const res = await getRequest()
                .get(`/api/v1/klaim/nota/${nota.nota_id}/split`)
                .set(authHeader(user1.token));

            expect(res.status).toBe(200);
            const data = res.body.data;
            // totalSubtotal = 100000, selisih = 110000 - 100000 = 10000
            expect(data.totalSubtotal).toBe(100000);
            expect(data.selisih).toBe(10000);
            // Each user: 50000 * 10000/100000 = 5000
            data.participants.forEach((p: any) => {
                expect(p.pajakProporsional).toBe(5000);
                expect(p.totalAkhir).toBe(55000);
            });
        });

        it("should return 404 if nota not found", async () => {
            const user = await registerAndLogin("split404");
            const res = await getRequest()
                .get("/api/v1/klaim/nota/99999/split")
                .set(authHeader(user.token));
            expect(res.status).toBe(404);
        });
    });
});
