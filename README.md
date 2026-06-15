# Yupay Backend

> Backend service untuk **Yupay** — aplikasi patungan (split bill) untuk pembayaran grup berbahasa Indonesia.
> Nama "Yupay" berasal dari _"(a)yuh pay"_ — ajakan informal "ayo bayar."

Yupay membantu sekelompok teman membagi satu struk/nota pembayaran secara proporsional: mulai dari scan struk via OCR, klaim item, hitung split (termasuk pajak & service charge), hingga verifikasi bukti transfer.

---

## Daftar Isi

- [Fitur Utama](#fitur-utama)
- [Arsitektur](#arsitektur)
- [Tech Stack](#tech-stack)
- [Struktur Proyek](#struktur-proyek)
- [Skema Database](#skema-database)
- [API Endpoints](#api-endpoints)
- [Alur Autentikasi](#alur-autentikasi)
- [Environment Variables](#environment-variables)
- [Instalasi & Menjalankan](#instalasi--menjalankan)
- [Pengujian](#pengujian)
- [CI/CD](#cicd)
- [Dokumentasi API](#dokumentasi-api)
- [Catatan Pengembangan](#catatan-pengembangan)

---

## Fitur Utama

- **Autentikasi** — Register/Login email+password, Google OAuth 2.0, OTP reset password via email
- **Manajemen Nota** — Buat nota manual, atau scan struk foto via OCR
- **OCR Service** — Microservice Python (FastAPI + EasyOCR) ekstrak teks struk & total bayar
- **Sistem Teman** — Kirim/terima permintaan pertemanan, list teman
- **Grup Patungan** — Undang teman ke nota, bagi nota jadi beberapa peserta
- **Klaim Item** — Setiap peserta klaim item yang dia konsumsi, hitung split proporsional
- **Pembayaran** — Upload bukti transfer, payer verifikasi (confirm/reject)
- **QRIS** — Simpan QRIS code di profil untuk terima pembayaran
- **Notifikasi** — In-app notification (in-memory store)

---

## Arsitektur

```
┌─────────────┐       HTTP/JSON       ┌──────────────────────┐
│  Frontend   │ ────────────────────▶ │  Express Backend     │
│  (Web/Mobile)│ ◀────────────────── │  (TypeScript, :3000) │
└─────────────┘                      └──────────┬───────────┘
                                                │
                                ┌───────────────┼───────────────┐
                                │               │               │
                                ▼               ▼               ▼
                         ┌──────────┐    ┌──────────┐    ┌──────────────┐
                         │  MySQL   │    │  Python  │    │ Google OAuth │
                         │  (Prisma)│    │  OCR     │    │  + Gmail SMTP│
                         │  :3306   │    │ FastAPI  │    └──────────────┘
                         └──────────┘    │  :5057   │
                                        └────┬─────┘
                                             │ sync callback
                                             ▼
                                     (back to Express)
```

**Komunikasi kunci:**
- Frontend → Express API (HTTP REST)
- Express → Python OCR (multipart upload via `axios`)
- Python OCR → Express (sync callback via `httpx` dengan `INTERNAL_AUTH_TOKEN`)

---

## Tech Stack

### Backend (Node.js / TypeScript)

| Layer        | Teknologi                                                   |
| ------------ | ----------------------------------------------------------- |
| Runtime      | Node.js 20                                                  |
| Language     | TypeScript 5.9 (strict mode)                                |
| Framework    | Express 5.1                                                 |
| ORM          | Prisma 6.16                                                 |
| Database     | MySQL 8.0                                                   |
| Auth         | JWT (`jsonwebtoken`) + Passport.js (`passport-google-oauth20`) |
| Validasi     | Zod 4.1                                                     |
| Hashing      | bcrypt 6.0                                                  |
| Upload File  | Multer 2.1 (disk & memory)                                  |
| HTTP Client  | Axios 1.17 (ke OCR service)                                 |
| Email        | Nodemailer 7.0 (Gmail SMTP)                                 |
| API Docs     | Swagger (OpenAPI 3.0.3)                                     |
| Security     | Helmet 8.1, CORS                                            |
| Logging      | Morgan 1.10 + Chalk 5.6                                     |
| Date         | date-fns 4.1                                                |

### OCR Microservice (Python)

| Layer        | Teknologi                                  |
| ------------ | ------------------------------------------ |
| Runtime      | Python 3.12                                |
| Framework    | FastAPI + Uvicorn                          |
| OCR Engine   | EasyOCR (Indonesian + English)             |
| Imaging      | OpenCV (headless) + NumPy                  |
| ML Backend   | PyTorch + torchvision                      |
| HTTP Client  | httpx (async callback ke TS backend)       |
| Env Config   | python-dotenv                              |

### Testing & DevOps

| Layer        | Teknologi                                                   |
| ------------ | ----------------------------------------------------------- |
| Unit/Int (TS)| Jest 30 + ts-jest + supertest                               |
| E2E (TS)     | Newman (Postman CLI) + newman-reporter-htmlextra            |
| Unit/Int (Py)| pytest 8 + pytest-asyncio + pytest-cov + httpx              |
| CI/CD        | GitHub Actions (`.github/workflows/ci.yml`)                 |

---

## Struktur Proyek

```
Yupay-Backend/
├── backend_app/                  # Express entry point
│   ├── app.ts                    # Inisialisasi Express, middleware, mounting route
│   ├── server.ts                 # Listen PORT, log chalk
│   └── swagger.ts                # Konfigurasi Swagger/OpenAPI
│
├── src/
│   ├── modules/
│   │   ├── auth/                 # Autentikasi (email+password, Google, OTP)
│   │   ├── profile/              # Profil user & QRIS
│   │   ├── friends/              # Sistem pertemanan
│   │   ├── group_pembayaran/     # Grup patungan (undangan)
│   │   ├── nota/                 # Nota/struk + integrasi OCR
│   │   ├── klaim/                # Klaim item per peserta + hitung split
│   │   ├── payment/              # Pembayaran + upload bukti
│   │   └── notifikasi/           # Notifikasi in-app
│   │
│   └── utils/
│       └── upload.ts             # Konfigurasi multer disk storage
│
├── app/                          # Python OCR microservice
│   ├── __init__.py
│   ├── main.py                   # FastAPI runner
│   ├── routes.py                 # POST /ocr endpoint
│   └── ocr.py                    # EasyOCR wrapper + regex ekstrak total
│
├── prisma/
│   ├── schema.prisma             # Skema DB (11 model)
│   └── migrations/               # 6 migration files
│
├── tests/                        # Jest tests (TypeScript)
│   ├── setup.ts                  # DB cleaner (reverse-dep deleteMany)
│   ├── auth.test.ts
│   ├── profile.test.ts
│   ├── friends.test.ts
│   ├── group.test.ts
│   ├── nota.test.ts
│   ├── klaim.test.ts
│   ├── payment.test.ts
│   ├── notifikasi.test.ts
│   └── helpers/
│       ├── app.helper.ts
│       └── auth.helper.ts
│
├── tests_py/                     # pytest tests (Python)
│   ├── conftest.py
│   ├── test_api.py               # Integration test POST /ocr
│   ├── test_ocr_unit.py          # Unit test extract_total_from_text
│   └── fixtures/                 # Gambar contoh (jpg, png, webp, txt, 16MB)
│
├── postman/                      # Postman collection & env
├── scripts/                      # clean-db, generate-postman, inject-tests
├── docs/                         # API.md
│
├── .github/workflows/ci.yml      # CI: backend, ocr, e2e jobs
├── uploads/payments/             # Penyimpanan bukti transfer
│
├── package.json
├── tsconfig.json
├── jest.config.js
├── pytest.ini
├── requirements.txt
├── requirements-dev.txt
├── .env.example                  # Template env untuk Python OCR
└── .env.test                     # Env untuk testing
```

---

## Skema Database

Database: **MySQL 8.0**, diakses via **Prisma ORM** (`mysql2` driver).

### Entity Relationship

```
User ─────┬── (1:1) Profile
          │
          ├── (1:N) Nota ────────────┬── (1:N) Item
          │                          │
          ├── (1:N) Friendship ──────┤  (FK user_id + friend_id → User)
          │                          │
          ├── (1:N) SplitParticipant ┬── (1:N) KlaimItem ──→ Item
          │                          │
          ├── (1:N) Payment ─────────┤  (FK from_user_id, to_user_id → User)
          │                          │
          ├── (1:N) Otp              │
          │                          │
          └── (1:N) Notifikasi       │
```

### Tabel

| Model              | Kunci / Field Penting                                                                              | Catatan                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **User**           | `user_id` (PK), `username` (uniq), `email` (uniq), `passwordHash`, `qrisCode` (nullable)           | Entity pusat                                  |
| **Profile**        | `id` (PK), `userId` (FK uniq), `username`, `name`, `image`                                         | Dipisah dari User (auth)                     |
| **Friendship**     | `friendship_id`, `user_id`, `friend_id`, `status` (PENDING/ACCEPTED/REJECTED)                      | Bidireksional; unique composite key           |
| **Nota**           | `nota_id`, `payer_id` (FK), `tanggalTransaksi`, `totalHarga`, `status` (open/closed/paid)          | "Struk" / tagihan grup                        |
| **Item**           | `item_id`, `nota_id` (FK), `namaItem`, `quantity`, `harga`                                        | Item baris pada nota                          |
| **SplitParticipant** | `participant_id`, `nota_id` (FK), `user_id` (FK), `statusKlaim` (pending/active/dll)              | Peserta split                                 |
| **KlaimItem**      | `klaim_id`, `item_id` (FK), `participant_id` (FK), `quantity`                                      | Klaim item per peserta                        |
| **Payment**        | `payment_id`, `nota_id`, `from_user_id`, `to_user_id`, `amount`, `status` (pending/confirmed/rejected), `proofUrl` | Pembayaran + path bukti                       |
| **Otp**            | `otp_id`, `user_id`, `kodeOtp`, `expiredAt`, `status` (active/used)                                | OTP 6 digit, expired 5 menit                  |
| **Notifikasi**     | `id`, `userId` (FK, CASCADE), `title`, `message`, `isRead`                                         | Index pada `userId`                           |

---

## API Endpoints

Base URL backend: `http://localhost:3000`
Base URL OCR service: `http://localhost:5057`

### 1. Auth — `/auth` (publik)

| Method | Path                    | Deskripsi                                                        |
| ------ | ----------------------- | ---------------------------------------------------------------- |
| POST   | `/auth/register`        | Daftar user baru (username, email, password, confirmPassword)    |
| POST   | `/auth/login`           | Login dengan email/username + password → JWT + profile           |
| POST   | `/auth/forgot-password` | Kirim OTP ke email untuk reset password                          |
| POST   | `/auth/reset-password`  | Reset password dengan email + OTP + newPassword                   |
| GET    | `/auth/google`          | Inisiasi Google OAuth (redirect ke Google)                       |
| GET    | `/auth/google/callback` | Callback Google OAuth → redirect ke frontend dengan JWT di query |

### 2. Profile — `/profile` (auth required)

| Method | Path             | Deskripsi                                                 |
| ------ | ---------------- | --------------------------------------------------------- |
| GET    | `/profile/token` | Profil user yang sedang login (dari JWT)                  |
| GET    | `/profile`       | List semua profil                                         |
| POST   | `/profile`       | Buat profil user saat ini (atau auto-update bila ada)     |
| PUT    | `/profile`       | Update profil (name, image)                               |
| GET    | `/profile/qris`  | Ambil QRIS code user saat ini                             |
| POST   | `/profile/qris`  | Upload QRIS baru                                          |
| PUT    | `/profile/qris`  | Edit QRIS yang ada                                        |
| DELETE | `/profile/qris`  | Hapus QRIS (set ke null)                                  |

### 3. Friends — `/friends` (auth required)

| Method | Path                                                       | Deskripsi                                       |
| ------ | ---------------------------------------------------------- | ----------------------------------------------- |
| GET    | `/friends/search?q=&userId=&username=&email=`              | Cari user                                       |
| POST   | `/friends/add`                                             | Kirim friend request (`targetUserId`)           |
| POST   | `/friends/confirm`                                         | Terima/tolak friend request (`friendId`, `status`) |
| POST   | `/friends/unfriend`                                        | Hapus pertemanan (`targetUserId`)               |
| GET    | `/friends`                                                 | List teman yang sudah ACCEPTED                  |
| GET    | `/friends/pending`                                         | List permintaan masuk yang PENDING              |

### 4. Group — `/group` (auth required)

| Method | Path                              | Deskripsi                                          |
| ------ | --------------------------------- | -------------------------------------------------- |
| POST   | `/group`                          | Buat grup (auto-buat Nota dengan title/description) |
| POST   | `/group/:groupId/invite`          | Undang teman ke grup (owner only, body: `friendId`) |
| GET    | `/group/invites`                  | List undangan grup yang masuk untuk user saat ini  |
| PUT    | `/group/:groupId/respond`         | Terima/tolak undangan (body: `status`)             |

### 5. Nota — `/api/v1/nota`

| Method | Path                  | Auth | Deskripsi                                                            |
| ------ | --------------------- | ---- | -------------------------------------------------------------------- |
| POST   | `/api/v1/nota`        | ❌   | Buat nota manual (`payer_id`, `tanggalTransaksi`, `totalHarga`, `items[]`) |
| GET    | `/api/v1/nota/:id`    | ❌   | Ambil detail nota + items + info payer                                |
| POST   | `/api/v1/nota/scan`   | ❌   | Upload gambar struk (multipart `image`) → forward ke OCR service     |

### 6. Klaim — `/api/v1/klaim` (auth required)

| Method | Path                                              | Deskripsi                                                              |
| ------ | ------------------------------------------------- | ---------------------------------------------------------------------- |
| POST   | `/api/v1/klaim/nota/:notaId/join`                 | Join nota sebagai peserta                                               |
| PUT    | `/api/v1/klaim/claims`                            | Upsert klaim item (replace semua klaim peserta; body: `participantId`, `items[]`) |
| GET    | `/api/v1/klaim/claims/:participantId`             | Ambil semua klaim milik peserta                                        |
| GET    | `/api/v1/klaim/nota/:notaId/split`                | Hitung hasil split proporsional per peserta                             |

### 7. Payment — `/api/v1/payment` (auth required)

| Method | Path                                  | Deskripsi                                                                                       |
| ------ | ------------------------------------- | ----------------------------------------------------------------------------------------------- |
| POST   | `/api/v1/payment`                     | Buat payment + upload bukti (multipart: `notaId`, `amount`, `proof` file)                       |
| GET    | `/api/v1/payment/nota/:notaId`        | List semua payment untuk nota tertentu                                                          |
| PATCH  | `/api/v1/payment/:paymentId/verify`   | Verifikasi payment (payer only, body: `status` = `confirmed` \| `rejected`)                     |

### 8. Notifikasi — `/api/v1/notifikasi` (auth required)

| Method | Path                            | Deskripsi                                  |
| ------ | ------------------------------- | ------------------------------------------ |
| GET    | `/api/v1/notifikasi`            | List semua notifikasi user                 |
| GET    | `/api/v1/notifikasi/:id`        | Ambil notifikasi by ID                     |
| POST   | `/api/v1/notifikasi`            | Buat notifikasi baru                       |
| PATCH  | `/api/v1/notifikasi/:id`        | Update notifikasi (partial)                |
| DELETE | `/api/v1/notifikasi/:id`        | Hapus notifikasi                           |

### 9. OCR Service — Python FastAPI (port 5057)

| Method | Path     | Deskripsi                                                                                  |
| ------ | -------- | ------------------------------------------------------------------------------------------ |
| GET    | `/`      | Health check (`{service, status, ts_backend_url, auth_configured}`)                        |
| POST   | `/ocr`   | Upload image (multipart `image`) → EasyOCR → ekstrak total → optional sync callback ke TS   |

### 10. Lain-lain

| Method | Path             | Deskripsi                                            |
| ------ | ---------------- | ---------------------------------------------------- |
| GET    | `/`              | HTML landing page (link ke Swagger)                  |
| GET    | `/api/docs`      | Swagger UI                                           |
| GET    | `/api/docs.json` | Raw OpenAPI 3.0.3 JSON spec                          |
| Serve  | `/uploads/*`     | Static file untuk bukti pembayaran yang diupload     |

---

## Alur Autentikasi

### Email + Password

```
[Register]   Zod validate → bcrypt hash → INSERT User
[Login]      identifier (email/username) + password
             → bcrypt compare
             → jwt.sign({userId, username, email}, JWT_SECRET, {expiresIn: '7d'})
             → return {token, profile}
[Middleware] Bearer token → jwt.verify → req.user = decoded payload
```

### Google OAuth

```
GET /auth/google
  → Passport GoogleStrategy (scope: profile, email)
  → user consent di Google
  → GET /auth/google/callback
  → findOrCreateGoogleUser()
      • cari user by email
      • kalau belum ada → INSERT User (username = displayName + last4 google_id, passwordHash = "GOOGLE_OAUTH")
  → sign JWT
  → redirect FE: http://localhost:3001/pages/home?token=...
```

### Reset Password

```
POST /auth/forgot-password  → cari user by email → generate OTP 6 digit
                            → INSERT Otp (expiredAt = now+5min)
                            → kirim via Nodemailer (Gmail SMTP)

POST /auth/reset-password   → validasi email + OTP
                            → cek expiredAt > now
                            → bcrypt hash password baru
                            → UPDATE Otp.status = 'used'

# Mode test (NODE_ENV=test): OTP "123456" selalu valid
```

---

## Environment Variables

### `.env.example` (Python OCR)

| Variable               | Default                                            | Deskripsi                                |
| ---------------------- | -------------------------------------------------- | ---------------------------------------- |
| `TS_BACKEND_URL`       | `http://localhost:3000/api/v1/nota`                | URL callback OCR ke backend              |
| `INTERNAL_AUTH_TOKEN`  | `replace_me_with_secure_random_string`             | Bearer token untuk auth callback         |
| `OCR_HOST`             | `0.0.0.0`                                          | Bind address FastAPI                     |
| `OCR_PORT`             | `5057`                                             | Port FastAPI                             |

### `.env.test` (Backend test)

| Variable               | Value                                                    | Deskripsi                          |
| ---------------------- | -------------------------------------------------------- | ---------------------------------- |
| `PORT`                 | `3000`                                                   | Port Express                       |
| `NODE_ENV`             | `test`                                                   | Mode environment                   |
| `DATABASE_URL`         | `mysql://root:@127.0.0.1:3306/yupay_test_db`             | Koneksi MySQL                      |
| `JWT_SECRET`           | `test-jwt-secret-key`                                    | Secret JWT                         |
| `GOOGLE_CLIENT_ID`     | `test-placeholder`                                       | Google OAuth client ID             |
| `GOOGLE_CLIENT_SECRET` | `test-placeholder`                                       | Google OAuth secret                |
| `PYTHON_OCR_URL`       | `http://localhost:5057/ocr`                              | Endpoint OCR                       |
| `EMAIL_USER`           | `test@test.com`                                          | SMTP user (mock di test)           |
| `EMAIL_PASS`           | `testpass`                                               | SMTP password (mock di test)       |

### Variabel tambahan (digunakan di source)

| Variable                | Lokasi                       | Default  | Deskripsi                              |
| ----------------------- | ---------------------------- | -------- | -------------------------------------- |
| `COOKIE_KEY`            | `auth.route.ts`              | `yupaycookie` | Passport cookie session          |
| `OCR_TIMEOUT_MS`        | `ocr.service.ts`             | `30000`  | Axios timeout OCR                      |
| `SYNC_CALLBACK_ENABLED` | `app/routes.py`              | `true`   | Toggle sync callback OCR→TS            |
| `CALLBACK_TIMEOUT_S`    | `app/routes.py`              | `10`     | httpx timeout callback                 |
| `LOG_LEVEL`             | `app/routes.py`              | `INFO`   | Python log level                       |

---

## Instalasi & Menjalankan

### Prasyarat

- **Node.js** 20+
- **Python** 3.12
- **MySQL** 8.0
- **npm** + **pip**

### 1. Clone & Install Dependencies

```bash
git clone <repo-url>
cd Yupay-Backend

# Backend (Node)
npm install

# OCR Service (Python) — pakai virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pip install -r requirements-dev.txt
```

### 2. Setup Database

```bash
# Buat database MySQL
mysql -u root -e "CREATE DATABASE yupay_db;"
mysql -u root -e "CREATE DATABASE yupay_test_db;"
mysql -u root -e "CREATE DATABASE yupay_e2e_db;"

# Generate Prisma client & migrate
npm run prisma:generate
npm run prisma:migrate
```

### 3. Konfigurasi Environment

```bash
# Backend
cp .env.test .env
# edit .env sesuai kredensial lokal (DATABASE_URL, JWT_SECRET, GOOGLE_CLIENT_*, EMAIL_*)

# Python OCR
cp .env.example .env
# edit .env: TS_BACKEND_URL, INTERNAL_AUTH_TOKEN
```

### 4. Jalankan Service

**Terminal 1 — Backend Express:**
```bash
npm run dev
# → http://localhost:3000
```

**Terminal 2 — OCR Service:**
```bash
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 5057
# → http://localhost:5057
```

### 5. Verifikasi

```bash
curl http://localhost:3000/         # HTML landing
curl http://localhost:3000/api/docs  # Swagger UI
curl http://localhost:5057/         # OCR health check
```

---

## Pengujian

### Backend TypeScript (Jest)

```bash
npm test                  # run semua test (.env.test, --runInBand, --forceExit)
npm run test:watch        # watch mode
npm run test:coverage     # dengan coverage report
```

**Coverage:** 8 test suites, 64 tests untuk modul auth, profile, friends, group, nota, klaim, payment, notifikasi.

### OCR Python (pytest)

```bash
source .venv/bin/activate
pytest tests_py/ -v
pytest tests_py/ --cov=app --cov-report=term-missing
```

**Coverage:** 27 tests — unit test untuk `extract_total_from_text` & `preprocess_image`, integration test untuk endpoint `/ocr`.

### End-to-End (Newman)

```bash
npm run test:e2e          # Generate Postman + clean DB + run Newman + HTML report
npm run test:e2e:ci       # CI variant (no HTML, --bail)
```

**Proses `test:e2e`:**
1. Start backend server (background)
2. Fetch OpenAPI spec dari `/api/docs.json`
3. Convert ke Postman Collection
4. Inject test scripts ke collection
5. Clean database
6. Run Newman
7. Generate HTML report di `reports/`

---

## CI/CD

GitHub Actions: `.github/workflows/ci.yml`

**Trigger:** `push` & `pull_request` ke `main`, plus `workflow_dispatch` (manual).

### Job 1: `backend`

1. Spin up **MySQL 8.0** service (DB: `yupay_test_db`)
2. `npm ci` → install dependencies
3. `npx prisma generate` & `npx prisma migrate deploy`
4. `npx tsc --noEmit` → type check
5. `npm test -- --forceExit --coverage`
6. Upload `coverage/` artifact → `backend-coverage`

### Job 2: `ocr`

1. Setup Python 3.12
2. `pip install -r requirements.txt` + dev deps
3. `pytest tests_py/ --cov=app --cov-report=xml`
4. Upload `coverage.xml` → `ocr-coverage`

### Job 3: `e2e` _(manual only, butuh input `run_e2e = "true"`)_

1. Depends on `backend` & `ocr` jobs passing
2. Spin up MySQL (`yupay_e2e_db`)
3. Start backend dengan `ts-node-dev`
4. Run `npm run test:e2e:ci`
5. Upload `reports/` → `e2e-report`

---

## Dokumentasi API

- **Swagger UI** — `http://localhost:3000/api/docs`
- **OpenAPI JSON** — `http://localhost:3000/api/docs.json`
- **Postman** — generate dari OpenAPI via `npm run docs:postman:all`
- **Lihat juga** — [docs/API.md](./docs/API.md)

### Generate Postman Collection

```bash
# Start backend dulu
npm run dev

# Di terminal lain
npm run docs:postman         # generate collection dari OpenAPI
npm run docs:postman:tests   # inject test scripts
npm run docs:postman:all     # keduanya
```

Output file ada di folder `postman/`.

---

## Catatan Pengembangan

- **Notifikasi** saat ini menggunakan **in-memory store** di `notifikasiService`, belum persist ke tabel `Notifikasi` (model Prisma sudah ada). Dalam perjalanan.
- **Tidak ada Docker** — tidak ada `Dockerfile` / `docker-compose.yml` di repo.
- **Tidak ada Redis** — tidak ada caching layer.
- **OCR callback** adalah **sync** (blocking). Production idealnya pakai antrian (queue) untuk decoupling.
- **Pisahkan DB** — `yupay_db` (dev), `yupay_test_db` (Jest), `yupay_e2e_db` (Newman E2E).
- **Module grouping:** `backend_app/` untuk wiring, `src/modules/` untuk business logic per fitur.

---

## Lisensi

UNLICENSED — Internal project.

---

## Kontak

Untuk pertanyaan, hubungi tim Yupay.
