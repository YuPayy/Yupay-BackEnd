# ISSUE #09 — Setup Jest + Supertest Integration Tests (Backend)

**Fase**: 5 (Testing)
**Prioritas**: High
**Status**: Open
**File terkait**: `package.json`, `jest.config.ts`, `tsconfig.json`, semua module di `src/modules/`

---

## Deskripsi

Dependency `jest` (v30) dan `supertest` (v7) sudah terinstall di `package.json`, tapi:
- **0 file test** (`*.test.ts` / `*.spec.ts`) di seluruh project
- **0 test config** (`jest.config.*`)
- **Tidak ada npm script** `test`
- **Tidak ada test database** strategy (test langsung ke `yupay_db` = berbahaya)

Issue ini setup testing dari nol: config, helpers, dan test cases untuk semua 6 modules.

## Lingkup Test

### A. Setup Infrastructure

1. **`jest.config.ts`** — TypeScript preset, root dir, module paths
2. **`tsconfig.test.json`** — extends base tsconfig, include test files
3. **`package.json`** — tambah script: `test`, `test:watch`, `test:coverage`
4. **`tests/setup.ts`** — global setup: reset DB, seed test data
5. **`tests/helpers/auth.helper.ts`** — helper: register + login → return JWT token
6. **`tests/helpers/app.helper.ts`** — helper: export Express `app` tanpa `listen()`
7. **`.env.test`** — env khusus test: `DATABASE_URL=mysql://root:@127.0.0.1:3306/yupay_test_db`

### B. Test Cases per Module

#### 1. Auth (`tests/auth.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Register user baru | POST | `/auth/register` | 201 + user data |
| 2 | Register duplicate email | POST | `/auth/register` | 400 / error |
| 3 | Login valid | POST | `/auth/login` | 200 + JWT token |
| 4 | Login wrong password | POST | `/auth/login` | 401 |
| 5 | Login email tidak ada | POST | `/auth/login` | 401 |
| 6 | Forgot password valid email | POST | `/auth/forgot-password` | 200 |
| 7 | Forgot password unknown email | POST | `/auth/forgot-password` | 404 |
| 8 | Reset password valid OTP | POST | `/auth/reset-password` | 200 |
| 9 | Reset password expired OTP | POST | `/auth/reset-password` | 400 |

#### 2. Profile (`tests/profile.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Create profile | POST | `/profile` | 201 |
| 2 | Get profile by token | GET | `/profile/token` | 200 + profile |
| 3 | Update profile | PUT | `/profile` | 200 |
| 4 | List all profiles | GET | `/profile` | 200 + array |
| 5 | Upload QRIS | POST | `/profile/qris` | 201 |
| 6 | Get QRIS | GET | `/profile/qris` | 200 |
| 7 | Edit QRIS | PUT | `/profile/qris` | 200 |
| 8 | Delete QRIS | DELETE | `/profile/qris` | 200 |
| 9 | Akses tanpa token | GET | `/profile/token` | 401 |

#### 3. Friends (`tests/friends.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Search user by username | GET | `/friends/search?q=xxx` | 200 |
| 2 | Add friend | POST | `/friends/add` | 201 |
| 3 | Add duplicate friend | POST | `/friends/add` | 400 |
| 4 | Confirm friend request | POST | `/friends/confirm` | 200 |
| 5 | List friends (accepted) | GET | `/friends` | 200 + array |
| 6 | List pending requests | GET | `/friends/pending` | 200 |
| 7 | Unfriend | POST | `/friends/unfriend` | 200 |

#### 4. Group (`tests/group.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Create group | POST | `/group` | 201 |
| 2 | Invite user to group | POST | `/group/:id/invite` | 201 |
| 3 | Invite non-owner | POST | `/group/:id/invite` | 403 |
| 4 | Get user invites | GET | `/group/invites` | 200 |
| 5 | Accept invite | PUT | `/group/:id/respond` | 200 |
| 6 | Reject invite | PUT | `/group/:id/respond` | 200 |

#### 5. Nota (`tests/nota.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Create nota with items | POST | `/api/v1/nota` | 201 + items |
| 2 | Get nota by ID | GET | `/api/v1/nota/:id` | 200 |
| 3 | Get nota not found | GET | `/api/v1/nota/99999` | 404 |
| 4 | Scan receipt (no file) | POST | `/api/v1/nota/scan` | 400 |
| 5 | Scan receipt (wrong format) | POST | `/api/v1/nota/scan` | 400 |
| 6 | Scan receipt (valid image, mock OCR) | POST | `/api/v1/nota/scan` | 200 + OCR data |

#### 6. Notifikasi (`tests/notifikasi.test.ts`)

| # | Test Case | Method | Endpoint | Expected |
|---|---|---|---|---|
| 1 | Create notifikasi | POST | `/api/v1/notifikasi` | 201 |
| 2 | List all notifikasi | GET | `/api/v1/notifikasi` | 200 |
| 3 | Get by ID | GET | `/api/v1/notifikasi/:id` | 200 |
| 4 | Update notifikasi | PATCH | `/api/v1/notifikasi/:id` | 200 |
| 5 | Delete notifikasi | DELETE | `/api/v1/notifikasi/:id` | 200 |
| 6 | Get not found | GET | `/api/v1/notifikasi/99999` | 404 |
| 7 | Akses tanpa token | GET | `/api/v1/notifikasi` | 401 |

### C. Mock Strategy

| Dependency | Mock? | Cara |
|---|---|---|
| Prisma (DB) | **No** — pakai test DB asli | `DATABASE_URL` pointing ke `yupay_test_db` |
| `nodemailer` (email) | **Yes** — mock `sendMail` | `jest.mock('nodemailer')` |
| `axios` (OCR call) | **Yes** — mock POST ke Python | `jest.mock('axios')` |
| `passport-google` | **Skip** | Google OAuth test manual saja |

## Langkah Pengerjaan

1. Buat `yupay_test_db` di MySQL: `CREATE DATABASE yupay_test_db;`
2. Buat `.env.test` — copy `.env`, ganti `DATABASE_URL` ke test DB
3. Install devDeps: `npm i -D ts-jest @types/jest @types/supertest`
4. Buat `jest.config.ts`
5. Tambah scripts di `package.json`:
   ```json
   "test": "dotenv -e .env.test -- jest --runInBand --forceExit",
   "test:watch": "dotenv -e .env.test -- jest --watch --runInBand",
   "test:coverage": "dotenv -e .env.test -- jest --coverage --runInBand --forceExit"
   ```
6. Buat `tests/setup.ts` — prisma migrate reset sebelum semua test
7. Buat helper files
8. Tulis test cases per module
9. Run `npm test` — semua harus pass

## Validasi

```bash
npm test                # semua test pass
npm run test:coverage   # coverage report
```

Target minimum: **80% line coverage** untuk semua module (kecuali Google OAuth).

## Dependensi

- Issue #04 harus selesai (model Notifikasi ada)
- Issue #05 harus selesai (semua route mounted)
- MySQL harus jalan

## Label

`testing`, `jest`, `supertest`, `backend`
