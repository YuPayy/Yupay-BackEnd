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

const SEED_LOGIN_PRE = `
const seedEmail = pm.environment.get("seed_email") || "alice@yupay.test";
const seedPassword = pm.environment.get("seed_password") || "Password123!";
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: "POST",
  header: { "Content-Type": "application/json" },
  body: { mode: "raw", raw: JSON.stringify({ identifier: seedEmail, password: seedPassword }) }
}, function (err, lr) {
  if (err || !lr || lr.code !== 200) { console.error("seed login fail " + (lr && lr.code)); return; }
  const j = lr.json();
  pm.environment.set("auth_token", j.token);
  pm.environment.set("bearerToken", j.token);
  if (j.user && (j.user.id || j.user.user_id)) {
    pm.environment.set("user_id", j.user.id || j.user.user_id);
  }
  pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + j.token });
  console.log("🔑 Auto-login as " + seedEmail + " (user_id=" + pm.environment.get("user_id") + ")");
});
`.trim();

const SEED_LOGIN_AS_PRE = (emailVar: string) => `
const email = pm.environment.get("${emailVar}");
const password = pm.environment.get("seed_password") || "Password123!";
if (!email) { console.error("${emailVar} missing"); return; }
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: "POST",
  header: { "Content-Type": "application/json" },
  body: { mode: "raw", raw: JSON.stringify({ identifier: email, password }) }
}, function (err, lr) {
  if (err || !lr || lr.code !== 200) { console.error("login as " + email + " fail " + (lr && lr.code)); return; }
  const token = lr.json().token;
  pm.environment.set("auth_token", token);
  pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
  console.log("🔑 Auto-login as " + email);
});
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
          } else if (v.key === "notaId") {
            v.value = "{{nota_id}}";
          } else if (v.key === "participantId") {
            v.value = "{{participant_id}}";
          } else if (v.key === "paymentId") {
            v.value = "{{payment_id}}";
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
          .replace("/claims/<integer>", "/claims/{{participant_id}}")
          .replace("/claims/:participantId", "/claims/{{participant_id}}")
          .replace("/payment/<integer>", "/payment/{{payment_id}}")
          .replace("/payment/:paymentId", "/payment/{{payment_id}}")
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
      injectTests(item, BASE_TESTS + "\n" + `
pm.test("User has expected username", () => {
  const j = pm.response.json();
  if (j.user) {
    pm.expect(j.user.username).to.eql(${JSON.stringify(username)});
    if (j.user.id) pm.environment.set("user_id", j.user.id);
  } else {
    pm.expect.fail("no user in response: " + JSON.stringify(j));
  }
});
`.trim());
      modified++;
    } else if (name.includes("login dengan") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"identifier":"{{seed_email}}","password":"{{seed_password}}"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, "");
      injectTests(item, BASE_TESTS + "\n" + `
const json = pm.response.json();
if (json.token) {
  pm.environment.set("auth_token", json.token);
  pm.environment.set("bearerToken", json.token);
  if (json.user && (json.user.id || json.user.user_id)) {
    pm.environment.set("user_id", json.user.id || json.user.user_id);
  }
  console.log("✅ Login OK — token saved to {{auth_token}} (user_id: " + pm.environment.get("user_id") + ")");
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
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("update profile") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"name":"Bintang Updated"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("get qris code user yang sedang login") && method === "GET") {
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, ACCEPT_200_OR_404_TESTS);
      modified++;
    } else if (name.includes("upload qris") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"qrisUrl":"00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000403"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("edit qris") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"qrisUrl":"00020101021126570011ID.DANA.WWW01189360091800214699150210000000000000000000000404"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("kirim friend request") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"targetUserId": {{user_id_2}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("accept atau reject friend request") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"friendId": {{user_id}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_AS_PRE("user_id_2_email") + "\n" + `
pm.request.body = { mode: "raw", raw: '{"friendId": ' + pm.environment.get("user_id") + '}', options: { raw: { language: "json" } } };
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("hapus pertemanan") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"targetUserId": {{user_id_2}} }',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat group pembayaran baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"title": "E2E Group", "description": "E2E Group Desc"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
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
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("accept atau reject invite group") && method === "PUT") {
      setBody(item, {
        mode: "raw",
        raw: '{"status": "accepted"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_AS_PRE("user_id_2_email"));
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat pembayaran baru + upload bukti transfer") && method === "POST") {
      const ts = Date.now();
      const username = `e2e_pay_${ts}`;
      const email = `${username}@test.com`;
      setBody(item, {
        mode: "formdata",
        formdata: [
          { key: "notaId", value: "0", type: "text" },
          { key: "amount", value: "10000", type: "text" },
          { key: "proof", src: "/tmp/yupay-proof.png", type: "file" },
        ],
      });
      injectPreRequest(item, SEED_LOGIN_PRE + "\n" + `
const notaId = pm.environment.get("nota_id");
if (notaId) {
  pm.request.body.formdata.find(f => f.key === "notaId").value = notaId;
}
let token = pm.environment.get("participant_token");
if (!token) {
  const seedEmail = pm.environment.get("seed_email") || "alice@yupay.test";
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/auth/login",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: { mode: "raw", raw: JSON.stringify({ identifier: "bob@yupay.test", password: "Password123!" }) }
  }, function (e2, lr) {
    if (e2 || !lr || lr.code !== 200) { console.error("pay login fail " + (lr && lr.code)); return; }
    token = lr.json().token;
    pm.environment.set("participant_token", token);
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
    if (notaId) {
      pm.sendRequest({
        url: pm.environment.get("base_url") + "/api/v1/klaim/nota/" + notaId + "/join",
        method: "POST",
        header: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: { mode: "raw", raw: "" }
      }, function (e3, jr) { /* join may already exist */ });
    }
  });
} else {
  pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
}
`.trim());
      injectTests(item, BASE_TESTS + "\n" + `
const json = pm.response.json();
if (json.data && json.data.payment_id) {
  pm.environment.set("payment_id", String(json.data.payment_id));
  console.log("Set payment_id = " + json.data.payment_id);
}
`.trim());
      modified++;
    } else if (name.includes("buat nota baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: JSON.stringify({ payer_id: 0, tanggalTransaksi: "2026-06-14T14:07:44Z", totalHarga: 125000, status: "open", items: [{ namaItem: "Item A", quantity: 1, harga: 25000 }, { namaItem: "Item B", quantity: 1, harga: 100000 }] }),
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_AS_PRE("payer_email") + "\n" + `
const seedEmail = pm.environment.get("seed_email") || "alice@yupay.test";
const seedPassword = pm.environment.get("seed_password") || "Password123!";
pm.sendRequest({
  url: pm.environment.get("base_url") + "/auth/login",
  method: "POST",
  header: { "Content-Type": "application/json" },
  body: { mode: "raw", raw: JSON.stringify({ identifier: seedEmail, password: seedPassword }) }
}, function (err, lr) {
  if (err || !lr || lr.code !== 200) { console.error("seed login fail"); return; }
  const j = lr.json();
  const payerId = (j.user && (j.user.id || j.user.user_id)) || 0;
  pm.environment.set("nota_payer_id", String(payerId));
  pm.environment.set("payer_email", seedEmail);
  const notaBody = JSON.stringify({ payer_id: payerId, tanggalTransaksi: "2026-06-14T14:07:44Z", totalHarga: 125000, status: "open", items: [{ namaItem: "Item A", quantity: 1, harga: 25000 }, { namaItem: "Item B", quantity: 1, harga: 100000 }] });
  pm.request.body = { mode: "raw", raw: notaBody, options: { raw: { language: "json" } } };
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/api/v1/nota",
    method: "POST",
    header: { "Content-Type": "application/json", "Authorization": "Bearer " + j.token },
    body: { mode: "raw", raw: notaBody }
  }, function (e2, nota) {
    if (e2 || !nota || nota.code !== 201) { console.error("nota create fail " + (nota && nota.code) + " " + (nota && nota.text())); return; }
    const body = nota.json();
    if (body.data && body.data.nota_id) {
      pm.environment.set("nota_id", body.data.nota_id);
      if (body.data.items && body.data.items[0]) pm.environment.set("nota_item_1_id", body.data.items[0].item_id);
      if (body.data.items && body.data.items[1]) pm.environment.set("nota_item_2_id", body.data.items[1].item_id);
    }
  });
});
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("get detail nota") && method === "GET") {
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("buat notifikasi baru") && method === "POST") {
      setBody(item, {
        mode: "raw",
        raw: '{"title": "E2E Notification", "message": "Notification Message"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
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
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("upload gambar struk")) {
      setBody(item, {
        mode: "formdata",
        formdata: [
          { key: "image", src: "/tmp/yupay-proof.png", type: "file" },
        ],
      });
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, `
pm.test("OCR service responded (2xx, 400, or 503)", () => {
  pm.expect(pm.response.code).to.be.oneOf([200, 201, 400, 503]);
});
pm.test("Response time < 10s", () => {
  pm.expect(pm.response.responseTime).to.be.below(10000);
});
`.trim());
      modified++;
    } else if (name.includes("bergabung sebagai participant") && method === "POST") {
      const ts = Date.now();
      const username = `e2e_part_${ts}`;
      const email = `${username}@test.com`;
      setBody(item, {
        mode: "raw",
        raw: "",
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE + "\n" + `
const notaId = pm.environment.get("nota_id");
if (!notaId) { console.error("nota_id missing, skip join"); return; }
let token = pm.environment.get("participant_token");
if (!token) {
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/auth/login",
    method: "POST",
    header: { "Content-Type": "application/json" },
    body: { mode: "raw", raw: JSON.stringify({ identifier: "bob@yupay.test", password: "Password123!" }) }
  }, function (e2, lr) {
    if (e2 || !lr || lr.code !== 200) { console.error("bob login fail"); return; }
    token = lr.json().token;
    pm.environment.set("participant_token", token);
    pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
    pm.sendRequest({
      url: pm.environment.get("base_url") + "/api/v1/klaim/nota/" + notaId + "/join",
      method: "POST",
      header: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
      body: { mode: "raw", raw: "" }
    }, function (e3, jr) {
      if (e3 || !jr) return;
      if (jr.code === 201) {
        const jb = jr.json();
        if (jb.data && jb.data.participant_id) {
          pm.environment.set("participant_id", jb.data.participant_id);
        }
      }
    });
  });
} else {
  pm.request.headers.upsert({ key: "Authorization", value: "Bearer " + token });
  pm.sendRequest({
    url: pm.environment.get("base_url") + "/api/v1/klaim/nota/" + notaId + "/join",
    method: "POST",
    header: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
    body: { mode: "raw", raw: "" }
  }, function (e3, jr) {
    if (e3 || !jr) return;
    if (jr.code === 201) {
      const jb = jr.json();
      if (jb.data && jb.data.participant_id) {
        pm.environment.set("participant_id", jb.data.participant_id);
      }
    }
  });
}
`.trim());
      injectTests(item, `
pm.test("Join accepted (201) or already joined (400)", () => {
  pm.expect(pm.response.code).to.be.oneOf([201, 400]);
});
pm.test("Response time < 5s", () => {
  pm.expect(pm.response.responseTime).to.be.below(5000);
});
`.trim());
      modified++;
    } else if (name.includes("wajib di-upload") || name.includes("no file") || name.includes("format tidak")) {
      injectTests(item, VALIDATION_TESTS);
      modified++;
    } else if (name.includes("verifikasi")) {
      setBody(item, {
        mode: "raw",
        raw: '{"status": "confirmed"}',
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_AS_PRE("payer_email"));
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("google")) {
      modified++;
    } else if (name.includes("upsert klaim items")) {
      setBody(item, {
        mode: "raw",
        raw: JSON.stringify({ participantId: 0, items: [{ itemId: 0, quantity: 1 }] }),
        options: { raw: { language: "json" } },
      });
      injectPreRequest(item, SEED_LOGIN_PRE + "\n" + `
const partId = pm.environment.get("participant_id");
const itemId = pm.environment.get("nota_item_2_id") || pm.environment.get("nota_item_1_id");
if (partId && itemId) {
  pm.request.body = {
    mode: "raw",
    raw: JSON.stringify({ participantId: parseInt(partId), items: [{ itemId: parseInt(itemId), quantity: 1 }] }),
    options: { raw: { language: "json" } }
  };
}
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else if (name.includes("get daftar klaim items") || name.includes("hitung hasil split bill")) {
      injectPreRequest(item, SEED_LOGIN_PRE + "\n" + `
const partId = pm.environment.get("participant_id");
if (partId) {
  const url = pm.request.url.toString().replace("{{participant_id}}", partId);
  pm.request.url = url;
}
`.trim());
      injectTests(item, BASE_TESTS);
      modified++;
    } else {
      injectPreRequest(item, SEED_LOGIN_PRE);
      injectTests(item, BASE_TESTS);
      modified++;
    }
  }
}

for (const folder of collection.item) {
  walkFolder(folder);
}

// Reorder folders so we follow logical dependency order: auth -> profile -> friends -> group -> payment -> nota -> klaim
const order = ["auth", "profile", "friends", "group", "api/v1"];

function sortRequestsInFolder(folder: any) {
  if (!folder.item) return;
  const orderInV1 = [
    "nota",
    "klaim",
    "payment",
    "notifikasi",
  ];
  folder.item.sort((a: any, b: any) => {
    if (folder.name === "api/v1") {
      const aIdx = orderInV1.indexOf(a.name);
      const bIdx = orderInV1.indexOf(b.name);
      const ai = aIdx === -1 ? 999 : aIdx;
      const bi = bIdx === -1 ? 999 : bIdx;
      if (ai !== bi) return ai - bi;
      return a.name.localeCompare(b.name);
    }
    if (a.item && !b.item) return 1;
    if (b.item && !a.item) return -1;
    return 0;
  });
  for (const child of folder.item) {
    if (child.item) sortRequestsInFolder(child);
  }
}

for (const folder of collection.item) {
  sortRequestsInFolder(folder);
}
collection.item.sort((a: any, b: any) => {
  const aIdx = order.indexOf(a.name);
  const bIdx = order.indexOf(b.name);
  return aIdx - bIdx;
});

// Clear collection level auth to let individual request's bearerAuth handle headers properly
collection.auth = null;

writeFileSync(COLLECTION_PATH, JSON.stringify(collection, null, 2));
console.log(`✓ Injected test scripts into ${modified} requests and sorted folders.`);
