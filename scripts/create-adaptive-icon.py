#!/usr/bin/env python3
"""
Create an adaptive icon for Android from the original logo.
For adaptive icons, the safe zone is approximately 66% of the center.
This script adds padding to ensure the logo fits within the safe zone.
"""

from PIL import Image
import os

# Paths
input_path = "/home/pierre/kiko/assets/images/oklogo.png"
output_path = "/home/pierre/kiko/assets/images/adaptive-icon.png"

# Load the original image
img = Image.open(input_path)
print(f"Original size: {img.size}")

# For adaptive icons:
# - Full size: 512x512
# - Safe zone: ~66% = ~340x340 in the center
# - We need to scale down the logo to fit in safe zone with some margin

# Calculate new size (60% of original to be safe)
safe_zone_percentage = 0.60
new_size = int(512 * safe_zone_percentage)

# Resize the logo
img_resized = img.resize((new_size, new_size), Image.Resampling.LANCZOS)

# Create a new transparent 512x512 canvas
canvas = Image.new('RGBA', (512, 512), (0, 0, 0, 0))

# Calculate position to center the resized logo
paste_position = ((512 - new_size) // 2, (512 - new_size) // 2)

# Paste the resized logo onto the canvas
canvas.paste(img_resized, paste_position, img_resized)

# Save the result
canvas.save(output_path, 'PNG')
print(f"✓ Created adaptive icon: {output_path}")
print(f"  - Canvas: 512x512")
print(f"  - Logo: {new_size}x{new_size} (centered)")
print(f"  - Safe zone coverage: {safe_zone_percentage*100}%")
