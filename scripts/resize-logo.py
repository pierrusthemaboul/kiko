#!/usr/bin/env python3
from PIL import Image
import sys

def resize_logo(input_path, output_path, size=1024):
    """Resize logo to exact square size with white background"""
    # Open image
    img = Image.open(input_path)

    # Convert to RGB if needed (in case it's RGBA)
    if img.mode in ('RGBA', 'LA'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            background.paste(img, mask=img.split()[3])
        else:
            background.paste(img, mask=img.split()[1])
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Calculate aspect ratio and resize
    img.thumbnail((size, size), Image.Resampling.LANCZOS)

    # Create white background
    final_img = Image.new('RGB', (size, size), (255, 255, 255))

    # Paste resized image centered
    offset = ((size - img.size[0]) // 2, (size - img.size[1]) // 2)
    final_img.paste(img, offset)

    # Save
    final_img.save(output_path, 'JPEG', quality=95)
    print(f"✅ Logo resized to {size}x{size} pixels")
    print(f"📁 Saved to: {output_path}")

if __name__ == '__main__':
    input_path = '/home/pierre/kiko/assets/images/timalogo.jpg'
    output_path = '/home/pierre/kiko/assets/images/timalogo-1024.jpg'

    resize_logo(input_path, output_path, 1024)
