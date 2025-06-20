from PIL import Image
import os

# Path to the source image
src_path = '../Textures/roads2W.png'
# Output directory (change as needed)
output_dir = '../Textures/tiles'
os.makedirs(output_dir, exist_ok=True)

tile_size = 64

# Open the image
img = Image.open(src_path)
width, height = img.size

count = 0
for y in range(0, height, tile_size):
    for x in range(0, width, tile_size):
        # Calculate the box for cropping
        box = (x, y, x + tile_size, y + tile_size)
        # Crop the image
        tile = img.crop(box)
        # Save the tile
        tile.save(os.path.join(output_dir, f'Road ({count}).png'))
        count += 1

print(f"Done! {count} tiles saved in '{output_dir}'")
