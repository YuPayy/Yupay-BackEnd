import axios from 'axios';
import FormData from 'form-data';

const OCR_URL = process.env.PYTHON_OCR_URL || 'http://localhost:5000/ocr';
const OCR_TIMEOUT_MS = Number(process.env.OCR_TIMEOUT_MS) || 30000;

export const ocrService = {
    async scanReceipt(imageBuffer: Buffer) {
        try {
            const formData = new FormData();
            formData.append('image', imageBuffer, {
                filename: 'receipt.jpg',
                contentType: 'image/jpeg',
            });

            const pythonResponse = await axios.post(OCR_URL, formData, {
                headers: formData.getHeaders(),
                timeout: OCR_TIMEOUT_MS,
                maxBodyLength: 15 * 1024 * 1024,
                maxContentLength: 15 * 1024 * 1024,
            });

            const { items, total_price } = pythonResponse.data;

            return {
                tanggalTransaksi: new Date(),
                totalHarga: total_price,
                items: items.map((item: any) => ({
                    namaItem: item.name,
                    quantity: item.qty,
                    harga: item.price,
                })),
            };
        } catch (error) {
            const detail = axios.isAxiosError(error)
                ? `[${error.code || 'ERR'}] ${error.message}`
                : (error as Error).message;
            console.error(`Gagal menghubungi Python OCR di ${OCR_URL}:`, detail);
            throw new Error(`OCR Processing Failed: ${detail}`);
        }
    },
};