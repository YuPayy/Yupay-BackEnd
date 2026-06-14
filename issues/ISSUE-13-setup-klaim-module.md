# EPIC 1: Modul Klaim & Split — Issue #13

# Setup Folder & Schema Modul Klaim

**Epic**: 1 (Klaim & Split)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/klaim/klaim.schema.ts`, `prisma/schema.prisma`

---

## Deskripsi

Buat struktur dasar folder modul `klaim` dengan file Zod schema yang akan menjadi fondasi untuk semua fitur split bill.

Saat ini model Prisma (`SplitParticipant`, `KlaimItem`) sudah ada di database. Modul `klaim` perlu dibuat dari nol mengikuti arsitektur proyek: `route → controller → service → schema`.

### Analisis Model Prisma

```prisma
model SplitParticipant {
  participant_id Int      @id @default(autoincrement())
  nota_id        Int
  user_id        Int
  statusKlaim    String   // "pending" | "active"
  createdAt      DateTime @default(now())

  notas  Nota        @relation(fields: [nota_id], references: [nota_id])
  user   User        @relation(fields: [user_id], references: [user_id])
  claims KlaimItem[]
}

model KlaimItem {
  klaim_id       Int      @id @default(autoincrement())
  item_id        Int
  participant_id Int
  quantity       Int       // jumlah item yang diklaim user ini
  createdAt      DateTime @default(now())

  item        Item             @relation(fields: [item_id], references: [item_id])
  participant SplitParticipant @relation(fields: [participant_id], references: [participant_id])
}
```

## Langkah Pengerjaan

### 1. Buat folder `src/modules/klaim/`

```
src/modules/klaim/
├── klaim.schema.ts
├── klaim.service.ts
├── klaim.controller.ts
└── klaim.route.ts
```

### 2. Isi `klaim.schema.ts`

Zod schema untuk input API:

```typescript
import { z } from "zod";

// POST /nota/:notaId/join — user bergabung ke nota
export const joinNotaSchema = z.object({
    params: z.object({
        notaId: z.coerce.number(),
    }),
});

// POST /claims — tambah/update klaim item
export const upsertClaimSchema = z.object({
    body: z.object({
        participantId: z.number(),
        items: z.array(
            z.object({
                itemId: z.number(),
                quantity: z.number().min(1, "Minimal quantity 1"),
            })
        ),
    }),
});

// GET /nota/:notaId/split — hasil kalkulasi split
export const getSplitResultSchema = z.object({
    params: z.object({
        notaId: z.coerce.number(),
    }),
});

export type JoinNotaInput = z.infer<typeof joinNotaSchema>;
export type UpsertClaimInput = z.infer<typeof upsertClaimSchema>["body"];
```

### 3. Buat `klaim.service.ts` — skeleton

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const joinNota = async (userId: number, notaId: number) => {
    // Cek apakah user sudah join
    const existing = await prisma.splitParticipant.findFirst({
        where: { nota_id: notaId, user_id: userId },
    });
    if (existing) throw new Error("Already joined this nota");

    return await prisma.splitParticipant.create({
        data: {
            nota_id: notaId,
            user_id: userId,
            statusKlaim: "active",
        },
    });
};

export const upsertClaims = async (
    participantId: number,
    items: { itemId: number; quantity: number }[]
) => {
    return await prisma.$transaction(async (tx) => {
        // Hapus klaim lama participant ini
        await tx.klaimItem.deleteMany({
            where: { participant_id: participantId },
        });
        // Buat klaim baru
        for (const item of items) {
            await tx.klaimItem.create({
                data: {
                    item_id: item.itemId,
                    participant_id: participantId,
                    quantity: item.quantity,
                },
            });
        }
        return tx.klaimItem.findMany({
            where: { participant_id: participantId },
            include: { item: true },
        });
    });
};
```

### 4. Buat `klaim.controller.ts` dan `klaim.route.ts` — skeleton

Route skeleton dengan placeholder handler:

```typescript
// klaim.route.ts
import { Router } from "express";
import * as klaimController from "./klaim.controller";

const router = Router();

router.post("/nota/:notaId/join", klaimController.joinNotaHandler);
router.get("/claims/:participantId", klaimController.getClaimsHandler);
router.put("/claims", klaimController.upsertClaimsHandler);
router.get("/nota/:notaId/split", klaimController.getSplitResultHandler);

export default router;
```

### 5. Mount di `backend_app/app.ts`

```typescript
import klaimRoutes from "../src/modules/klaim/klaim.route";

app.use("/klaim", authMiddleware, klaimRoutes);
```

## Validasi

- `npx tsc --noEmit` — tidak ada error TypeScript
- `GET /klaim/nota/:notaId/join` → route terdaftar (return error handler karena belum diimplementasi penuh)
- Schema Zod bisa di-import tanpa error

## Label

`enhancement`, `klaim`, `infrastructure`
