#!/usr/bin/env python3
"""
Generate high-fidelity animated GIFs showcasing the 8 engineering themes
and Game-Adaptive Theming for Mission Control's website.
"""

import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Theme definitions matching Gaming/frontend/src/data/themes.ts
THEMES = [
    {
        "id": "emerald",
        "name": "Emerald Protocol",
        "tagline": "Tactical NVIDIA signature emerald with stealth optics",
        "badge": "NVIDIA Signature",
        "primary_hex": "#76B900",
        "secondary_hex": "#BFFF00",
        "target_h_deg": 84.0,
        "s_mult": 1.0,
        "v_mult": 1.0,
        "p_rgb": (118, 185, 0),
        "s_rgb": (191, 255, 0),
        "faction": "RTX Cyber Vanguard",
        "game": "DOOM: The Dark Ages",
    },
    {
        "id": "cyberpunk",
        "name": "Cyberpunk 2077",
        "tagline": "High-voltage Night City cyan with blazing cyber yellow",
        "badge": "Night City Edition",
        "primary_hex": "#00F0FF",
        "secondary_hex": "#FEE715",
        "target_h_deg": 184.0,
        "s_mult": 1.25,
        "v_mult": 1.15,
        "p_rgb": (0, 240, 255),
        "s_rgb": (254, 231, 21),
        "faction": "Night City Syndicate",
        "game": "Cyberpunk 2077",
    },
    {
        "id": "crimson",
        "name": "Crimson Fury",
        "tagline": "Aggressive Radeon crimson and hot coral racing flare",
        "badge": "Radeon Red Flare",
        "primary_hex": "#FF2A4B",
        "secondary_hex": "#FF758C",
        "target_h_deg": 351.0,
        "s_mult": 1.15,
        "v_mult": 1.15,
        "p_rgb": (255, 42, 75),
        "s_rgb": (255, 117, 140),
        "faction": "Radeon Bloodhound",
        "game": "Doom Eternal",
    },
    {
        "id": "cobalt",
        "name": "Quantum Cobalt",
        "tagline": "Deep space Arc sapphire with electric sky cyan",
        "badge": "Arc Azure Core",
        "primary_hex": "#00A8FF",
        "secondary_hex": "#38BDF8",
        "target_h_deg": 200.0,
        "s_mult": 1.15,
        "v_mult": 1.15,
        "p_rgb": (0, 168, 255),
        "s_rgb": (56, 189, 248),
        "faction": "Arc Quantum Core",
        "game": "Starfield",
    },
    {
        "id": "amethyst",
        "name": "Void Amethyst",
        "tagline": "Neon violet with synthwave magenta for deep sessions",
        "badge": "Deep Void Neon",
        "primary_hex": "#A855F7",
        "secondary_hex": "#F472B6",
        "target_h_deg": 272.0,
        "s_mult": 1.2,
        "v_mult": 1.1,
        "p_rgb": (168, 85, 247),
        "s_rgb": (244, 114, 182),
        "faction": "Cybernet Ronin",
        "game": "Hollow Knight: Silksong",
    },
    {
        "id": "solar",
        "name": "Solar Flare",
        "tagline": "Warm telemetry amber with molten gold highlights",
        "badge": "Solaris Fleet Gold",
        "primary_hex": "#F59E0B",
        "secondary_hex": "#FDE047",
        "target_h_deg": 38.0,
        "s_mult": 1.2,
        "v_mult": 1.15,
        "p_rgb": (245, 158, 11),
        "s_rgb": (253, 224, 71),
        "faction": "Solaris Orbital Fleet",
        "game": "Forza Horizon 5",
    },
    {
        "id": "toxic",
        "name": "Toxic Hazard",
        "tagline": "Radioactive biohazard green with crisp phosphor mint",
        "badge": "Biohazard Spec",
        "primary_hex": "#10B981",
        "secondary_hex": "#6EE7B7",
        "target_h_deg": 160.0,
        "s_mult": 1.15,
        "v_mult": 1.1,
        "p_rgb": (16, 185, 129),
        "s_rgb": (110, 231, 183),
        "faction": "Toxic Hazard Faction",
        "game": "S.T.A.L.K.E.R. 2",
    },
    {
        "id": "stealth",
        "name": "Stealth Carbon",
        "tagline": "Pure monochrome platinum and titanium spec-ops slate",
        "badge": "Spec Ops Titanium",
        "primary_hex": "#E2E8F0",
        "secondary_hex": "#94A3B8",
        "target_h_deg": 0.0,
        "s_mult": 0.05,  # Desaturate green accents into clean titanium slate
        "v_mult": 1.25,
        "p_rgb": (226, 232, 240),
        "s_rgb": (148, 163, 184),
        "faction": "Stealth Operative",
        "game": "Ghost of Tsushima",
    },
]

def load_fonts():
    windir = os.environ.get("WINDIR", "C:\\Windows")
    fonts_dir = os.path.join(windir, "Fonts")
    
    font_bold_path = os.path.join(fonts_dir, "segoeuib.ttf")
    font_mono_path = os.path.join(fonts_dir, "consolab.ttf")
    font_regular_path = os.path.join(fonts_dir, "segoeui.ttf")
    
    try:
        font_title = ImageFont.truetype(font_bold_path, 20)
        font_badge = ImageFont.truetype(font_mono_path, 12)
        font_desc = ImageFont.truetype(font_regular_path, 13)
        font_mono_sm = ImageFont.truetype(font_mono_path, 11)
        font_watermark = ImageFont.truetype(font_mono_path, 10)
    except Exception:
        font_title = ImageFont.load_default()
        font_badge = font_title
        font_desc = font_title
        font_mono_sm = font_title
        font_watermark = font_title
        
    return {
        "title": font_title,
        "badge": font_badge,
        "desc": font_desc,
        "mono_sm": font_mono_sm,
        "watermark": font_watermark,
    }

def transform_theme_colors(base_hsv_arr, theme):
    """
    Carefully isolates the green/emerald UI accents in base image
    and smoothly rotates hue and scales saturation to the target theme.
    """
    h = base_hsv_arr[..., 0].astype(float)
    s = base_hsv_arr[..., 1].astype(float)
    v = base_hsv_arr[..., 2].astype(float)
    
    # Original Emerald Protocol hue in PIL 0-255 scale is ~ 84 deg / 360 * 255 = ~60
    # Green accent range: 45 to 115
    center_h = (84.0 / 360.0) * 255.0
    dist = np.abs(h - center_h)
    
    # Handle wrap-around just in case
    dist = np.minimum(dist, 255.0 - dist)
    
    half_width = 32.0
    mask = (dist < half_width) & (s > 30.0) & (v > 30.0)
    
    weight = np.clip(1.0 - (dist / half_width), 0.0, 1.0) ** 0.75
    
    target_h_pil = (theme["target_h_deg"] / 360.0) * 255.0
    
    new_hsv = base_hsv_arr.copy()
    
    # Calculate shifted hue
    shifted_h = (h * (1.0 - weight) + target_h_pil * weight).astype(np.uint8)
    
    # Calculate shifted saturation
    shifted_s = np.clip(s * (1.0 - weight + weight * theme["s_mult"]), 0.0, 255.0).astype(np.uint8)
    
    # Calculate shifted value
    shifted_v = np.clip(v * (1.0 - weight + weight * theme["v_mult"]), 0.0, 255.0).astype(np.uint8)
    
    new_hsv[..., 0] = np.where(mask, shifted_h, new_hsv[..., 0])
    new_hsv[..., 1] = np.where(mask, shifted_s, new_hsv[..., 1])
    new_hsv[..., 2] = np.where(mask, shifted_v, new_hsv[..., 2])
    
    rgb_img = Image.fromarray(new_hsv, "HSV").convert("RGB")
    return rgb_img

def render_overlay_hud(base_img, theme, index, total, fonts, mode="dashboard"):
    """
    Renders a sleek tactical glass HUD card displaying the theme details.
    """
    img = base_img.copy()
    draw = ImageDraw.Draw(img, "RGBA")
    w, h = img.size
    
    p_rgb = theme["p_rgb"]
    s_rgb = theme["s_rgb"]
    
    # Position: top-right corner or top-center
    card_w = 410
    card_h = 104
    margin_x = 24
    margin_y = 24
    x0 = w - card_w - margin_x
    y0 = margin_y
    x1 = x0 + card_w
    y1 = y0 + card_h
    
    # 1. Glass Card Background with glow
    # Subtle ambient colored glow behind card
    draw.rounded_rectangle([x0 - 3, y0 - 3, x1 + 3, y1 + 3], radius=14, fill=(p_rgb[0], p_rgb[1], p_rgb[2], 25))
    # Dark obsidian panel
    draw.rounded_rectangle([x0, y0, x1, y1], radius=12, fill=(10, 11, 16, 235))
    # Glowing border
    draw.rounded_rectangle([x0, y0, x1, y1], radius=12, outline=(p_rgb[0], p_rgb[1], p_rgb[2], 180), width=2)
    
    # 2. Header: Badge & Index
    # Theme pill badge
    badge_text = f"THEME {index+1:02d}/{total:02d} • {theme['badge'].upper()}"
    draw.text((x0 + 16, y0 + 12), badge_text, fill=(p_rgb[0], p_rgb[1], p_rgb[2], 255), font=fonts["badge"])
    
    # Color swatch indicators
    dot_r = 7
    dot1_x = x1 - 42
    dot1_y = y0 + 18
    dot2_x = x1 - 22
    dot2_y = y0 + 18
    draw.ellipse([dot1_x - dot_r, dot1_y - dot_r, dot1_x + dot_r, dot1_y + dot_r], fill=p_rgb)
    draw.ellipse([dot2_x - dot_r, dot2_y - dot_r, dot2_x + dot_r, dot2_y + dot_r], fill=s_rgb)
    
    # 3. Main Theme Title
    draw.text((x0 + 16, y0 + 32), theme["name"], fill=(255, 255, 255, 255), font=fonts["title"])
    
    # 4. Color Codes & Tagline
    palette_info = f"PRIM: {theme['primary_hex']}  |  SEC: {theme['secondary_hex']}"
    draw.text((x0 + 16, y0 + 60), palette_info, fill=(200, 205, 215, 240), font=fonts["mono_sm"])
    
    faction_or_game = f"ADAPTIVE SYNC: {theme['game']}  •  FACTION: {theme['faction']}"
    draw.text((x0 + 16, y0 + 78), faction_or_game, fill=(140, 145, 160, 220), font=fonts["desc"])
    
    # 5. Bottom progress line in the card
    bar_x0 = x0 + 16
    bar_y0 = y1 - 6
    bar_w = card_w - 32
    draw.rectangle([bar_x0, bar_y0, bar_x0 + bar_w, bar_y0 + 2], fill=(255, 255, 255, 30))
    progress = (index + 1) / total
    draw.rectangle([bar_x0, bar_y0, bar_x0 + int(bar_w * progress), bar_y0 + 2], fill=(p_rgb[0], p_rgb[1], p_rgb[2], 255))
    
    # 6. Bottom subtle branding watermark
    watermark = "MISSION CONTROL // ADAPTIVE THEME ENGINE v3.8.8"
    draw.text((margin_x, h - margin_y - 14), watermark, fill=(p_rgb[0], p_rgb[1], p_rgb[2], 180), font=fonts["watermark"])
    
    return img

def create_theme_showcase_gif(source_path, dest_path, target_width=960, mode="dashboard"):
    print(f"[*] Processing {source_path} -> {dest_path}...")
    base = Image.open(source_path).convert("RGB")
    
    aspect = base.height / base.width
    target_height = int(target_width * aspect)
    if target_height % 2 != 0:
        target_height += 1
        
    base_resized = base.resize((target_width, target_height), Image.Resampling.LANCZOS)
    base_hsv = np.array(base_resized.convert("HSV"))
    
    fonts = load_fonts()
    total = len(THEMES)
    
    frames = []
    durations = []
    
    # Pre-render base styled images for all themes
    styled_images = []
    for i, theme in enumerate(THEMES):
        colored_rgb = transform_theme_colors(base_hsv, theme)
        overlaid = render_overlay_hud(colored_rgb, theme, i, total, fonts, mode=mode)
        styled_images.append(overlaid)
        
    for i in range(total):
        curr_img = styled_images[i]
        next_img = styled_images[(i + 1) % total]
        
        # Hold frame on current theme (1400ms)
        frames.append(curr_img.quantize(colors=256, method=Image.Resampling.LANCZOS))
        durations.append(1400)
        
        # Smooth cross-fade transition (2 intermediate frames)
        for alpha in [0.35, 0.70]:
            blended = Image.blend(curr_img, next_img, alpha)
            frames.append(blended.quantize(colors=256, method=Image.Resampling.LANCZOS))
            durations.append(80)
            
    print(f"[*] Assembling animated GIF with {len(frames)} frames...")
    frames[0].save(
        dest_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    
    size_mb = os.path.getsize(dest_path) / (1024 * 1024)
    print(f"[SUCCESS] Generated {dest_path} ({size_mb:.2f} MB)")

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    screenshots_dir = os.path.join(root, "Gaming", "website", "public", "screenshots")
    os.makedirs(screenshots_dir, exist_ok=True)
    
    dash_src = os.path.join(screenshots_dir, "dashboard.webp")
    hud_src = os.path.join(screenshots_dir, "hud.webp")
    
    gif1 = os.path.join(screenshots_dir, "theme_showcase.gif")
    gif2 = os.path.join(screenshots_dir, "theme_hud_morph.gif")
    
    if os.path.exists(dash_src):
        create_theme_showcase_gif(dash_src, gif1, target_width=960, mode="dashboard")
    else:
        print(f"[ERROR] {dash_src} not found")
        
    if os.path.exists(hud_src):
        create_theme_showcase_gif(hud_src, gif2, target_width=960, mode="hud")
    else:
        print(f"[ERROR] {hud_src} not found")

if __name__ == "__main__":
    main()
