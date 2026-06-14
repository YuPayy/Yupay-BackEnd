# EPIC 1: Modul Klaim & Split — Issue #16

# Algoritma Kalkulasi Split Bill

**Epic**: 1 (Klaim & Split)
**Prioritas**: High
**Status**: Open
**File terkait**: `src/modules/klaim/`

---

## Deskripsi

Implementasi algoritma kalkulasi split bill. Endpoint **GET /klaim/nota/:notaId/split** menghitung:

1. **Subtotal per user**: jumlah dari `item.harga × klaimItem.quantity` untuk setiap participant
2. **Pajak & Service Charge proporsional**: jika nota memiliki sisa (totalHarga - sum subtotal), sisa dibagi proporsional berdasarkan subtotal masing-masing user
3. **Total akhir per user**: subtotal + bagian pajak/service charge

### Rumus Kalkulasi

```
totalHarga = nota.totalHarga (dari database)

subtotal per user = sum(item.harga * klaimItem.quantity) untuk setiap participant

selisih = totalHarga - sum(subtotal semua user)

jika selisih > 0:
    bagian pajak per user = subtotal_user * (selisih / sum(subtotal semua user))

total akhir per user = subtotal_user + bagian_pajak_user
```

### Detail

Path: `GET /klaim/nota/:notaId/split`
Middleware: `authMiddleware`
Response sukses (200):
```json
{
    "status": "success",
    "data": {
        "nota_id": 5,
        "totalHarga": 125000,
        "participants": [
            {
                "user_id": 1,
                "username": "bintang",
                "subtotal": 50000,
                "pajakProporsional": 2083,
                "totalAkhir": 52083,
                "items": [
                    { "namaItem": "Nasi Goreng", "quantity": 2, "harga": 25000 }
                ]
            },
            {
                "user_id": 3,
                "username": "andi",
                "subtotal": 70000,
                "pajakProporsional": 2917,
                "totalAkhir": 72917,
                "items": [
                    { "namaItem": "Es Teh", "quantity": 1, "harga": 5000 },
                    { "namaItem": "Ayam Bakar", "quantity": 1, "harga": 65000 }
                ]
            }
        ]
    }
}
```

## File Terlibat

| File | Action |
|---|---|
| `src/modules/klaim/klaim.service.ts` | Update — implement `getSplitResult(notaId)` |
| `src/modules/klaim/klaim.controller.ts` | Update — implement `getSplitResultHandler` |
| `tests/klaim.test.ts` | Update — tambah test cases |

## Acceptance Criteria

1. `GET /klaim/nota/:notaId/split` return 200 + result semua participant
2. Subtotal per user correct sesuai quantity yang diklaim
3. Pajak proporsional dibagi sesuai rasio subtotal
4. Total akhir = subtotal + pajak
5. Jika tidak ada pajak (sum subtotal == totalHarga), pajak = 0
6. Return 404 jika nota tidak ada
7. **All related integration tests pass**

## Test Cases (Jest)

```typescript
describe("GET /klaim/nota/:notaId/split", () => {
    it("should calculate split correctly with 2 participants", async () => {
        const user1 = await registerAndLogin("split1");
        const user2 = await registerAndLogin("split2");

        // Buat nota dengan 3 item: 25000 + 5000 + 65000 = 125000
        const notaRes = await createNota(user1.user_id, totalHarga: 125000, items: [...]);
        const notaId = notaRes.body.data.nota_id;
        const items = notaRes.body.data.items;

        // User 1 join & klaim item[0] (25000)
        const p1 = await joinAndClaim(user1, notaId, [{itemId: items[0].item_id, qty: 2}]);
        // User 2 join & klaim item[1] (5000) + item[2] (65000)
        const p2 = await joinAndClaim(user2, notaId, [
            {itemId: items[1].item_id, qty: 1},
            {itemId: items[2].item_id, qty: 1}
        ]);

        const res = await getRequest()
            .get(`/klaim/nota/${notaId}/split`)
            .set(authHeader(user1.token));

        expect(res.status).toBe(200);
        const participants = res.body.data.participants;
        expect(participants.length).toBe(2);

        // subtotal = 50000, rasio = 50000/120000 = 0.4167, pajak = (125000-120000) * 0.4167 = 2083
        const p1data = participants.find(p => p.user_id === user1.user_id);
        expect(p1data.subtotal).toBe(50000);
        expect(p1data.pajakProporsional).toBeCloseTo(2083, -1);
        expect(p1data.totalAkhir).toBeCloseTo(52083, -1);
    });

    it("should return 404 if nota not found", async () => { ... });
    it("should handle nota where sum claims = totalHarga", async () => { ... });
});
```

## Dependensi

- Issue #15 (Klaim Item) harus selesai — butuh data `KlaimItem` untuk kalkulasi
- Issue #13 (Setup folder)

## Label

`enhancement`, `klaim`, `algoritma`, `api`
