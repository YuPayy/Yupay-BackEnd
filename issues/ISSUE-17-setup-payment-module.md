# EPIC 2: Modul Payment — Issue #17

# Setup Folder & Schema Modul Payment

**Epic**: 2 (Payment)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/payment/payment.schema.ts`, `prisma/schema.prisma`, `backend_app/app.ts`

---

## Deskripsi

Buat struktur dasar folder modul `payment` dengan file Zod schema dan integrasi multer untuk upload bukti transfer ke folder lokal `/uploads/payments/`.

Model Prisma `Payment` sudah ada:

```prisma
model Payment {
  payment_id   Int      @id @default(autoincrement())
  nota_id      Int
  from_user_id Int       // user yang bayar
  to_user_id   Int       // user penerima (payer nota)
  amount       Decimal
  status       String   @default("pending")  // "pending" | "confirmed" | "rejected"
  proofUrl     String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  nota Nota @relation(fields: [nota_id], references: [nota_id])
  from User @relation("PaymentFrom", fields: [from_user_id], references: [user_id])
  to   User @relation("PaymentTo", fields: [to_user_id], references: [user_id])
}
```

## Langkah Pengerjaan

### 1. Buat direktori `uploads/payments/`

Folder lokal untuk menyimpan file bukti transfer. Gitignore folder ini.

Tambahkan di `.gitignore`:
```
uploads/payments/*
!uploads/payments/.gitkeep
```

Buat file `.gitkeep` di `uploads/payments/`.

### 2. Buat folder `src/modules/payment/`

```
src/modules/payment/
├── payment.schema.ts
├── payment.service.ts
├── payment.controller.ts
└── payment.route.ts
```

### 3. Isi `payment.schema.ts`

```typescript
import { z } from "zod";

// POST /payment — buat payment + upload bukti
export const createPaymentSchema = z.object({
    body: z.object({
        notaId: z.number(),
        fromUserId: z.number(),
        toUserId: z.number(),
        amount: z.number().positive("Amount harus positif"),
    }),
});

// PATCH /payment/:paymentId/verify — verifikasi payment oleh payer
export const verifyPaymentSchema = z.object({
    params: z.object({
        paymentId: z.coerce.number(),
    }),
    body: z.object({
        status: z.enum(["confirmed", "rejected"]),
    }),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>["body"];
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
```

### 4. Konfigurasi multer

Buat multer config di `payment.service.ts` atau file terpisah `src/utils/upload.ts`:

```typescript
// src/utils/upload.ts
import multer from "multer";
import path from "path";

const storage = multer.diskStorage({
    destination: path.join(process.cwd(), "uploads/payments"),
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `payment-${uniqueSuffix}${ext}`);
    },
});

export const uploadPaymentProof = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error("Format tidak didukung. Gunakan jpg, png, atau pdf"));
        }
    },
});
```

### 5. Mount di `backend_app/app.ts`

```typescript
import paymentRoutes from "../src/modules/payment/payment.route";

app.use("/payment", authMiddleware, paymentRoutes);
```

### 6. Route skeleton

```typescript
// payment.route.ts
import { Router } from "express";
import * as paymentController from "./payment.controller";
import { uploadPaymentProof } from "../../utils/upload";

const router = Router();

router.post(
    "/",
    uploadPaymentProof.single("proof"),
    paymentController.createPaymentHandler
);
router.get("/nota/:notaId", paymentController.getPaymentsByNotaHandler);
router.patch("/:paymentId/verify", paymentController.verifyPaymentHandler);

export default router;
```

## Validasi

- `npx tsc --noEmit` — tidak ada error TypeScript
- Folder `uploads/payments/` ada dengan `.gitkeep`
- Route `/payment` terdaftar di Express

## Label

`enhancement`, `payment`, `infrastructure`
