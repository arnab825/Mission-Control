import os
from PIL import Image, ImageEnhance, ImageFilter

screenshots_dir = r"c:\GitHub\Mission-Control\Gaming\website\public\screenshots"

hud_files = [
    "hud.png",
    "hud.jpg",
    "hud.webp",
    "hud_standard.webp",
    "hud_compact.webp",
    "hud_horizontal.webp",
    "dashboard.jpg",
    "dashboard.webp",
    "library.png",
    "library.webp",
    "readiness.png",
    "readiness.webp",
    "system.png",
    "system.webp",
    "vision.webp",
    "lab.jpg",
    "lab.webp"
]

def enhance_hud_image(file_path):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    try:
        img = Image.open(file_path)
        original_format = img.format or "PNG"
        
        # Convert RGBA or RGB
        if img.mode not in ("RGB", "RGBA"):
            img = img.convert("RGBA")

        w, h = img.size
        # 2x High-DPI Upscale using Lanczos filter
        target_w, target_h = w * 2, h * 2
        upscaled = img.resize((target_w, target_h), Image.Resampling.LANCZOS)

        # Unsharp Mask Filter to sharpen small UI text and icons
        sharpened = upscaled.filter(ImageFilter.UnsharpMask(radius=2, percent=150, threshold=3))

        # Contrast & Detail Enhancement
        enhancer = ImageEnhance.Contrast(sharpened)
        enhanced = enhancer.enhance(1.08)

        sharpness_enhancer = ImageEnhance.Sharpness(enhanced)
        final_img = sharpness_enhancer.enhance(1.25)

        # Save back with high quality settings
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".webp":
            final_img.save(file_path, "WEBP", quality=98, lossless=True)
        elif ext == ".png":
            final_img.save(file_path, "PNG", compress_level=3)
        elif ext in (".jpg", ".jpeg"):
            if final_img.mode == "RGBA":
                final_img = final_img.convert("RGB")
            final_img.save(file_path, "JPEG", quality=98, subsampling=0)

        print(f"[OK] Enhanced & upscaled ({w}x{h} -> {target_w}x{target_h}): {os.path.basename(file_path)}")

    except Exception as e:
        print(f"[ERROR] Failed to enhance {file_path}: {e}")

def main():
    print(f"Processing HUD images in {screenshots_dir}...")
    for filename in hud_files:
        full_path = os.path.join(screenshots_dir, filename)
        enhance_hud_image(full_path)

if __name__ == "__main__":
    main()
