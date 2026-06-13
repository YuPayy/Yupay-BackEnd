"""
Integration tests for /ocr endpoint via FastAPI TestClient.

Tests cover:
- Health check (GET /)
- File upload (valid image, non-image, oversized, corrupt)
- Callback behavior (enabled/disabled)
- Error responses
"""
import pytest


class TestHealthCheck:
    """Tests for the root health endpoint."""

    def test_root_returns_running_status(self, client):
        """GET / returns 200 + service status."""
        res = client.get("/")
        assert res.status_code == 200
        body = res.json()
        assert body["status"] == "running"
        assert "OCR Service" in body["service"]


class TestOcrEndpoint:
    """Tests for POST /ocr endpoint."""

    def test_valid_png_returns_ocr_data(self, client, receipt_png_1x1):
        """Valid PNG upload should return OCR result."""
        files = {"image": ("receipt.png", receipt_png_1x1, "image/png")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 200
        body = res.json()
        assert "raw_text" in body
        assert "status" in body
        assert body["status"] == "success"
        assert "synced_to_ts" in body
        assert body["synced_to_ts"] is False  # callback disabled in test

    def test_valid_jpeg_returns_ocr_data(self, client, receipt_jpeg_minimal):
        """Valid JPEG upload should return OCR result."""
        files = {"image": ("receipt.jpg", receipt_jpeg_minimal, "image/jpeg")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_non_image_file_rejected(self, client, not_image_text):
        """Text file (content-type text/plain) should be rejected with 400."""
        files = {"image": ("note.txt", not_image_text, "text/plain")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 400
        assert "image" in res.json()["detail"].lower() or "gambar" in res.json()["detail"].lower()

    def test_missing_file_returns_422(self, client):
        """No file uploaded → 422 Unprocessable Entity (FastAPI validation)."""
        res = client.post("/ocr")
        assert res.status_code == 422

    def test_oversized_file_rejected(self, client, large_image):
        """File > 15MB should be rejected with 413."""
        files = {"image": ("big.png", large_image, "image/png")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 413
        assert "15" in res.json()["detail"] or "besar" in res.json()["detail"].lower()

    def test_corrupt_image_returns_500(self, client, mock_easyocr):
        """Bytes declared as image/png but not a real image → 500 from cv2."""
        corrupt = b"\x00\x01\x02\x03\x04not a real image"
        files = {"image": ("fake.png", corrupt, "image/png")}
        res = client.post("/ocr", files=files)

        # cv2.imdecode fails on invalid data → 500 from our exception handler
        assert res.status_code == 500

    def test_callback_disabled_no_sync(self, client, receipt_png_1x1, mock_httpx_callback):
        """When SYNC_CALLBACK_ENABLED=false, no HTTP call should be made."""
        files = {"image": ("receipt.png", receipt_png_1x1, "image/png")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 200
        assert res.json()["synced_to_ts"] is False
        mock_httpx_callback.post.assert_not_called()

    def test_webp_format_accepted(self, client, receipt_webp):
        """WebP format should be accepted (in allowlist)."""
        files = {"image": ("receipt.webp", receipt_webp, "image/webp")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 200
        assert res.json()["status"] == "success"

    def test_empty_image_returns_error(self, client, mock_easyocr):
        """Empty bytes declared as image → cv2 error → 500."""
        files = {"image": ("empty.png", b"", "image/png")}
        res = client.post("/ocr", files=files)

        assert res.status_code == 500
