import os
import sys
import json
import urllib.request
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist"
ZIP_PATH = DIST_DIR / "VisionX-Windows-x64-v1.2.0.zip"

print(f"Reading file: {ZIP_PATH.name} ({ZIP_PATH.stat().st_size / (1024*1024):.2f} MB)...")
token = subprocess.check_output(['gh', 'auth', 'token'], text=True).strip()

upload_url = "https://uploads.github.com/repos/NamanGaonkar/VisionX-IDE/releases/436758797/assets?name=" + ZIP_PATH.name

with open(ZIP_PATH, 'rb') as f:
    data = f.read()

print(f"Uploading {len(data) / (1024*1024):.2f} MB to GitHub Release v1.2.0...")
req = urllib.request.Request(upload_url, data=data)
req.add_header('Authorization', f'Bearer {token}')
req.add_header('Content-Type', 'application/zip')
req.add_header('Content-Length', str(len(data)))

try:
    with urllib.request.urlopen(req, timeout=300) as resp:
        res_data = json.loads(resp.read().decode('utf-8'))
        print("Upload successful!")
        print("Asset URL:", res_data.get('browser_download_url'))
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode('utf-8'))
    sys.exit(1)
except Exception as e:
    print("Error during upload:", e)
    sys.exit(1)
