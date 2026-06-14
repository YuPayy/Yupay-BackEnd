# EPIC 1: Modul Klaim & Split — Issue #15

# API Klaim Item (Upsert KlaimItem)

**Epic**: 1 (Klaim & Split)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/klaim/`

---

## Deskripsi

Implementasi endpoint **PUT /klaim/claims** untuk menambah/memperbarui klaim item oleh participant.

Flow:
1. User mengirim request body berisi `participantId` dan array `items` (itemId + quantity)
2. Validasi bahwa `participantId` milik user yang sedang login (authorization check)
3. Validasi bahwa setiap `itemId` ada di nota yang sama dengan participant
4. Hapus semua `KlaimItem` lama milik participant ini
5. Buat `KlaimItem` baru sesuai request body
6. Return data klaim yang baru dibuat

### Detail

Path: `PUT /klaim/claims`
Middleware: `authMiddleware`
Body:
```json
{
    "participantId": 1,
    "items": [
        { "itemId": 5, "quantity": 2 },
        { "itemId": 6, "quantity": 1 }
    ]
}
```

Response sukses (200):
```json
{
    "status": "success",
    "data": [
        { "klaim_id": 1, "item_id": 5, "quantity": 2, "item": { ... } },
        { "klaim_id": 2, "item_id": 6, "quantity": 1, "item": { ... } }
    ]
}
```

## File Terlibat

| File | Action |
|---|---|
| `src/modules/klaim/klaim.schema.ts` | Sudah di Issue #13 |
| `src/modules/klaim/klaim.service.ts` | Update — implement `upsertClaims` |
| `src/modules/klaim/klaim.controller.ts` | Update — implement `upsertClaimsHandler` |
| `src/modules/klaim/klaim.route.ts` | Sudah di Issue #13 |
| `tests/klaim.test.ts` | Update — tambah test cases |

## Acceptance Criteria

1. `PUT /klaim/claims` return 200 + array of claims
2. Klaim item yang sudah ada di-overwrite (tidak ada duplikat)
3. Item yang tidak valid (bukan milik nota yang sama) return 400
4. Participant bukan milik user yang login return 403
5. **All related integration tests pass**

## Test Cases (Jest)

```typescript
describe("PUT /klaim/claims", () => {
    it("should create claims successfully", async () => {
        const user = await registerAndLogin("claim1");
        const notaRes = await createNota(user.user_id);
        const notaId = notaRes.body.data.nota_id;
        const items = notaRes.body.data.items;

        // Join nota
        const joinRes = await getRequest()
            .post(`/klaim/nota/${notaId}/join`)
            .set(authHeader(user.token));
        const participantId = joinRes.body.data.participant_id;

        // Klaim item pertama
        const res = await getRequest()
            .put("/klaim/claims")
            .set(authHeader(user.token))
            .send({
                participantId,
                items: [{ itemId: items[0].item_id, quantity: 1 }],
            });

        expect(res.status).toBe(200);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0].item_id).toBe(items[0].item_id);
    });

    it("should overwrite existing claims", async () => { ... });
    it("should reject claims for other user's participant", async () => { ... });
    it("should reject invalid itemId", async () => { ... });
});
```

## Dependensi

- Issue #14 (Join Nota) harus selesai — butuh `SplitParticipant` untuk test
- Issue #13 (Setup folder) harus selesai

## Label

`enhancement`, `klaim`, `api`
