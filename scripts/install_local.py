import os
import sys
import shutil
import subprocess
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist" / "VisionX-win32-x64"
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
INSTALL_DIR = Path(LOCAL_APP_DATA) / "Programs" / "VisionX"
ICON_PATH = INSTALL_DIR / "resources" / "app" / "resources" / "win32" / "code.ico"
EXE_PATH = INSTALL_DIR / "VisionX.exe"
BIN_PATH = INSTALL_DIR / "bin"

print("==================================================")
print("     VisionX IDE - Local Windows Re-installer     ")
print("==================================================")

if not DIST_DIR.exists():
    print(f"Error: Dist directory {DIST_DIR} not found. Run build_visionx.py first!")
    sys.exit(1)

# 1. Terminate any running VisionX instances
print("Ensuring VisionX is completely stopped...")
subprocess.run(["taskkill", "/F", "/IM", "VisionX.exe"], capture_output=True)
time.sleep(1)

# 2. Clean install directory
print(f"Installing to: {INSTALL_DIR}")
if INSTALL_DIR.exists():
    try:
        shutil.rmtree(INSTALL_DIR)
    except Exception as e:
        print(f"Note during cleanup: {e}")

INSTALL_DIR.mkdir(parents=True, exist_ok=True)
print("Copying fresh VisionX v1.1.0 binaries...")
shutil.copytree(DIST_DIR, INSTALL_DIR, dirs_exist_ok=True)
print("Binaries copied successfully.")

# 3. Create Windows Shortcuts via PowerShell script
desktop = Path.home() / "Desktop"
desktop_lnk = desktop / "VisionX.lnk"
start_menu = Path(os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming"))) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
start_menu_lnk = start_menu / "VisionX.lnk"

print("Creating Desktop & Start Menu shortcuts...")
ps_cmd = f"""
$WshShell = New-Object -ComObject WScript.Shell
$DesktopLnk = $WshShell.CreateShortcut('{desktop_lnk}')
$DesktopLnk.TargetPath = '{EXE_PATH}'
$DesktopLnk.IconLocation = '{ICON_PATH},0'
$DesktopLnk.Description = 'VisionX IDE'
$DesktopLnk.WorkingDirectory = '{INSTALL_DIR}'
$DesktopLnk.Save()

$StartLnk = $WshShell.CreateShortcut('{start_menu_lnk}')
$StartLnk.TargetPath = '{EXE_PATH}'
$StartLnk.IconLocation = '{ICON_PATH},0'
$StartLnk.Description = 'VisionX IDE'
$StartLnk.WorkingDirectory = '{INSTALL_DIR}'
$StartLnk.Save()
"""
subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True, timeout=15)

# 4. PATH Registration
print("Verifying User PATH...")
ps_path = f"""
$curr = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $curr.Contains('{str(BIN_PATH)}')) {{
    [Environment]::SetEnvironmentVariable('Path', $curr + ';{str(BIN_PATH)}', 'User')
}}
"""
subprocess.run(["powershell", "-NoProfile", "-Command", ps_path], capture_output=True, timeout=10)

print("==================================================")
print(" VisionX IDE v1.1.0 Installed Locally!            ")
print("==================================================")
