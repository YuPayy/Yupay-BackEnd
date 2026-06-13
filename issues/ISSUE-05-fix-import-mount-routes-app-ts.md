# ISSUE #05 — Fix Import & Mount `notaRoutes` + `notifikasiRouter` di `app.ts`

**Fase**: 3 (Routing)
**Prioritas**: High
**Status**: Open
**File terkait**: `Backend/app/app.ts`, `Backend/src/modules/nota/nota.route.ts`, `Backend/src/modules/notifikasi/notifikasi.routes.ts`

---

## Deskripsi

Dua masalah routing di `app.ts`:

### Bug 1: `notaRoutes` dipakai tapi tidak di-import

```typescript
// Backend/app/app.ts — baris 45
app.use("/api/v1/nota", notaRoutes);  // <-- ReferenceError: notaRoutes is not defined
```

Tidak ada import statement untuk `notaRoutes`. Server akan crash saat startup.

### Bug 2: `notifikasiRouter` tidak di-mount

File `notifikasi.routes.ts` ada dan punya endpoint, tapi **tidak pernah digunakan** di `app.ts`. Endpoint notifikasi tidak bisa diakses.

## Solusi

Tambahkan import dan mount di `app.ts`:

```typescript
// Tambahkan di bagian import (setelah baris 7)
import notaRoutes from "../src/modules/nota/nota.route";
import notifikasiRoutes from "../src/modules/notifikasi/notifikasi.routes";

// Mount notifikasi (tambahkan setelah baris 45)
app.use("/api/v1/notifikasi", authMiddleware, notifikasiRoutes);
```

## Langkah Pengerjaan

1. Buka `Backend/app/app.ts`
2. Tambahkan import `notaRoutes` dari `../src/modules/nota/nota.route`
3. Tambahkan import `notifikasiRoutes` dari `../src/modules/notifikasi/notifikasi.routes`
4. Baris 45 (`app.use("/api/v1/nota", notaRoutes)`) sudah ada — pastikan berfungsi setelah import ditambahkan
5. Tambahkan `app.use("/api/v1/notifikasi", authMiddleware, notifikasiRoutes)` setelahnya
6. Tes compile: `npx tsc --noEmit`

## Validasi

```bash
cd Backend
npx tsc --noEmit
npm run dev
```

Lalu test:
```bash
# Nota endpoint
curl http://localhost:3000/api/v1/nota

# Notifikasi endpoint (perlu JWT token)
curl -H "Authorization: Bearer <token>" http://localhost:3000/api/v1/notifikasi
```

Kedua endpoint harus merespons (bukan 404 / crash).

## Label

`bug`, `routing`, `critical`
