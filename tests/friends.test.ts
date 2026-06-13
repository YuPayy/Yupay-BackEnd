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

describe("Friends Module", () => {
  it("1. should search user by username", async () => {
    const user = await registerAndLogin("findme", { email: "findme@test.com" });

    const res = await getRequest()
      .get(`/friends/search?username=${user.username}`)
      .set(authHeader(user.token));

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.username).toBe(user.username);
  });

  it("2. should add friend (send friend request)", async () => {
    const user1 = await registerAndLogin("alice");
    const user2 = await registerAndLogin("bob");

    const res = await getRequest()
      .post("/friends/add")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });

    expect(res.status).toBe(201);
    expect(res.body.data.user_id).toBe(user1.user_id);
    expect(res.body.data.friend_id).toBe(user2.user_id);
  });

  it("3. should reject self-add", async () => {
    const user = await registerAndLogin("narcissist");

    const res = await getRequest()
      .post("/friends/add")
      .set(authHeader(user.token))
      .send({ targetUserId: user.user_id });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/yourself/i);
  });

  it("4. should confirm friend request", async () => {
    const user1 = await registerAndLogin("alice2");
    const user2 = await registerAndLogin("bob2");

    // user1 adds user2
    await getRequest()
      .post("/friends/add")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });

    // user2 confirms
    const res = await getRequest()
      .post("/friends/confirm")
      .set(authHeader(user2.token))
      .send({ friendId: user1.user_id });

    expect(res.status).toBe(200);
  });

  it("5. should list friends (accepted)", async () => {
    const user1 = await registerAndLogin("alice3");
    const user2 = await registerAndLogin("bob3");

    // Add + accept
    await getRequest()
      .post("/friends/add")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });
    await getRequest()
      .post("/friends/confirm")
      .set(authHeader(user2.token))
      .send({ friendId: user1.user_id });

    const res = await getRequest()
      .get("/friends")
      .set(authHeader(user1.token));

    expect(res.status).toBe(200);
    expect(res.body.friends).toBeDefined();
    expect(res.body.friends.length).toBeGreaterThanOrEqual(1);
  });

  it("6. should list pending friend requests", async () => {
    const user1 = await registerAndLogin("alice4");
    const user2 = await registerAndLogin("bob4");

    // user1 sends, user2 has pending
    await getRequest()
      .post("/friends/add")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });

    const res = await getRequest()
      .get("/friends/pending")
      .set(authHeader(user2.token));

    expect(res.status).toBe(200);
    expect(res.body.pending).toBeDefined();
    expect(res.body.pending.length).toBeGreaterThanOrEqual(1);
  });

  it("7. should unfriend", async () => {
    const user1 = await registerAndLogin("alice5");
    const user2 = await registerAndLogin("bob5");

    // Make them friends
    await getRequest()
      .post("/friends/add")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });
    await getRequest()
      .post("/friends/confirm")
      .set(authHeader(user2.token))
      .send({ friendId: user1.user_id });

    const res = await getRequest()
      .post("/friends/unfriend")
      .set(authHeader(user1.token))
      .send({ targetUserId: user2.user_id });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/unfriended/i);
  });
});
