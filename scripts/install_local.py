import os
import sys
import shutil
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DIST_DIR = BASE_DIR / "dist" / "VisionX-win32-x64"
LOCAL_APP_DATA = os.environ.get("LOCALAPPDATA", str(Path.home() / "AppData" / "Local"))
INSTALL_DIR = Path(LOCAL_APP_DATA) / "Programs" / "VisionX"
ICON_PATH = INSTALL_DIR / "resources" / "app" / "resources" / "win32" / "code.ico"
EXE_PATH = INSTALL_DIR / "VisionX.exe"
BIN_PATH = INSTALL_DIR / "bin"

print("==================================================")
print("       VisionX IDE - Local Windows Installer      ")
print("==================================================")

if not DIST_DIR.exists():
    print(f"Error: Dist directory {DIST_DIR} not found. Run build_visionx.py first!")
    sys.exit(1)

print(f"Target Installation Directory: {INSTALL_DIR}")
if INSTALL_DIR.exists():
    print("Updating existing VisionX installation...")
    # Kill any running VisionX instance before copying
    subprocess.run(["taskkill", "/F", "/IM", "VisionX.exe"], capture_output=True)
    try:
        shutil.rmtree(INSTALL_DIR)
    except Exception as e:
        print(f"Warning during directory cleanup: {e}")

INSTALL_DIR.mkdir(parents=True, exist_ok=True)
print("Copying VisionX binaries and assets...")
shutil.copytree(DIST_DIR, INSTALL_DIR, dirs_exist_ok=True)
print("Binaries copied successfully.")

# Windows Shortcut creation via PowerShell
def create_shortcut(target, link_path, icon_location, description="VisionX IDE"):
    ps_cmd = f"""
    $WshShell = New-Object -comObject WScript.Shell
    $Shortcut = $WshShell.CreateShortcut('{link_path}')
    $Shortcut.TargetPath = '{target}'
    $Shortcut.IconLocation = '{icon_location},0'
    $Shortcut.Description = '{description}'
    $Shortcut.WorkingDirectory = '{target.parent}'
    $Shortcut.Save()
    """
    subprocess.run(["powershell", "-NoProfile", "-Command", ps_cmd], capture_output=True)

desktop = Path.home() / "Desktop"
desktop_lnk = desktop / "VisionX.lnk"
print(f"Creating Desktop shortcut: {desktop_lnk}...")
create_shortcut(EXE_PATH, desktop_lnk, ICON_PATH)

start_menu = Path(os.environ.get("APPDATA", str(Path.home() / "AppData" / "Roaming"))) / "Microsoft" / "Windows" / "Start Menu" / "Programs"
start_menu_lnk = start_menu / "VisionX.lnk"
print(f"Creating Start Menu shortcut: {start_menu_lnk}...")
create_shortcut(EXE_PATH, start_menu_lnk, ICON_PATH)

# Register PATH in HKCU Environment
print("Registering VisionX CLI in User PATH...")
ps_path_cmd = f"""
$currentPath = [Environment]::GetEnvironmentVariable('Path', [EnvironmentVariableTarget]::User)
if (-not $currentPath.Contains('{str(BIN_PATH)}')) {{
    [Environment]::SetEnvironmentVariable('Path', $currentPath + ';{str(BIN_PATH)}', [EnvironmentVariableTarget]::User)
}}
"""
subprocess.run(["powershell", "-NoProfile", "-Command", ps_path_cmd], capture_output=True)

# Register Context Menu "Open with VisionX"
print("Registering Windows File Explorer context menu 'Open with VisionX'...")
reg_script = f"""
$icon = '{str(EXE_PATH)},0'
$cmd = '"{str(EXE_PATH)}" "%1"'
$dirCmd = '"{str(EXE_PATH)}" "%V"'

# File context menu
New-Item -Path "HKCU:\\Software\\Classes\\*\\shell\\VisionX" -Force -Value "Open with VisionX" | Out-Null
Set-ItemProperty -Path "HKCU:\\Software\\Classes\\*\\shell\\VisionX" -Name "Icon" -Value $icon
New-Item -Path "HKCU:\\Software\\Classes\\*\\shell\\VisionX\\command" -Force -Value $cmd | Out-Null

# Folder context menu
New-Item -Path "HKCU:\\Software\\Classes\\Directory\\shell\\VisionX" -Force -Value "Open with VisionX" | Out-Null
Set-ItemProperty -Path "HKCU:\\Software\\Classes\\Directory\\shell\\VisionX" -Name "Icon" -Value $icon
New-Item -Path "HKCU:\\Software\\Classes\\Directory\\shell\\VisionX\\command" -Force -Value $dirCmd | Out-Null

# Directory Background context menu
New-Item -Path "HKCU:\\Software\\Classes\\Directory\\Background\\shell\\VisionX" -Force -Value "Open with VisionX" | Out-Null
Set-ItemProperty -Path "HKCU:\\Software\\Classes\\Directory\\Background\\shell\\VisionX" -Name "Icon" -Value $icon
New-Item -Path "HKCU:\\Software\\Classes\\Directory\\Background\\shell\\VisionX\\command" -Force -Value $dirCmd | Out-Null
"""
subprocess.run(["powershell", "-NoProfile", "-Command", reg_script], capture_output=True)

print("==================================================")
print("  VisionX IDE Installed Successfully on Windows!  ")
print(f"  App Path: {EXE_PATH}                           ")
print("  Desktop & Start Menu shortcuts ready.          ")
print("  CLI command 'visionx' registered in PATH.      ")
print("==================================================")
