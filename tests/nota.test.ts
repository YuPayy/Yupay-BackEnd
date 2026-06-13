import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";

jest.mock("axios", () => ({
  __esModule: true,
  default: {
    post: jest.fn().mockResolvedValue({
      data: {
        items: [
          { name: "Nasi Goreng", qty: 2, price: 25000 },
          { name: "Es Teh", qty: 1, price: 5000 },
        ],
        total_price: 55000,
      },
    }),
    isAxiosError: jest.fn().mockReturnValue(false),
  },
  isAxiosError: jest.fn().mockReturnValue(false),
}));

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Nota Module", () => {
  it("1. should create nota with items", async () => {
    const user = await registerAndLogin("nota1");

    const res = await getRequest()
      .post("/api/v1/nota")
      .send({
        payer_id: user.user_id,
        tanggalTransaksi: new Date().toISOString(),
        totalHarga: 50000,
        status: "open",
        items: [
          { namaItem: "Nasi Goreng", quantity: 1, harga: 25000 },
          { namaItem: "Es Teh", quantity: 1, harga: 5000 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.nota_id).toBeDefined();
    expect(res.body.data.items.length).toBe(2);
  });

  it("2. should get nota by ID", async () => {
    const user = await registerAndLogin("nota2");

    const createRes = await getRequest()
      .post("/api/v1/nota")
      .send({
        payer_id: user.user_id,
        tanggalTransaksi: new Date().toISOString(),
        totalHarga: 30000,
        status: "open",
        items: [{ namaItem: "Item A", quantity: 1, harga: 30000 }],
      });
    const notaId = createRes.body.data.nota_id;

    const res = await getRequest().get(`/api/v1/nota/${notaId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.nota_id).toBe(notaId);
  });

  it("3. should return 404 for non-existent nota", async () => {
    const res = await getRequest().get("/api/v1/nota/99999");

    expect(res.status).toBe(404);
  });

  it("4. should reject scan without file", async () => {
    const res = await getRequest().post("/api/v1/nota/scan");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/image/i);
  });

  it("5. should reject scan with non-image file", async () => {
    const res = await getRequest()
      .post("/api/v1/nota/scan")
      .attach("image", Buffer.from("plain text content"), {
        filename: "test.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
  });

  it("6. should call OCR service on valid image (mocked)", async () => {
    // 1x1 transparent PNG
    const pngBuffer = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgAAIAAAUAAarVyFEAAAAASUVORK5CYII=",
      "base64"
    );

    const res = await getRequest()
      .post("/api/v1/nota/scan")
      .attach("image", pngBuffer, {
        filename: "receipt.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(200);
    expect(res.body.data.totalHarga).toBe(55000);
    expect(res.body.data.items.length).toBe(2);
  });
});
