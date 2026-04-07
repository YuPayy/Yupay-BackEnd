import axios from 'axios';

export const ocrService = {
    async scanReceipt(imageBuffer: Buffer) {
        try {
            // 1. Kirim file ke Backend Python (EasyOCR)
            const formData = new FormData();
            const blob = new Blob([imageBuffer]);
            formData.append('image', blob, 'receipt.jpg');

            const pythonResponse = await axios.post('http://localhost:5000/ocr', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            // 2. Olah hasil dari Python (misal Python mengembalikan { items: [...], total: 10000 })
            const { items, total_price } = pythonResponse.data;

            // 3. Format agar siap dimasukkan ke Prisma (MySQL)
            return {
                tanggalTransaksi: new Date(),
                totalHarga: total_price,
                items: items.map((item: any) => ({
                    namaItem: item.name,
                    quantity: item.qty,
                    harga: item.price
                }))
            };
        } catch (error) {
            console.error("Gagal menghubungi Python OCR:", error);
            throw new Error("OCR Processing Failed");
        }
    }
};