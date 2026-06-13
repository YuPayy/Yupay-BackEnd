import { getRequest } from "./app.helper";

export interface TestUser {
  user_id: number;
  username: string;
  email: string;
  token: string;
}

let counter = 0;

function unique(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}`;
}

export async function registerAndLogin(
  prefix: string = "testuser",
  overrides: { username?: string; email?: string; password?: string } = {}
): Promise<TestUser> {
  const username = overrides.username || unique(prefix);
  const email = overrides.email || `${username}@test.com`;
  const password = overrides.password || "password123";

  const regRes = await getRequest()
    .post("/auth/register")
    .send({ username, email, password, confirmPassword: password });

  if (regRes.status !== 201) {
    throw new Error(`Register failed: ${regRes.status} ${JSON.stringify(regRes.body)}`);
  }

  const loginRes = await getRequest()
    .post("/auth/login")
    .send({ identifier: email, password });

  if (loginRes.status !== 200) {
    throw new Error(`Login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  }

  return {
    user_id: loginRes.body.user?.id ?? loginRes.body.data?.user_id,
    username,
    email,
    token: loginRes.body.token || loginRes.body.data?.token,
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
