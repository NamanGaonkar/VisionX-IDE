import os
import sys
import zipfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
SOURCE_DIR = DIST_DIR / "VisionX-win32-x64"
OUTPUT_ZIP = DIST_DIR / "VisionX-Windows-x64-v1.1.0.zip"

print("==================================================")
print("     VisionX IDE v1.1.0 - Packaging Release      ")
print("==================================================")

if not SOURCE_DIR.exists():
    print(f"Error: {SOURCE_DIR} does not exist. Run build_visionx.py first!")
    sys.exit(1)

print(f"Creating standalone distribution zip: {OUTPUT_ZIP.name}...")

with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(SOURCE_DIR):
        for f in files:
            full_path = Path(root) / f
            arcname = full_path.relative_to(SOURCE_DIR)
            z.write(full_path, arcname)

size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
print(f"Successfully packaged {OUTPUT_ZIP.name} ({size_mb:.2f} MB)")
print("==================================================")
