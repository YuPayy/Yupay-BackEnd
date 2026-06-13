# ISSUE #04 — Tambah Model Prisma untuk Notifikasi

**Fase**: 2 (Fondasi Database)
**Prioritas**: High
**Status**: Open
**File terkait**: `Backend/prisma/schema.prisma`, `Backend/src/modules/notifikasi/notifikasi.service.ts`

---

## Deskripsi

Module `notifikasi` sudah memiliki file service, controller, routes, dan schema — tapi **tidak ada model Prisma** untuk tabel `Notifikasi`. Saat ini `notifikasi.service.ts` menggunakan **in-memory array** (data hilang saat server restart).

Untuk module `group_pembayaran`: service-nya (`group.service.ts`) sudah menggunakan model `Nota` dan `SplitParticipant` yang sudah ada — jadi **tidak butuh model baru** untuk Group.

## Analisis

### Notifikasi Service (in-memory, perlu Prisma model)

```typescript
// Backend/src/modules/notifikasi/notifikasi.service.ts — baris 6-13
export type Notifikasi = {
  id: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const data: Notifikasi[] = [];  // <-- in-memory, hilang saat restart
```

### Group Service (sudah pakai Prisma, OK)

```typescript
// Backend/src/modules/group_pembayaran/group.service.ts
// Sudah menggunakan prisma.nota dan prisma.splitParticipant
// Tidak perlu model tambahan
```

## Solusi

Tambahkan model `Notifikasi` di `prisma/schema.prisma`:

```prisma
model Notifikasi {
  id        Int      @id @default(autoincrement())
  userId    Int
  title     String
  message   String   @db.Text
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user User @relation(fields: [userId], references: [user_id])
}
```

Dan tambahkan relasi di model `User`:

```prisma
model User {
  // ... field yang sudah ada ...
  notifikasi Notifikasi[]
}
```

Lalu update `notifikasi.service.ts` agar menggunakan Prisma bukan in-memory array.

## Langkah Pengerjaan

1. Buka `Backend/prisma/schema.prisma`
2. Tambahkan model `Notifikasi` dengan relasi ke `User`
3. Tambahkan field `notifikasi Notifikasi[]` di model `User`
4. Jalankan migrasi:
   ```bash
   cd Backend
   npx prisma migrate dev --name add_notifikasi
   ```
5. Jalankan `npx prisma generate`
6. Update `notifikasi.service.ts` — ganti in-memory array dengan PrismaClient

## Validasi

```bash
npx prisma studio
```

Cek tabel `Notifikasi` muncul di browser dengan kolom yang sesuai.

## Label

`enhancement`, `database`, `schema`
