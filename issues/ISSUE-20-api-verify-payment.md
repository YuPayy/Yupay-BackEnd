# EPIC 2: Modul Payment — Issue #20

# API Verifikasi Payment

**Epic**: 2 (Payment)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/payment/`

---

## Deskripsi

Implementasi endpoint **PATCH /payment/:paymentId/verify** untuk pemverifikasi (pembuat nota / `payer`) memvalidasi pembayaran.

Flow:
1. User mengirim request dengan `paymentId` di path parameter
2. Validasi: user yang login harus `payer_id` dari nota (hanya pembuat nota yang bisa verifikasi)
3. Validasi: payment harus berstatus `"pending"`
4. Update status payment menjadi `"confirmed"` atau `"rejected"`
5. Jika status menjadi `"confirmed"`, update status seluruh payment nota tersebut: jika semua payment sudah confirmed, update `Nota.status` menjadi `"paid"`
6. Return data payment yang sudah diupdate

### Detail

Path: `PATCH /payment/:paymentId/verify`
Middleware: `authMiddleware`
Body:
```json
{
    "status": "confirmed"
}
```

Response sukses (200):
```json
{
    "status": "success",
    "data": {
        "payment_id": 1,
        "status": "confirmed",
        "updatedAt": "2026-06-14T10:00:00Z"
    }
}
```

### Logic Auto-Update Nota Status

```typescript
// Setelah verifikasi, cek apakah semua payment untuk nota ini sudah confirmed
const allPayments = await tx.payment.findMany({
    where: { nota_id: payment.nota_id },
});

const allConfirmed = allPayments.every(p => p.status === "confirmed");
if (allConfirmed) {
    await tx.nota.update({
        where: { nota_id: payment.nota_id },
        data: { status: "paid" },
    });
}
```

## File Terlibat

| File | Action |
|---|---|
| `src/modules/payment/payment.service.ts` | Update — implement `verifyPayment` & `autoUpdateNotaStatus` |
| `src/modules/payment/payment.controller.ts` | Update — implement `verifyPaymentHandler` |
| `tests/payment.test.ts` | Update — tambah test cases |

## Acceptance Criteria

1. `PATCH /payment/:paymentId/verify` return 200 + payment updated
2. Hanya `payer_id` nota yang bisa verifikasi → 403
3. Payment status selain `"pending"` tidak bisa diverifikasi → 400
4. Jika semua payment confirmed, status nota otomatis jadi `"paid"`
5. Jika ada yang rejected, status nota tetap `"open"` (tidak otomatis paid)
6. **All integration tests pass**

## Test Cases (Jest)

```typescript
describe("PATCH /payment/:paymentId/verify", () => {
    it("should confirm payment and update nota status", async () => {
        const payer = await registerAndLogin("verify1");
        const debtor = await registerAndLogin("verify2");

        // Setup: buat nota, join, create payment
        const nota = await createNota(payer.user_id);
        const notaId = nota.body.data.nota_id;

        await joinNota(debtor, notaId);
        const payRes = await createPayment(debtor, notaId, 50000);
        const paymentId = payRes.body.data.payment_id;

        // Verifikasi oleh payer
        const res = await getRequest()
            .patch(`/payment/${paymentId}/verify`)
            .set(authHeader(payer.token))
            .send({ status: "confirmed" });

        expect(res.status).toBe(200);
        expect(res.body.data.status).toBe("confirmed");

        // Cek nota status auto-update
        const notaRes = await getRequest()
            .get(`/api/v1/nota/${notaId}`);
        expect(notaRes.body.data.status).toBe("paid");
    });

    it("should reject verification by non-payer", async () => { ... });
    it("should reject verification of already confirmed payment", async () => { ... });
    it("should reject invalid status value", async () => { ... });
});
```

## Dependensi

- Issue #19 (Create Payment) harus selesai
- Issue #17-18 (Setup + Multer) harus selesai

## Catatan

- Fitur ini hanya memverifikasi payment individual. Jika payment sudah confirmed, tidak bisa diubah lagi
- Auto-update nota status ke `"paid"` terjadi ketika SEMUA payment untuk nota tersebut sudah confirmed

## Label

`enhancement`, `payment`, `verification`, `api`
