import os
from PIL import Image, ImageDraw

def create_icon(name, draw_func):
    img = Image.new('RGBA', (32, 32), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw_func(draw)
    # Downscale for crisp 16x16
    img = img.resize((16, 16), Image.Resampling.LANCZOS)
    out_dir = r"c:\GitHub\Mission-Control\Gaming\frontend\public\tray"
    os.makedirs(out_dir, exist_ok=True)
    img.save(os.path.join(out_dir, f"{name}.png"))

def draw_dashboard(draw):
    # Four squares
    draw.rounded_rectangle([4, 4, 14, 14], radius=2, fill="white")
    draw.rounded_rectangle([18, 4, 28, 14], radius=2, fill="white")
    draw.rounded_rectangle([4, 18, 14, 28], radius=2, fill="white")
    draw.rounded_rectangle([18, 18, 28, 28], radius=2, fill="white")

def draw_hud(draw):
    # Monitor / Overlay shape
    draw.rounded_rectangle([2, 6, 30, 26], radius=3, outline="white", width=2)
    draw.line([2, 12, 30, 12], fill="white", width=2)
    draw.rectangle([6, 16, 12, 20], fill="white")

def draw_stealth(draw):
    # Ninja mask / Eye
    draw.ellipse([2, 10, 30, 22], outline="white", width=2)
    draw.ellipse([12, 12, 20, 20], fill="white")

def draw_update(draw):
    # Arrow circle
    draw.arc([4, 4, 28, 28], start=30, end=330, fill="white", width=3)
    draw.polygon([16, 2, 16, 10, 22, 6], fill="white")

def draw_exit(draw):
    # Door and arrow
    draw.rectangle([10, 4, 24, 28], outline="white", width=2)
    draw.line([2, 16, 16, 16], fill="white", width=3)
    draw.polygon([12, 12, 12, 20, 18, 16], fill="white")

create_icon("dashboard", draw_dashboard)
create_icon("hud", draw_hud)
create_icon("stealth", draw_stealth)
create_icon("update", draw_update)
create_icon("exit", draw_exit)

print("Tray icons generated successfully.")
