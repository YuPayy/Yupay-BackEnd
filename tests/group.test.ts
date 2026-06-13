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

describe("Group Module", () => {
  it("1. should create group", async () => {
    const user = await registerAndLogin("owner1");

    const res = await getRequest()
      .post("/group")
      .set(authHeader(user.token))
      .send({ title: "Makan Siang", description: "Resto Padang" });

    expect(res.status).toBe(200);
    expect(res.body.nota_id).toBeDefined();
    expect(res.body.payer_id).toBe(user.user_id);
  });

  it("2. should invite user to group", async () => {
    const owner = await registerAndLogin("owner2");
    const member = await registerAndLogin("member2");

    // Create group
    const groupRes = await getRequest()
      .post("/group")
      .set(authHeader(owner.token))
      .send({ title: "Group Test 2" });
    const groupId = groupRes.body.nota_id;

    const res = await getRequest()
      .post(`/group/${groupId}/invite`)
      .set(authHeader(owner.token))
      .send({ friendId: member.user_id });

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe(member.user_id);
  });

  it("3. should reject invite by non-owner", async () => {
    const owner = await registerAndLogin("owner3");
    const stranger = await registerAndLogin("stranger3");
    const target = await registerAndLogin("target3");

    const groupRes = await getRequest()
      .post("/group")
      .set(authHeader(owner.token))
      .send({ title: "Group Test 3" });
    const groupId = groupRes.body.nota_id;

    const res = await getRequest()
      .post(`/group/${groupId}/invite`)
      .set(authHeader(stranger.token))
      .send({ friendId: target.user_id });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it("4. should get user invites", async () => {
    const owner = await registerAndLogin("owner4");
    const member = await registerAndLogin("member4");

    const groupRes = await getRequest()
      .post("/group")
      .set(authHeader(owner.token))
      .send({ title: "Group Test 4" });
    const groupId = groupRes.body.nota_id;

    await getRequest()
      .post(`/group/${groupId}/invite`)
      .set(authHeader(owner.token))
      .send({ friendId: member.user_id });

    const res = await getRequest()
      .get("/group/invites")
      .set(authHeader(member.token));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  it("5. should accept invite", async () => {
    const owner = await registerAndLogin("owner5");
    const member = await registerAndLogin("member5");

    const groupRes = await getRequest()
      .post("/group")
      .set(authHeader(owner.token))
      .send({ title: "Group Test 5" });
    const groupId = groupRes.body.nota_id;

    await getRequest()
      .post(`/group/${groupId}/invite`)
      .set(authHeader(owner.token))
      .send({ friendId: member.user_id });

    const res = await getRequest()
      .put(`/group/${groupId}/respond`)
      .set(authHeader(member.token))
      .send({ status: "accepted" });

    expect(res.status).toBe(200);
  });

  it("6. should reject invite", async () => {
    const owner = await registerAndLogin("owner6");
    const member = await registerAndLogin("member6");

    const groupRes = await getRequest()
      .post("/group")
      .set(authHeader(owner.token))
      .send({ title: "Group Test 6" });
    const groupId = groupRes.body.nota_id;

    await getRequest()
      .post(`/group/${groupId}/invite`)
      .set(authHeader(owner.token))
      .send({ friendId: member.user_id });

    const res = await getRequest()
      .put(`/group/${groupId}/respond`)
      .set(authHeader(member.token))
      .send({ status: "rejected" });

    expect(res.status).toBe(200);
  });
});
