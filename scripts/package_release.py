import os
import sys
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
SOURCE_DIR = DIST_DIR / "VisionX-win32-x64"
OUTPUT_ZIP = DIST_DIR / "VisionX-Windows-x64-v1.7.0.zip"

print("==================================================")
print("     VisionX IDE v1.7.0 - Packaging Release      ")
print("==================================================")

if not SOURCE_DIR.exists():
    print(f"Error: {SOURCE_DIR} does not exist. Run build_visionx.py first!")
    sys.exit(1)

# Clean all previous release zip files in dist/
for old_zip in DIST_DIR.glob("VisionX-Windows-x64-*.zip"):
    try:
        old_zip.unlink()
        print(f"Deleted older release zip: {old_zip.name}")
    except Exception as e:
        print(f"Note deleting {old_zip.name}: {e}")

print(f"Creating standalone distribution zip: {OUTPUT_ZIP.name}...")

seven_zip = shutil.which("7z") or shutil.which("7z.exe")
if seven_zip:
    print(f"Using 7-Zip ({seven_zip}) for high-speed compression...")
    cmd = [seven_zip, "a", "-tzip", "-mx=5", "-mmt=on", str(OUTPUT_ZIP), f"{SOURCE_DIR}\\*"]
    subprocess.run(cmd, check=True)
else:
    import zipfile
    print("Using standard python zipfile...")
    with zipfile.ZipFile(OUTPUT_ZIP, 'w', zipfile.ZIP_DEFLATED) as z:
        for root, dirs, files in os.walk(SOURCE_DIR):
            for f in files:
                full_path = Path(root) / f
                arcname = full_path.relative_to(SOURCE_DIR)
                z.write(full_path, arcname)

size_mb = OUTPUT_ZIP.stat().st_size / (1024 * 1024)
print(f"Successfully packaged {OUTPUT_ZIP.name} ({size_mb:.2f} MB)")
print("==================================================")
