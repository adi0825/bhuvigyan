from PIL import Image, ImageDraw, ImageFilter
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads", "mock")
os.makedirs(OUTPUT_DIR, exist_ok=True)


def generate_true_color():
    img = Image.new('RGB', (600, 400), color=(139, 115, 85))
    draw = ImageDraw.Draw(img)
    patches = [
        (50, 50, 280, 180, (86, 125, 70)),
        (290, 50, 540, 180, (102, 140, 85)),
        (50, 200, 180, 350, (95, 130, 78)),
        (190, 200, 540, 350, (110, 148, 92)),
        (0, 160, 600, 200, (45, 85, 130)),
    ]
    for x1, y1, x2, y2, color in patches:
        draw.rectangle([x1, y1, x2, y2], fill=color)
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    draw = ImageDraw.Draw(img)
    draw.text((10, 370), "Sentinel-2 | ESA Copernicus | 10m", fill=(255, 255, 255, 180))
    draw.text((10, 10), "TRUE COLOR (B4/B3/B2)", fill=(255, 255, 255))
    img.save(f"{OUTPUT_DIR}/true_color.jpg", quality=85)
    img.save(f"{OUTPUT_DIR}/farm_true_color.jpg", quality=85)
    print("OK: true_color.jpg, farm_true_color.jpg")


def generate_ndvi_map(fraud_mode=False):
    img = Image.new('RGB', (600, 400))
    draw = ImageDraw.Draw(img)
    if fraud_mode:
        patches = [(50, 50, 540, 350, (34, 139, 34))]
        ndvi_text = "NDVI: 0.74 - HEALTHY CROP DETECTED"
        fraud_label = "FRAUD SIGNAL: Healthy crop, damage claimed"
    else:
        patches = [
            (50, 50, 200, 180, (180, 60, 60)),
            (210, 50, 540, 180, (86, 125, 70)),
            (50, 200, 350, 350, (200, 160, 50)),
            (360, 200, 540, 350, (86, 125, 70)),
        ]
        ndvi_text = "NDVI: 0.38 - STRESSED CROP"
        fraud_label = "Damage consistent with claim"
    for x1, y1, x2, y2, color in patches:
        draw.rectangle([x1, y1, x2, y2], fill=color)
    img = img.filter(ImageFilter.GaussianBlur(radius=2))
    draw = ImageDraw.Draw(img)
    for x1, y1, x2, y2, c in [(10, 360, 40, 380, (180, 60, 60)), (45, 360, 75, 380, (200, 160, 50)), (80, 360, 110, 380, (86, 125, 70))]:
        draw.rectangle([x1, y1, x2, y2], fill=c)
    draw.text((10, 382), "Bare  Stressed  Healthy", fill=(255, 255, 255))
    draw.text((10, 10), f"NDVI VEGETATION MAP | {ndvi_text}", fill=(255, 255, 255))
    if fraud_mode:
        draw.text((10, 30), fraud_label, fill=(255, 80, 80))
    draw.text((400, 370), "Sentinel-2 | ESA Copernicus", fill=(200, 200, 200))
    img.save(f"{OUTPUT_DIR}/ndvi_map.jpg", quality=85)
    img.save(f"{OUTPUT_DIR}/farm_ndvi.jpg", quality=85)
    print("OK: ndvi_map.jpg, farm_ndvi.jpg")


def generate_loss_map(damage_pct=45):
    img = Image.new('RGB', (600, 400), color=(245, 245, 245))
    draw = ImageDraw.Draw(img)
    damaged_height = int(300 * damage_pct / 100)
    draw.rectangle([50, 50, 280, 50 + damaged_height], fill=(200, 60, 60))
    draw.rectangle([50, 50 + damaged_height, 280, 350], fill=(240, 240, 240))
    draw.rectangle([300, 50, 540, 350], fill=(200, 220, 200))
    draw.rectangle([0, 160, 600, 200], fill=(180, 200, 230))
    img = img.filter(ImageFilter.GaussianBlur(radius=1))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), f"CROP LOSS MAP | Damaged Area: {damage_pct}%", fill=(60, 60, 60))
    draw.text((10, 30), "Red=Damaged | White=Unchanged | Green=Healthy", fill=(100, 100, 100))
    draw.text((10, 370), "NDVI(Sowing) - NDVI(Claim Date)", fill=(100, 100, 100))
    img.save(f"{OUTPUT_DIR}/loss_map.jpg", quality=85)
    print("OK: loss_map.jpg")


def generate_sar_flood_map(flood_detected=True):
    img = Image.new('RGB', (600, 400), color=(40, 40, 40))
    draw = ImageDraw.Draw(img)
    if flood_detected:
        draw.ellipse([100, 100, 400, 300], fill=(30, 80, 180))
        draw.rectangle([0, 200, 600, 400], fill=(20, 60, 150))
        label = "FLOOD DETECTED - Radar confirms water"
        label_color = (80, 200, 255)
    else:
        draw.rectangle([50, 50, 540, 350], fill=(80, 90, 80))
        draw.rectangle([0, 160, 600, 200], fill=(60, 60, 80))
        label = "NO FLOOD DETECTED - Damage claim suspicious"
        label_color = (255, 150, 50)
    img = img.filter(ImageFilter.GaussianBlur(radius=1.5))
    draw = ImageDraw.Draw(img)
    draw.text((10, 10), f"SAR RADAR (Sentinel-1) | {label}", fill=label_color)
    draw.text((10, 370), "C-band SAR | All-weather penetration", fill=(180, 180, 180))
    img.save(f"{OUTPUT_DIR}/sar_flood.jpg" if flood_detected else f"{OUTPUT_DIR}/sar_no_flood.jpg", quality=85)
    print(f"OK: sar_flood.jpg (flood_detected={flood_detected})")


if __name__ == "__main__":
    print("Generating mock satellite images...")
    generate_true_color()
    generate_ndvi_map(fraud_mode=False)
    generate_ndvi_map(fraud_mode=True)
    generate_loss_map(damage_pct=45)
    generate_sar_flood_map(flood_detected=True)
    generate_sar_flood_map(flood_detected=False)
    print(f"\nAll images saved to: {os.path.abspath(OUTPUT_DIR)}")