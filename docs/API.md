# API Documentation

Yupay Backend punya 2 format dokumentasi yang di-generate dari source code yang sama.

## 1. Swagger UI (Interactive)

Jalanin server, lalu buka:

```
http://localhost:3000/api/docs
```

Atau ambil raw OpenAPI JSON:
```
http://localhost:3000/api/docs.json
```

### Cara pakai
1. Klik tombol **"Authorize"** di kanan atas
2. Paste JWT token: `Bearer eyJhbGciOi...`
3. Klik **Authorize** → **Close**
4. Semua endpoint protected sekarang bisa di-"Try it out"

## 2. Postman Collection

### Cara generate

**Opsi A** — otomatis (server harus jalan):
```bash
npm run dev                        # terminal 1
npm run docs:postman               # terminal 2
```

**Opsi B** — manual dari OpenAPI spec:
1. Buka https://www.postman.com/
2. **Import** → **Link**
3. Paste: `http://localhost:3000/api/docs.json`
4. Klik **Import**

### File output
- `postman/Yupay.postman_collection.json` — 28 request, 6 folder (Auth, Profile, Friends, Group, Nota, Notifikasi)
- `postman/Yupay.local.postman_environment.json` — env vars: `base_url`, `auth_token`, `ocr_service_url`

### Import ke Postman
1. **File** → **Import** → **Upload Files**
2. Pilih 2 file di folder `postman/`
3. Pilih environment "Yupay Local" di kanan atas Postman
4. Set `auth_token` setelah login (lihat Test Workflow di bawah)

## Test Workflow (E2E)

1. **Register** → `POST /auth/register` dengan email unik
2. **Login** → `POST /auth/login` → copy `token` dari response
3. Set env `auth_token` = `Bearer <token>` (atau paste raw token lalu edit header)
4. **Get profile** → `GET /profile/token`
5. **Upload QRIS** → `POST /profile/qris`
6. **Add friend** → `POST /friends/add` (cari dulu di `GET /friends/search`)
7. **Confirm friend** → `POST /friends/confirm`
8. **Scan nota** → `POST /api/v1/nota/scan` dengan file gambar
9. **Get notifikasi** → `GET /api/v1/notifikasi`

## File yang terlibat

| File | Fungsi |
|---|---|
| `backend_app/swagger.ts` | OpenAPI config (info, servers, security, schemas) |
| `backend_app/app.ts` | Mount `/api/docs` + `/api/docs.json` |
| `src/modules/**/*.routes.ts` | JSDoc `@openapi` per endpoint |
| `scripts/generate-postman.ts` | Konversi OpenAPI → Postman collection |
| `postman/*.json` | Output (gitignored) |

## Update docs

- **Swagger**: edit JSDoc di route files → restart server
- **Postman**: jalankan `npm run docs:postman` (overwrite collection)

## Catatan

- `postman/` folder di-`.gitignore` — tiap developer generate sendiri
- Swagger UI menggunakan `persistAuthorization: true` — token tidak hilang saat reload
- Filter search di Swagger UI aktif — ketik `nota`, `profile`, dll untuk filter
