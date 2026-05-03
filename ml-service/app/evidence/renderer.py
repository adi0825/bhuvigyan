"""
Evidence rendering helpers (images + single-page evidence PDF).
Uses Pillow only — no reportlab / wkhtmltopdf dependency.

Spring Boot has its own PDFBox-based renderer for heavier evidence dossiers.
This Python side is for the fast inline artifacts uploaded to MinIO.
"""
from __future__ import annotations

import io
from datetime import date
from typing import Any

from PIL import Image, ImageDraw, ImageFont

W, H = 1024, 768


def render_true_color(udlrn: str, ndvi_claim: float) -> bytes:
    """Synthetic true-color image: NDVI value drives dominant green saturation."""
    img = Image.new("RGB", (W, H), (110, 160, 70))
    d = ImageDraw.Draw(img)
    # Wash a green proportional to ndvi
    alpha = max(0.0, min(1.0, float(ndvi_claim)))
    overlay = Image.new("RGB", (W, H), (60, 150, 40))
    img = Image.blend(img, overlay, alpha)
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 420, 80], fill=(0, 0, 0, 180))
    d.text((30, 30), f"UDLRN {udlrn}  TrueColor (synth)", fill="white")
    return _to_jpg(img)


def render_ndvi_heatmap(udlrn: str, ndvi: float) -> bytes:
    """Red→yellow→green NDVI heatmap."""
    img = Image.new("RGB", (W, H), (255, 255, 255))
    for y in range(H):
        t = y / H
        r = int(255 * (1 - t))
        g = int(255 * t)
        for x in range(W):
            img.putpixel((x, y), (r, g, 60))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 420, 80], fill=(0, 0, 0))
    d.text((30, 30), f"UDLRN {udlrn}  NDVI={ndvi:.3f}", fill="white")
    return _to_jpg(img)


def render_loss_map(udlrn: str, ndvi_delta: float) -> bytes:
    """Delta-NDVI loss map: blue=no loss, red=high loss."""
    img = Image.new("RGB", (W, H), (255, 255, 255))
    loss = max(0.0, min(1.0, ndvi_delta))
    for y in range(H):
        t = y / H
        r = int(255 * loss * (1 - t))
        b = int(255 * (1 - loss) * t)
        for x in range(W):
            img.putpixel((x, y), (r, 50, b))
    d = ImageDraw.Draw(img)
    d.rectangle([20, 20, 480, 80], fill=(0, 0, 0))
    d.text((30, 30), f"UDLRN {udlrn}  NDVI loss={ndvi_delta:.3f}", fill="white")
    return _to_jpg(img)


def render_evidence_pdf(
        udlrn: str, claim_id: str, fraud_score: int, flags: list[str],
        ndvi_sowing: float, ndvi_claim: float, area_ha: float,
        recommendation: str, true_color: bytes, ndvi_map: bytes, loss_map: bytes
) -> bytes:
    """Compose a 3-page PDF: cover + 3 satellite images."""
    cover = Image.new("RGB", (1024, 1400), "white")
    d = ImageDraw.Draw(cover)
    try:
        font_big = ImageFont.truetype("DejaVuSans-Bold.ttf", 36)
        font_med = ImageFont.truetype("DejaVuSans.ttf", 22)
        font_sm  = ImageFont.truetype("DejaVuSans.ttf", 18)
    except (OSError, IOError):
        font_big = font_med = font_sm = ImageFont.load_default()

    d.text((60, 60),  "BHUVIGYAN — PMFBY Evidence Report", fill="black", font=font_big)
    d.rectangle([60, 130, 964, 135], fill="black")

    y = 180
    d.text((60, y),            f"Claim ID : {claim_id}", fill="black", font=font_med); y += 40
    d.text((60, y),            f"UDLRN    : {udlrn}",     fill="black", font=font_med); y += 40
    d.text((60, y),            f"Date     : {date.today().isoformat()}", fill="black", font=font_med); y += 60

    color = "green" if fraud_score <= 30 else "orange" if fraud_score <= 60 else "red"
    d.text((60, y), f"Fraud score: {fraud_score}/100", fill=color, font=font_big); y += 60
    d.text((60, y), f"Recommendation: {recommendation}", fill="black", font=font_med); y += 40
    d.text((60, y), f"NDVI @ sowing : {ndvi_sowing:.3f}",  fill="black", font=font_med); y += 30
    d.text((60, y), f"NDVI @ claim  : {ndvi_claim:.3f}",   fill="black", font=font_med); y += 30
    d.text((60, y), f"Area (sat.)   : {area_ha:.3f} ha",   fill="black", font=font_med); y += 60

    d.text((60, y), "Flags:", fill="black", font=font_med); y += 30
    if not flags:
        d.text((80, y), "• (none)", fill="black", font=font_sm); y += 25
    else:
        for f in flags:
            d.text((80, y), f"• {f}", fill="red", font=font_sm); y += 25

    y += 40
    d.text((60, y), "Pages 2-4: True Color | NDVI Heatmap | Loss Map", fill="gray", font=font_sm)

    pages = [cover,
             Image.open(io.BytesIO(true_color)).convert("RGB"),
             Image.open(io.BytesIO(ndvi_map)).convert("RGB"),
             Image.open(io.BytesIO(loss_map)).convert("RGB")]

    out = io.BytesIO()
    pages[0].save(out, format="PDF", save_all=True, append_images=pages[1:])
    return out.getvalue()


def _to_jpg(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return buf.getvalue()
