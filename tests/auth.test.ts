import { cleanDatabase, prisma } from "./setup";
import { getRequest } from "./helpers/app.helper";
import { registerAndLogin, authHeader } from "./helpers/auth.helper";

jest.mock("nodemailer", () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: "mock-id" }),
  }),
}));

beforeEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
  await prisma.$disconnect();
});

describe("Auth Module", () => {
  describe("POST /auth/register", () => {
    it("1. should register new user successfully", async () => {
      const res = await getRequest()
        .post("/auth/register")
        .send({
          username: "newuser1",
          email: "new1@test.com",
          password: "password123",
          confirmPassword: "password123",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/success/i);
      expect(res.body.user.username).toBe("newuser1");
      expect(res.body.user.email).toBe("new1@test.com");
    });

    it("2. should reject duplicate email", async () => {
      await registerAndLogin("dup", { email: "dup@test.com" });

      const res = await getRequest()
        .post("/auth/register")
        .send({
          username: "anotheruser",
          email: "dup@test.com",
          password: "password123",
          confirmPassword: "password123",
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("2b. should reject when passwords don't match", async () => {
      const res = await getRequest()
        .post("/auth/register")
        .send({
          username: "mismatch1",
          email: "mismatch@test.com",
          password: "password123",
          confirmPassword: "different123",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/login", () => {
    it("3. should login with valid credentials", async () => {
      const user = await registerAndLogin("login1", { email: "login1@test.com" });

      const res = await getRequest()
        .post("/auth/login")
        .send({ identifier: user.email, password: "password123" });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user.email).toBe(user.email);
    });

    it("4. should reject wrong password", async () => {
      const user = await registerAndLogin("wrongpw", { email: "wrongpw@test.com" });

      const res = await getRequest()
        .post("/auth/login")
        .send({ identifier: user.email, password: "wrongpassword" });

      expect(res.status).toBe(400);
    });

    it("5. should reject non-existent user", async () => {
      const res = await getRequest()
        .post("/auth/login")
        .send({ identifier: "nobody@test.com", password: "password123" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/forgot-password", () => {
    it("6. should send OTP for registered email", async () => {
      const user = await registerAndLogin("forgot1", { email: "forgot1@test.com" });

      const res = await getRequest()
        .post("/auth/forgot-password")
        .send({ email: user.email });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/otp/i);
    });

    it("7. should reject unknown email", async () => {
      const res = await getRequest()
        .post("/auth/forgot-password")
        .send({ email: "unknown@test.com" });

      expect(res.status).toBe(400);
    });
  });

  describe("POST /auth/reset-password", () => {
    it("8. should reset password with valid OTP", async () => {
      const user = await registerAndLogin("reset1", { email: "reset1@test.com" });

      // Trigger OTP
      await getRequest()
        .post("/auth/forgot-password")
        .send({ email: user.email });

      // Read OTP from DB (since email is mocked)
      const otp = await prisma.otp.findFirst({
        where: { user: { email: user.email } },
        orderBy: { expiredAt: "desc" },
      });

      expect(otp).not.toBeNull();

      const res = await getRequest()
        .post("/auth/reset-password")
        .send({
          email: user.email,
          otp: otp!.kodeOtp,
          newPassword: "newpassword456",
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/success/i);

      // Login with new password
      const loginRes = await getRequest()
        .post("/auth/login")
        .send({ identifier: user.email, password: "newpassword456" });

      expect(loginRes.status).toBe(200);
    });

    it("9. should reject invalid OTP", async () => {
      const user = await registerAndLogin("reset2", { email: "reset2@test.com" });

      const res = await getRequest()
        .post("/auth/reset-password")
        .send({
          email: user.email,
          otp: "000000",
          newPassword: "newpassword456",
        });

      expect(res.status).toBe(400);
    });
  });

  describe("Rate Limiting (Issue #25)", () => {
    beforeAll(() => {
        process.env.NODE_ENV = "production";
        jest.resetModules();
    });

    afterAll(() => {
        process.env.NODE_ENV = "test";
    });

    it("10. should rate-limit /auth/login after 5 failed attempts", async () => {
      jest.isolateModules(() => {
        const { authLimiter } = require("../src/middlewares/rateLimiter");
      });
      const { getRequest: getReq } = require("./helpers/app.helper");
      const freshApp = require("../backend_app/app").default;
      const request = require("supertest")(freshApp);

      for (let i = 0; i < 5; i++) {
        await request.post("/auth/login").send({ identifier: "nobody@test.com", password: "wrong" });
      }

      const res = await request.post("/auth/login").send({ identifier: "nobody@test.com", password: "wrong" });

      expect(res.status).toBe(429);
      expect(res.body.status).toBe("error");
      expect(res.body.message).toMatch(/too many/i);
    });

    it("11. should rate-limit /auth/forgot-password after 3 requests", async () => {
      const { getRequest: getReq } = require("./helpers/app.helper");
      const freshApp = require("../backend_app/app").default;
      const request = require("supertest")(freshApp);

      const user = await registerAndLogin("rlforgot", { email: "rlforgot@test.com" });

      for (let i = 0; i < 3; i++) {
        await request.post("/auth/forgot-password").send({ email: user.email });
      }

      const res = await request.post("/auth/forgot-password").send({ email: user.email });

      expect(res.status).toBe(429);
      expect(res.body.message).toMatch(/too many/i);
    });
  });
});
