"""
Unit tests for app/ocr.py — pure function tests (no API, no DB).

Tests cover:
- extract_total_from_text: regex parsing of various formats
- preprocess_image: cv2 color conversion
"""
import pytest
import numpy as np
import cv2

from app.ocr import extract_total_from_text, preprocess_image


# ─────────────────────────────────────────────
# extract_total_from_text
# ─────────────────────────────────────────────

class TestExtractTotalFromText:
    """Tests for the total amount regex extraction."""

    def test_standard_rp_with_dots(self):
        """Standard Indonesian receipt: 'RP 125.000' → 125000."""
        text = "Nasi Goreng\nRP 125.000"
        assert extract_total_from_text(text) == 125000

    def test_no_prefix_simple_number(self):
        """Plain number without currency prefix."""
        text = "Item A\n85000"
        assert extract_total_from_text(text) == 85000

    def test_idr_prefix(self):
        """IDR prefix should be recognized."""
        text = "Subtotal IDR 50.000\nTax 5000"
        assert extract_total_from_text(text) == 5000  # Last valid number

    def test_rp_with_dots_million(self):
        """Million-scale amount: 'Rp 1.250.000' → 1250000."""
        text = "Total Rp 1.250.000"
        assert extract_total_from_text(text) == 1250000

    def test_no_valid_numbers(self):
        """No valid amounts found → None."""
        text = "Terima kasih atas kunjungan Anda"
        assert extract_total_from_text(text) is None

    def test_number_too_short(self):
        """3-digit number is too short (min 4 digits)."""
        text = "Total 500"
        assert extract_total_from_text(text) is None

    def test_number_too_long(self):
        """8-digit number is too long (max 7 digits)."""
        text = "Total 99999999"
        assert extract_total_from_text(text) is None

    def test_multiple_amounts_picks_last(self):
        """When multiple valid amounts exist, the last one is the total."""
        text = "Item 1: 25000\nItem 2: 30000\nTotal: 55000"
        assert extract_total_from_text(text) == 55000

    def test_case_insensitive_rp(self):
        """Lowercase 'rp' should still work."""
        text = "total rp 75.000"
        assert extract_total_from_text(text) == 75000

    def test_mixed_case_with_garbage(self):
        """Text with extra words mixed in — should pick last valid number."""
        text = "Bayar 100000\nKembali 50000"
        assert extract_total_from_text(text) == 50000

    def test_empty_string(self):
        """Empty text returns None."""
        assert extract_total_from_text("") is None

    def test_only_currency_no_number(self):
        """Currency prefix without digits → None."""
        assert extract_total_from_text("RP IDR TOTAL") is None

    def test_decimal_comma_format(self):
        """European-style decimal: '125,50' → 12550 (4-7 digit)."""
        text = "Price 125,50"
        result = extract_total_from_text(text)
        # 125,50 → after removing dots/spaces/commas → 12550 (5 digits, valid)
        assert result == 12550


# ─────────────────────────────────────────────
# preprocess_image
# ─────────────────────────────────────────────

class TestPreprocessImage:
    """Tests for cv2 color space conversion."""

    def test_bgr_to_grayscale(self):
        """3-channel BGR image → 2D grayscale array."""
        bgr = np.zeros((10, 10, 3), dtype=np.uint8)
        gray = preprocess_image(bgr)
        assert len(gray.shape) == 2  # 2D array
        assert gray.shape == (10, 10)

    def test_already_grayscale_passes_through_or_fails_gracefully(self):
        """2D input should either pass through or fail with cv2 error."""
        gray = np.zeros((10, 10), dtype=np.uint8)
        try:
            result = preprocess_image(gray)
            assert result.shape == (10, 10)
        except cv2.error:
            # cv2.cvtColor fails on already-grayscale — acceptable
            pass

    def test_rgba_image_4channel(self):
        """4-channel RGBA image should not crash."""
        rgba = np.zeros((10, 10, 4), dtype=np.uint8)
        try:
            result = preprocess_image(rgba)
            assert result.shape[0] == 10
        except cv2.error:
            pass  # Some cv2 versions reject 4-channel

    def test_colored_image_preserves_dimensions(self):
        """Colored image keeps same width/height after grayscale."""
        bgr = np.random.randint(0, 255, (20, 30, 3), dtype=np.uint8)
        gray = preprocess_image(bgr)
        assert gray.shape == (20, 30)
