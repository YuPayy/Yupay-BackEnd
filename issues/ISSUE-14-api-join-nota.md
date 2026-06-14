# EPIC 1: Modul Klaim & Split — Issue #14

# API Join Nota (SplitParticipant)

**Epic**: 1 (Klaim & Split)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/klaim/`

---

## Deskripsi

Implementasi endpoint **POST /klaim/nota/:notaId/join** yang memungkinkan user bergabung ke sebuah nota sebagai `SplitParticipant`.

Flow:
1. User mengirim request dengan JWT token (sudah di-verify oleh `authMiddleware`)
2. Validasi apakah nota (`notaId`) ada di database
3. Validasi apakah user sudah join (duplicate check)
4. Buat record `SplitParticipant` dengan `statusKlaim: "active"`
5. Return data participant yang baru dibuat

### Detail

Path: `POST /klaim/nota/:notaId/join`
Middleware: `authMiddleware` (sudah di route mount)
Body: none (userId diambil dari JWT token)
Response sukses (201):
```json
{
    "status": "success",
    "data": {
        "participant_id": 1,
        "nota_id": 5,
        "user_id": 3,
        "statusKlaim": "active"
    }
}
```

## File Terlibat

| File | Action |
|---|---|
| `src/modules/klaim/klaim.service.ts` | Update — implement `joinNota(userId, notaId)` |
| `src/modules/klaim/klaim.controller.ts` | Update — implement `joinNotaHandler` |
| `src/modules/klaim/klaim.route.ts` | Sudah ada di Issue #13 |
| `tests/klaim.test.ts` | Buat — integration test |

## Acceptance Criteria

1. `POST /klaim/nota/:notaId/join` return 201 + data participant
2. Double join ke nota yang sama return 400 "Already joined this nota"
3. Join ke nota yang tidak ada return 404
4. Tanpa JWT token return 401
5. **All related integration tests pass** (Jest)

## Test Cases (Jest)

```typescript
describe("POST /klaim/nota/:notaId/join", () => {
    it("should join a nota successfully", async () => {
        const user = await registerAndLogin("join1");
        // Buat nota dulu oleh user lain (payer)
        const notaRes = await createNota(user.user_id);
        const notaId = notaRes.body.data.nota_id;

        const res = await getRequest()
            .post(`/klaim/nota/${notaId}/join`)
            .set(authHeader(user.token));

        expect(res.status).toBe(201);
        expect(res.body.data.nota_id).toBe(notaId);
        expect(res.body.data.user_id).toBe(user.user_id);
    });

    it("should reject double join", async () => { ... });
    it("should reject join to non-existent nota", async () => { ... });
    it("should reject without token (401)", async () => { ... });
});
```

## Dependensi

- Issue #13 (Setup folder & schema) harus selesai
- Issue #05 (Route mounting) harus selesai

## Label

`enhancement`, `klaim`, `api`
