# EPIC 2: Modul Payment — Issue #18

# Integrasi Multer & Upload Bukti Transfer

**Epic**: 2 (Payment)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/utils/upload.ts`, `uploads/payments/`, `.gitignore`

---

## Deskripsi

Implementasi upload middleware menggunakan `multer` untuk menyimpan file bukti transfer ke folder lokal `uploads/payments/`.

> **Aturan penyimpanan**: File wajib disimpan secara lokal (LOCAL STORAGE). Tidak ada cloud/object storage.

### Konfigurasi Disk Storage

```typescript
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadDir = path.join(process.cwd(), "uploads/payments");

// Pastikan folder ada
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        const name = `payment-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        cb(null, name);
    },
});

export const uploadPaymentProof = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const allowedMimes = ["image/jpeg", "image/png", "application/pdf"];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Only JPG, PNG, and PDF files are allowed"));
        }
    },
});
```

### File yang Dihasilkan

Nama file: `payment-1718300000000-123456789.jpg`
Lokasi: `uploads/payments/payment-1718300000000-123456789.jpg`

### Path untuk Disimpan di DB

Path yang disimpan di kolom `Payment.proofUrl` adalah relative path:
```
/uploads/payments/payment-1718300000000-123456789.jpg
```

Atau bisa disimpan hanya nama filenya, lalu di controller digabung dengan base URL:
```typescript
const proofUrl = `/uploads/payments/${req.file.filename}`;
```

### Static Serve (Express)

Agar file bisa diakses via browser, tambahkan static serve di `backend_app/app.ts`:

```typescript
import path from "path";

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
```

## File Terlibat

| File | Action |
|---|---|
| `src/utils/upload.ts` | Buat — multer config |
| `src/modules/payment/payment.route.ts` | Update — gunakan `uploadPaymentProof` |
| `backend_app/app.ts` | Update — tambah `express.static` untuk `/uploads` |
| `.gitignore` | Update — ignore `uploads/payments/*` kecuali `.gitkeep` |
| `uploads/payments/.gitkeep` | Buat |

## Acceptance Criteria

1. File bukti transfer tersimpan di `uploads/payments/` dengan nama unik
2. Nama file mengandung timestamp (tidak ada konflik nama)
3. Format file: Hanya JPG, PNG, PDF (max 5MB)
4. Error format return 400
5. File > 5MB return 413
6. File bisa diakses via `GET /uploads/payments/payment-xxx.jpg`
7. **Tidak ada cloud storage** — penyimpanan murni lokal

## Test Cases (Supertest)

```typescript
describe("Upload payment proof", () => {
    it("should upload JPG file successfully", async () => {
        const res = await getRequest()
            .post("/payment")
            .set(authHeader(user.token))
            .field("notaId", 1)
            .field("fromUserId", user.user_id)
            .field("toUserId", 1)
            .field("amount", 50000)
            .attach("proof", Buffer.from("fake-image"), "bukti.jpg");

        expect(res.status).toBe(201);
        expect(res.body.data.proofUrl).toMatch(/^\/uploads\/payments\/payment-/);
    });

    it("should reject file >5MB", async () => { ... });
    it("should reject non-image file", async () => { ... });
});
```

## Dependensi

- Issue #17 (Setup folder payment) harus selesai

## Label

`enhancement`, `payment`, `multer`, `upload`
