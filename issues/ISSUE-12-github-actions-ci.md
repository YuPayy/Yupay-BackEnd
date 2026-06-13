# ISSUE #12 — Setup CI/CD Pipeline dengan GitHub Actions

**Fase**: 5 (Testing)
**Prioritas**: High
**Status**: Open
**File terkait**: `.github/workflows/`, `package.json`, `requirements.txt`

---

## Deskripsi

Tidak ada CI/CD pipeline. Setiap push/merge ke `main` tidak divalidasi otomatis. Perlu GitHub Actions yang menjalankan:
1. **Lint + Type Check** (TypeScript compile)
2. **Backend Unit/Integration Tests** (Jest + Supertest)
3. **OCR Unit Tests** (pytest)
4. **E2E Tests** (Newman) — optional, heavier
5. **Build check** (tsc compile)

## Pipeline Design

```
push/PR → main
  │
  ├── Job 1: backend-check (Node.js)
  │   ├── npm ci
  │   ├── npx tsc --noEmit              (type check)
  │   ├── npx prisma generate           (prisma client)
  │   ├── npx prisma migrate deploy     (test DB)
  │   └── npm test                      (jest + supertest)
  │
  ├── Job 2: ocr-check (Python)
  │   ├── pip install -r requirements.txt
  │   ├── pip install pytest pytest-asyncio
  │   └── pytest tests/ -v
  │
  └── Job 3: e2e (optional, manual trigger)
      ├── Start Backend server
      ├── Start OCR server
      └── npm run test:e2e (newman)
```

## Workflow File

### `.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: "20"
  PYTHON_VERSION: "3.12"

jobs:
  # ─────────────────────────────────────
  # Job 1: Backend (Node.js + TypeScript)
  # ─────────────────────────────────────
  backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpass
          MYSQL_DATABASE: yupay_test_db
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -ptestpass"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      DATABASE_URL: "mysql://root:testpass@127.0.0.1:3306/yupay_test_db"
      JWT_SECRET: "ci-test-secret"
      NODE_ENV: "test"
      GOOGLE_CLIENT_ID: "placeholder"
      GOOGLE_CLIENT_SECRET: "placeholder"
      PYTHON_OCR_URL: "http://localhost:5057/ocr"

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npx prisma generate

      - name: Run migrations
        run: npx prisma migrate deploy

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Run tests
        run: npm test -- --forceExit --coverage

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-coverage
          path: coverage/

  # ─────────────────────────────────────
  # Job 2: OCR Service (Python)
  # ─────────────────────────────────────
  ocr:
    name: OCR Tests
    runs-on: ubuntu-latest

    env:
      SYNC_CALLBACK_ENABLED: "false"
      TS_BACKEND_URL: "http://localhost:3000/api/v1/nota"
      INTERNAL_AUTH_TOKEN: "ci-test-token"

    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: pip

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio httpx

      - name: Run tests
        run: pytest tests/ -v --tb=short

      - name: Run tests with coverage
        run: |
          pip install pytest-cov
          pytest tests/ --cov=app --cov-report=term-missing --cov-report=xml

      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: ocr-coverage
          path: coverage.xml

  # ─────────────────────────────────────
  # Job 3: E2E (manual trigger only)
  # ─────────────────────────────────────
  e2e:
    name: E2E Tests
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'
    needs: [backend, ocr]

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: testpass
          MYSQL_DATABASE: yupay_e2e_db
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -ptestpass"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5

    env:
      DATABASE_URL: "mysql://root:testpass@127.0.0.1:3306/yupay_e2e_db"
      JWT_SECRET: "ci-e2e-secret"
      NODE_ENV: "test"
      GOOGLE_CLIENT_ID: "placeholder"
      GOOGLE_CLIENT_SECRET: "placeholder"
      PYTHON_OCR_URL: "http://localhost:5057/ocr"
      SYNC_CALLBACK_ENABLED: "false"

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Setup database
        run: |
          npx prisma generate
          npx prisma migrate deploy

      - name: Start server
        run: |
          npx ts-node-dev --transpile-only backend_app/server.ts &
          sleep 10
          curl -f http://localhost:3000/ || exit 1

      - name: Run E2E tests
        run: npm run test:e2e:ci

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: e2e-report
          path: reports/
```

## Tambahan: `workflow_dispatch` untuk E2E manual

Tambahkan di `on:` block:

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      run_e2e:
        description: "Run E2E tests?"
        required: false
        default: "false"
```

## Badge (opsional)

Setelah CI jalan, tambahkan badge di root README:

```markdown
![CI](https://github.com/YuPayy/Yupay-BackEnd/actions/workflows/ci.yml/badge.svg)
```

## Secrets yang Perlu di-set di GitHub

| Secret | Nilai | Lokasi |
|---|---|---|
| Tidak ada | CI pakai env placeholder | Semua ada di workflow file |

Tidak perlu set GitHub Secrets karena semua env pakai placeholder/mock. Tapi kalau nanti mau deploy ke production, perlu:
- `DATABASE_URL` (production)
- `JWT_SECRET` (production)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (production)

## Langkah Pengerjaan

1. Buat folder `.github/workflows/`
2. Buat file `ci.yml` sesuai template di atas
3. Push ke GitHub
4. Cek tab **Actions** di https://github.com/YuPayy/Yupay-BackEnd/actions
5. Pastikan Job 1 (backend) dan Job 2 (ocr) pass
6. Job 3 (e2e) manual trigger via workflow_dispatch

## Validasi

- Push ke `main` → GitHub Actions auto-run
- PR ke `main` → check required
- Badge hijau di README

## Dependensi

- Issue #09 harus selesai (Jest tests exist)
- Issue #10 harus selesai (pytest tests exist)
- Issue #11 harus selesai (Newman collection + test scripts)

## Urutan Pengerjaan Ideal

```
Issue #09 (Jest) ──┐
                   ├──→ Issue #12 (CI) ──→ Push & verify
Issue #10 (pytest) ┘
Issue #11 (Newman) ──→ Job 3 e2e (setelah CI dasar jalan)
```

## Label

`ci`, `github-actions`, `devops`, `automation`
