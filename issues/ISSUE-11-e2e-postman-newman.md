# ISSUE #11 — Setup E2E Tests dengan Postman + Newman (CLI Runner)

**Fase**: 5 (Testing)
**Prioritas**: High
**Status**: Open
**File terkait**: `postman/`, `scripts/`, `package.json`

---

## Deskripsi

Swagger docs dan Postman collection sudah ada (Issue sebelumnya), tapi belum ada **automated E2E test** yang bisa dijalankan via CLI. Newman (Postman CLI runner) memungkinkan kita menjalankan seluruh Postman collection sebagai test suite tanpa buka Postman GUI.

## Lingkup

### A. Setup Infrastructure

1. **Install Newman** (global atau devDep):
   ```bash
   npm i -D newman newman-reporter-htmlextra
   ```
2. **`package.json`** — tambah scripts:
   ```json
   "test:e2e": "newman run postman/Yupay.postman_collection.json -e postman/Yupay.local.postman_environment.json --reporters cli,htmlextra --reporter-htmlextra-export reports/e2e-report.html",
   "test:e2e:ci": "newman run postman/Yupay.postman_collection.json -e postman/Yupay.ci.postman_environment.json --reporters cli --bail"
   ```
3. **`postman/Yupay.ci.postman_environment.json`** — environment CI (tanpa auth_token default)
4. **`reports/`** folder — gitignored, output HTML report

### B. Postman Collection Enhancement

Postman collection saat ini hanya berisi request tanpa test scripts. Perlu tambahkan **Postman Tests** (JavaScript assertions) ke setiap request.

#### Auth Flow (Pre-request → Chain)

| Step | Request | Test Script |
|---|---|---|
| 1 | `POST /auth/register` | Assert 201, body.status = "success" |
| 2 | `POST /auth/login` | Assert 200, extract `token` → set env `auth_token` |

#### Profile Flow (depends on Auth)

| Step | Request | Test Script |
|---|---|---|
| 3 | `POST /profile` | Assert 201, body has `id` |
| 4 | `GET /profile/token` | Assert 200, body.username exists |
| 5 | `PUT /profile` | Assert 200 |
| 6 | `POST /profile/qris` | Assert 201 |
| 7 | `GET /profile/qris` | Assert 200, body.qrisCode exists |

#### Friends Flow (depends on 2 users)

| Step | Request | Test Script |
|---|---|---|
| 8 | `POST /auth/register` (user2) | Assert 201 |
| 9 | `POST /auth/login` (user2) | Extract token2 |
| 10 | `POST /friends/add` (user1 → user2) | Assert 201 |
| 11 | `GET /friends/pending` (user2) | Assert 200, array length ≥ 1 |
| 12 | `POST /friends/confirm` (user2 → accept) | Assert 200 |
| 13 | `GET /friends` (user1) | Assert 200, includes user2 |

#### Nota + OCR Flow

| Step | Request | Test Script |
|---|---|---|
| 14 | `POST /api/v1/nota` | Assert 201, body.nota_id exists |
| 15 | `GET /api/v1/nota/:id` | Assert 200, items array |
| 16 | `POST /api/v1/nota/scan` (no file) | Assert 400 |

#### Notifikasi Flow

| Step | Request | Test Script |
|---|---|---|
| 17 | `POST /api/v1/notifikasi` | Assert 201 |
| 18 | `GET /api/v1/notifikasi` | Assert 200, array |
| 19 | `PATCH /api/v1/notifikasi/:id` | Assert 200 |
| 20 | `DELETE /api/v1/notifikasi/:id` | Assert 200 |

#### Negative Tests

| Step | Request | Test Script |
|---|---|---|
| 21 | `GET /profile/token` (no token) | Assert 401 |
| 22 | `GET /api/v1/notifikasi` (no token) | Assert 401 |
| 23 | `GET /api/v1/nota/99999` | Assert 404 |

### C. Test Script Pattern (di setiap request)

```javascript
// Example: POST /auth/login
pm.test("Status 200", () => pm.response.to.have.status(200));
pm.test("Has token", () => {
  const json = pm.response.json();
  pm.expect(json.token).to.be.a("string");
  pm.environment.set("auth_token", "Bearer " + json.token);
});
pm.test("Response time < 2s", () => pm.expect(pm.response.responseTime).to.be.below(2000));
```

### D. Pre-request Script (Collection Level)

```javascript
// Auto-attach token ke semua request yang butuh auth
if (pm.environment.get("auth_token")) {
  pm.request.headers.add({
    key: "Authorization",
    value: pm.environment.get("auth_token")
  });
}
```

## Langkah Pengerjaan

1. `npm i -D newman newman-reporter-htmlextra`
2. Update Postman collection: tambah test scripts per request (bisa manual di Postman GUI atau edit JSON langsung)
3. Buat `postman/Yupay.ci.postman_environment.json` (tanpa token, base_url = localhost)
4. Tambah npm scripts `test:e2e` dan `test:e2e:ci`
5. Tambah `reports/` ke `.gitignore`
6. Test run:
   ```bash
   npm run dev &          # start server
   npm run test:e2e       # run newman
   ```

## Validasi

```bash
npm run test:e2e
# Output: 23 requests, 0 failures, HTML report di reports/e2e-report.html
```

## Dependensi

- Issue #09 test DB setup bisa di-reuse
- Server harus jalan saat E2E dijalankan (atau CI pipeline start server dulu)
- Postman collection harus up-to-date (`npm run docs:postman`)

## Label

`testing`, `e2e`, `postman`, `newman`
