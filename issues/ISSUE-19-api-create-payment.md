# EPIC 2: Modul Payment — Issue #19

# API Buat Payment / Upload Bukti

**Epic**: 2 (Payment)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/payment/`

---

## Deskripsi

Implementasi endpoint **POST /payment** untuk membuat record payment dan menyimpan bukti transfer.

Flow lengkap:
1. User upload file bukti transfer (via multer) bersama data payment
2. Simpan file ke `uploads/payments/` (Issue #18)
3. Buat record `Payment` di database dengan:
   - `nota_id` dari request body
   - `from_user_id` = userId dari JWT token
   - `to_user_id` = `payer_id` dari nota (diambil dari database)
   - `amount` dari request body
   - `status` = `"pending"`
   - `proofUrl` = path file yang disimpan
4. Validasi: user harus sudah join nota (SplitParticipant exists)
5. Validasi: user tidak bisa bayar ke diri sendiri (from_user_id != to_user_id)
6. Validasi: amount harus <= total tagihan user (dari split kalkulasi)

### Detail

Path: `POST /payment`
Middleware: `authMiddleware`, `uploadPaymentProof.single("proof")`
Content-Type: `multipart/form-data`

Request body:
| Field | Type | Required |
|---|---|---|
| `notaId` | number | yes |
| `amount` | number | yes |
| `proof` | file (jpg/png/pdf) | yes |

Response sukses (201):
```json
{
    "status": "success",
    "data": {
        "payment_id": 1,
        "nota_id": 5,
        "from_user_id": 3,
        "to_user_id": 1,
        "amount": 50000,
        "status": "pending",
        "proofUrl": "/uploads/payments/payment-1718300000000-123456789.jpg"
    }
}
```

## File Terlibat

| File | Action |
|---|---|
| `src/modules/payment/payment.service.ts` | Update — implement `createPayment` |
| `src/modules/payment/payment.controller.ts` | Update — implement `createPaymentHandler` |
| `src/modules/payment/payment.route.ts` | Update — route POST dengan multer |
| `tests/payment.test.ts` | Buat — integration test |

## Acceptance Criteria

1. `POST /payment` return 201 + data payment
2. File bukti tersimpan di `uploads/payments/`
3. `proofUrl` merujuk ke file yang benar
4. Status otomatis `"pending"`
5. User belum join nota → 403
6. User bayar ke diri sendiri → 400
7. Tanpa file → 400
8. Amount invalid → 400
9. **All integration tests pass**

## Test Cases (Jest)

```typescript
describe("POST /payment", () => {
    it("should create payment with upload", async () => {
        const user1 = await registerAndLogin("pay1");
        const user2 = await registerAndLogin("pay2");

        // Buat nota oleh user1
        const nota = await createNota(user1.user_id);
        const notaId = nota.body.data.nota_id;

        // User2 join nota
        await getRequest()
            .post(`/klaim/nota/${notaId}/join`)
            .set(authHeader(user2.token));

        const res = await getRequest()
            .post("/payment")
            .set(authHeader(user2.token))
            .field("notaId", notaId)
            .field("amount", 50000)
            .attach("proof", Buffer.from("fake-proof"), "bukti.jpg");

        expect(res.status).toBe(201);
        expect(res.body.data.status).toBe("pending");
        expect(res.body.data.from_user_id).toBe(user2.user_id);
        expect(res.body.data.proofUrl).toBeTruthy();
    });

    it("should reject payment to self", async () => { ... });
    it("should reject without file", async () => { ... });
});
```

## Dependensi

- Issue #17 (Setup payment module) harus selesai
- Issue #18 (Multer upload) harus selesai
- Epic 1 Issues #14-16 (Join Nota & Klaim) untuk validasi participant

## Label

`enhancement`, `payment`, `api`
