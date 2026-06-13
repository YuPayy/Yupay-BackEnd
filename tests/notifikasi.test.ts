import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Notifikasi Module", () => {
  let testUser: Awaited<ReturnType<typeof registerAndLogin>>;

  beforeEach(async () => {
    testUser = await registerAndLogin("notif1");
  });

  it("1. should create notifikasi", async () => {
    const res = await getRequest()
      .post("/api/v1/notifikasi")
      .set(authHeader(testUser.token))
      .send({
        title: "Test Notif",
        message: "Hello world",
        isRead: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe("Test Notif");
  });

  it("2. should list all notifikasi", async () => {
    await getRequest()
      .post("/api/v1/notifikasi")
      .set(authHeader(testUser.token))
      .send({ title: "Notif A", message: "Msg A" });

    const res = await getRequest()
      .get("/api/v1/notifikasi")
      .set(authHeader(testUser.token));

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it("3. should get notifikasi by ID", async () => {
    const createRes = await getRequest()
      .post("/api/v1/notifikasi")
      .set(authHeader(testUser.token))
      .send({ title: "Notif B", message: "Msg B" });
    const id = createRes.body.data.id;

    const res = await getRequest()
      .get(`/api/v1/notifikasi/${id}`)
      .set(authHeader(testUser.token));

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
  });

  it("4. should update notifikasi", async () => {
    const createRes = await getRequest()
      .post("/api/v1/notifikasi")
      .set(authHeader(testUser.token))
      .send({ title: "Old Title", message: "Old Msg" });
    const id = createRes.body.data.id;

    const res = await getRequest()
      .patch(`/api/v1/notifikasi/${id}`)
      .set(authHeader(testUser.token))
      .send({ title: "New Title", isRead: true });

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("New Title");
  });

  it("5. should delete notifikasi", async () => {
    const createRes = await getRequest()
      .post("/api/v1/notifikasi")
      .set(authHeader(testUser.token))
      .send({ title: "To Delete", message: "Bye" });
    const id = createRes.body.data.id;

    const res = await getRequest()
      .delete(`/api/v1/notifikasi/${id}`)
      .set(authHeader(testUser.token));

    expect(res.status).toBe(200);
  });

  it("6. should return 404 for non-existent notifikasi", async () => {
    const res = await getRequest()
      .get("/api/v1/notifikasi/99999")
      .set(authHeader(testUser.token));

    expect(res.status).toBe(404);
  });

  it("7. should reject request without token", async () => {
    const res = await getRequest().get("/api/v1/notifikasi");

    expect(res.status).toBe(401);
  });
});
