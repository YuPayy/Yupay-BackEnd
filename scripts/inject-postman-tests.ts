#!/usr/bin/env node
/**
 * scripts/inject-postman-tests.ts
 *
 * Inject test scripts (pm.test) + pre-request into existing Postman collection.
 * Run after `npm run docs:postman` to add automation assertions.
 *
 * Generates pre-request scripts that fill in real test data
 * (random usernames, emails, passwords) and chain values via env vars.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const COLLECTION_PATH = join(process.cwd(), "postman/Yupay.postman_collection.json");

if (!existsSync(COLLECTION_PATH)) {
  console.error(`Collection not found: ${COLLECTION_PATH}`);
  console.error("Run `npm run docs:postman` first to generate it.");
  process.exit(1);
}

const collection = JSON.parse(readFileSync(COLLECTION_PATH, "utf8"));

function injectTests(item: any, tests: string) {
  if (!item.request) return;
  const event = item.event || [];
  const filtered = event.filter((e: any) => e.listen !== "test");
  filtered.push({
    listen: "test",
    script: { type: "text/javascript", exec: tests.split("\n") },
  });
  item.event = filtered;
}

function injectPreRequest(item: any, pre: string) {
  if (!item.request) return;
  const event = item.event || [];
  const filtered = event.filter((e: any) => e.listen !== "prerequest");
  filtered.push({
    listen: "prerequest",
    script: { type: "text/javascript", exec: pre.split("\n") },
  });
  item.event = filtered;
}

function setBody(item: any, body: any) {
  if (!item.request) return;
  item.request.body = body;
}

function clearScripts(item: any) {
  if (!item.request || !item.event) return;
  item.event = item.event.filter((e: any) => e.listen !== "test" && e.listen !== "prerequest");
}

const AUTH_HEADER_PRE = `
if (pm.environment.get("auth_token")) {
  pm.request.headers.add({ key: "Authorization", value: "Bearer " + pm.environment.get("auth_token") });
}
`.trim();

const BASE_TESTS = `
pm.test("Status is success (2xx)", () => {
  pm.expect(pm.response.code).to.be.within(200, 299);
});
pm.test("Response time < 5s", () => {
  pm.expect(pm.response.responseTime).to.be.below(5000);
});
`.trim();

const NO_AUTH_TESTS = `
pm.test("Status is 401 (Unauthorized)", () => {
  pm.expect(pm.response.code).to.equal(401);
});
`.trim();

const NOT_FOUND_TESTS = `
pm.test("Status is 404", () => {
  pm.expect(pm.response.code).to.equal(404);
});
`.trim();

const VALIDATION_TESTS = `
pm.test("Status is 400 (Bad Request)", () => {
  pm.expect(pm.response.code).to.equal(400);
});
`.trim();

const ACCEPT_200_OR_404_TESTS = `
pm.test("Status is 200 or 404", () => {
  pm.expect(pm.response.code).to.be.oneOf([200, 404]);
});
pm.test("Response time < 5s", () => {
  pm.expect(pm.response.responseTime).to.be.below(5000);
});
`.trim();

let modified = 0;

function walkFolder(folder: any) {
  if (!folder.item) return;
  for (const item of folder.item) {
    if (item.item) {
      walkFolder(item);
      continue;
    }
    if (!item.request) continue;

    const url = typeof item.request.url === "string"
      ? item.request.url
      : (item.request.url?.raw || (Array.isArray(item.request.url?.path) ? item.request.url.path.join("/") : ""));
    const name = item.name.toLowerCase();
    const method = item.request.method;

    clearScripts(item);

    // Resolve path variables
    if (item.request.url) {
      const urlLower = url.toLowerCase();
      if (Array.isArray(item.request.url.variable)) {
        item.request.url.variable = item.request.url.variable.map((v: any) => {
          if (v.key === "id") {
            if (urlLower.includes("notifikasi")) v.value = "{{notif_id}}";
            else if (urlLower.includes("nota")) v.value = "{{nota_id}}";
          } else if (v.key === "groupId") {
            v.value = "{{group_id}}";
          }
          return v;
        });
      }

      // Resolve query variables
      if (Array.isArray(item.request.url.query)) {
        item.request.url.query = item.request.url.query.map((q: any) => {
          if (q.key === "q" || q.key === "username") {
            q.key = "username";
            q.value = "{{e2e_username}}";
          }
          return q;
        });
      }

      if (typeof item.request.url.raw === "string") {
        item.request.url.raw = item.request.url.raw
          .replace("/notifikasi/<integer>", "/notifikasi/{{notif_id}}")
          .replace("/notifikasi/:id", "/notifikasi/{{notif_id}}")
          .replace("/nota/<integer>", "/nota/{{nota_id}}")
          .replace("/nota/:id", "/nota/{{nota_id}}")
          .replace("/group/<integer>", "/group/{{group_id}}")
          .replace("/group/:groupId", "/group/{{group_id}}")
          .replace("q=<string>", "username={{e2e_username}}")
          .replace("username=<string>", "username={{e2e_username}}");
      }
    }

    if (name.includes("register user baru") && method === "POST") {
      const ts = Date.now();
      const username = `e2e_reg_${ts}`;
      const email = `${username}@test.com`;
      const password = "password123";
      setBody(item, {
        mode: "raw",
        raw: JSON.stringify({ username, email, password, confirmPassword: password }),
        options: { raw: { language: "json" } },
      });
      // Persist email so subsequent login can find this user
      injectPreRequest(item, `
pm.environment.set("e2e_email", ${JSON.stringify(email)});
pm.environment.set("e2e_username", ${JSON.stringify(username)});
pm.environment.set("e2e_password", "password123");
`.trim());
      injectTests(item, BASE_TESTS + `
pm.test("User has expected username", () => {
  pm.expect(pm.response.json().user.username).to.eql(${JSON.stringify(username)});
});
`.trim());
      modified++;
    } else if (name.includes("login dengan") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"identifier":"{{e2e_email}}","password":"password123"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, "");
      injectTests(item, BASE_TESTS + `
const json = pm.response.json();
if (json.token) {
  pm.environment.set("auth_token", json.token);
  pm.environment.set("bearerToken", json.token);
  if (json.user && json.user.id) {
    pm.environment.set("user_id", json.user.id);
  }
}
`.trim());
      modified++;
    } else if (name.includes("kirim otp ke email")) {
      setBody(item, {
        mode: "raw",
        raw: '{"email":"{{e2e_email}}"}',
        options: { raw: { language: "json" } },
      });
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("reset password dengan otp")) {
      setBody(item, {
        mode: "raw",
        raw: '{"email":"{{e2e_email}}","otp":"123456","newPassword":"newpassword123"}',
        options: { raw: { language: "json" } },
      });
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat profile baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"name":"Bintang E2E"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("update profile") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"name":"Bintang Updated"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("get qris code user yang sedang login") && method === "GET") {
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, ACCEPT_200_OR_404_TESTS);
      modified++;
    } else if (name.includes("upload qris") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"qrisUrl":"00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000403"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("edit qris") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"qrisUrl":"00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000404"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("kirim friend request") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"targetUserId": {{user_id_2}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE + "\n" + `
const u2 = pm.environment.get("user_id_2");
if (!u2 || u2 === "0" || u2 === 0) {
  const ts = Date.now();
  const username = "e2e_friend_" + ts;
  const email = username + "@test.com";
  pm.environment.set("user_id_2_email", email);
  
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/auth/register",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: {
      mode: "raw",
      raw: JSON.stringify({
        username: username,
        email: email,
        password: "password123",
        confirmPassword: "password123"
      })
    }
  }, function (err, res) {
    if (err) {
      console.error("Register user2 failed with error:", err);
    } else if (res.code !== 201) {
      console.error("Register user2 failed with code " + res.code + ": " + res.text());
    } else {
      const user = res.json().user;
      pm.environment.set("user_id_2", user.id);
      console.log("Registered user2 with ID: " + user.id);
    }
  });
}
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("accept atau reject friend request") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"friendId": {{user_id}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, `
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: "POST",
  header: { "Content-Type": "application/json" },
  body: {
    mode: "raw",
    raw: JSON.stringify({
      identifier: pm.environment.get("user_id_2_email"),
      password: "password123"
    })
  }
}, function (err, res) {
  if (err) {
    console.error("Login user2 failed with error:", err);
  } else if (res.code !== 200) {
    console.error("Login user2 failed with code " + res.code + ": " + res.text());
  } else {
    const token = res.json().token;
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
    console.log("Logged in user2, set Authorization header");
  }
});
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("hapus pertemanan") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"targetUserId": {{user_id_2}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat group pembayaran baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"title": "E2E Group", "description": "E2E Group Desc"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS + "\n" + `
const json = pm.response.json();
if (json.nota_id) {
  pm.environment.set("group_id", json.nota_id);
}
`.trim());
      modified++;
    } else if (name.includes("invite user ke group") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"friendId": {{user_id_2}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("accept atau reject invite group") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"status": "accepted"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, `
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: "POST",
  header: { "Content-Type": "application/json" },
  body: {
    mode: "raw",
    raw: JSON.stringify({
      identifier: pm.environment.get("user_id_2_email"),
      password: "password123"
    })
  }
}, function (err, res) {
  if (err) {
    console.error("Login user2 for invite accept failed with error:", err);
  } else if (res.code !== 200) {
    console.error("Login user2 for invite accept failed with code " + res.code + ": " + res.text());
  } else {
    const token = res.json().token;
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
    console.log("Logged in user2 for group invite accept");
  }
});
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat nota baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"payer_id": {{user_id}}, "tanggalTransaksi": "2026-06-14T14:07:44Z", "totalHarga": 125000, "status": "open", "items": [{"namaItem": "Item A", "quantity": 1, "harga": 125000}]}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS + "\n" + `
const json = pm.response.json();
if (json.data && json.data.nota_id) {
  pm.environment.set("nota_id", json.data.nota_id);
}
`.trim());
      modified++;
    } else if (name.includes("buat notifikasi baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"title": "E2E Notification", "message": "Notification Message"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS + "\n" + `
const json = pm.response.json();
if (json.data && json.data.id) {
  pm.environment.set("notif_id", json.data.id);
}
`.trim());
      modified++;
    } else if (name.includes("update notifikasi") && method === "PATCH") {
      setBody(item, {
        mode: "raw",
        raw: '{"title": "Updated Notification", "isRead": true}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("upload gambar struk")) {
      injectTests(item, VALIDATION_TESTS);
      modified++;
    } else if (name.includes("tanpa token") || name.includes("not authorized")) {
      injectTests(item, NO_AUTH_TESTS);
      modified++;
    } else if (name.includes("tidak ditemukan") || name.includes("not found")) {
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, NOT_FOUND_TESTS);
      modified++;
    } else if (name.includes("wajib di-upload") || name.includes("no file") || name.includes("format tidak")) {
      injectTests(item, VALIDATION_TESTS);
      modified++;
    } else if (name.includes("google")) {
      modified++;
    } else {
      injectPreRequest(item, AUTH_HEADER_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    }
  }
}

for (const folder of collection.item) {
  walkFolder(folder);
}

// Reorder folders so we follow logical dependency order: auth -> profile -> friends -> group -> api/v1
const order = ["auth", "profile", "friends", "group", "api/v1"];
collection.item.sort((a: any, b: any) => {
  const aIdx = order.indexOf(a.name);
  const bIdx = order.indexOf(b.name);
  return aIdx - bIdx;
});

// Clear collection level auth to let individual request's bearerAuth handle headers properly
collection.auth = null;

writeFileSync(COLLECTION_PATH, JSON.stringify(collection, null, 2));
console.log(`✓ Injected test scripts into ${modified} requests and sorted folders.`);
