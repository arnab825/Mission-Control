import os
from PIL import Image, ImageEnhance, ImageOps

# Resolve games directory relative to this script or fallback to workspace path
script_dir = os.path.dirname(os.path.abspath(__file__))
games_dir = os.path.abspath(os.path.join(script_dir, "..", "website", "public", "games"))

if not os.path.exists(games_dir):
    games_dir = r"e:\AiAssistant\Gaming\website\public\games"

files = [f for f in os.listdir(games_dir) if f.endswith(".png")]

print(f"Target directory: {games_dir}")
print(f"Found {len(files)} PNG images to convert and HDR enhance.")

for filename in files:
    png_path = os.path.join(games_dir, filename)
    webp_filename = os.path.splitext(filename)[0] + ".webp"
    webp_path = os.path.join(games_dir, webp_filename)

    with Image.open(png_path) as img:
        img = img.convert("RGB")
        
        # Apply HDR-style contrast, color vibrancy, and sharpness enhancement
        contrast_enhancer = ImageEnhance.Contrast(img)
        img_hdr = contrast_enhancer.enhance(1.12)
        
        color_enhancer = ImageEnhance.Color(img_hdr)
        img_hdr = color_enhancer.enhance(1.18)
        
        sharpness_enhancer = ImageEnhance.Sharpness(img_hdr)
        img_hdr = sharpness_enhancer.enhance(1.25)
        
        # Save as high-quality WebP
        img_hdr.save(webp_path, "WEBP", quality=92, method=6)
        
        orig_size = os.path.getsize(png_path) / (1024 * 1024)
        new_size = os.path.getsize(webp_path) / (1024 * 1024)
        print(f"Processed: {filename} ({orig_size:.2f} MB) -> {webp_filename} ({new_size:.2f} MB) [-{(1 - new_size/orig_size)*100:.1f}%]")

print("All images converted and HDR enhanced successfully!")
