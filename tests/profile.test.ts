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

describe("Profile Module", () => {
  it("1. should create new profile", async () => {
    const user = await registerAndLogin("profile1");

    const res = await getRequest()
      .post("/profile")
      .set(authHeader(user.token))
      .send({ name: "Bintang Ridwan" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Bintang Ridwan");
    expect(res.body.userId).toBe(user.user_id);
  });

  it("2. should get profile by token", async () => {
    const user = await registerAndLogin("profile2");
    await getRequest()
      .post("/profile")
      .set(authHeader(user.token))
      .send({ name: "Profile 2" });

    const res = await getRequest()
      .get("/profile/token")
      .set(authHeader(user.token));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Profile 2");
  });

  it("3. should update profile", async () => {
    const user = await registerAndLogin("profile3");
    await getRequest()
      .post("/profile")
      .set(authHeader(user.token))
      .send({ name: "Old Name" });

    const res = await getRequest()
      .put("/profile")
      .set(authHeader(user.token))
      .send({ name: "New Name" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("New Name");
  });

  it("4. should list all profiles", async () => {
    const user1 = await registerAndLogin("profile4a");
    const user2 = await registerAndLogin("profile4b");

    await getRequest()
      .post("/profile")
      .set(authHeader(user1.token))
      .send({ name: "User 1" });
    await getRequest()
      .post("/profile")
      .set(authHeader(user2.token))
      .send({ name: "User 2" });

    const res = await getRequest()
      .get("/profile")
      .set(authHeader(user1.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it("5. should upload QRIS code", async () => {
    const user = await registerAndLogin("profile5");

    const res = await getRequest()
      .post("/profile/qris")
      .set(authHeader(user.token))
      .send({ qrisUrl: "00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000403" });

    expect(res.status).toBe(201);
    expect(res.body.user.qrisCode).toBeDefined();
  });

  it("6. should get QRIS code", async () => {
    const user = await registerAndLogin("profile6");
    const qrisCode = "00020101021126570011ID.DANA.WWW";
    await getRequest()
      .post("/profile/qris")
      .set(authHeader(user.token))
      .send({ qrisUrl: qrisCode });

    const res = await getRequest()
      .get("/profile/qris")
      .set(authHeader(user.token));

    expect(res.status).toBe(200);
    expect(res.body.qrisCode).toBe(qrisCode);
  });

  it("7. should edit QRIS code", async () => {
    const user = await registerAndLogin("profile7");
    await getRequest()
      .post("/profile/qris")
      .set(authHeader(user.token))
      .send({ qrisUrl: "OLD_QRIS_CODE" });

    const newQris = "NEW_QRIS_CODE_123";
    const res = await getRequest()
      .put("/profile/qris")
      .set(authHeader(user.token))
      .send({ qrisUrl: newQris });

    expect(res.status).toBe(200);
    expect(res.body.user.qrisCode).toBe(newQris);
  });

  it("8. should delete QRIS code", async () => {
    const user = await registerAndLogin("profile8");
    await getRequest()
      .post("/profile/qris")
      .set(authHeader(user.token))
      .send({ qrisUrl: "TEMP_QRIS" });

    const res = await getRequest()
      .delete("/profile/qris")
      .set(authHeader(user.token));

    expect(res.status).toBe(200);
    expect(res.body.user.qrisCode).toBeNull();
  });

  it("9. should reject request without token", async () => {
    const res = await getRequest().get("/profile/token");

    expect(res.status).toBe(401);
  });
});
