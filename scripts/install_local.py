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
print("     VisionX IDE v1.6.3 - Local Windows Re-installer ")
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
print("Copying fresh VisionX v1.6.3 binaries...")
shutil.copytree(DIST_DIR, INSTALL_DIR, dirs_exist_ok=True)
print("Binaries copied successfully.")

# 3. Clean any corrupted NLS / cache markers
appdata = Path(os.environ.get("APPDATA", ""))
clp_dir = appdata / "VisionX" / "clp"
if clp_dir.exists():
    try:
        shutil.rmtree(clp_dir)
        print("Cleared cached NLS markers from AppData/VisionX/clp.")
    except Exception:
        pass

# 4. Create Windows Shortcuts via PowerShell script
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

# 5. PATH Registration
print("Verifying User PATH...")
ps_path = f"""
$curr = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $curr.Contains('{str(BIN_PATH)}')) {{
    [Environment]::SetEnvironmentVariable('Path', $curr + ';{str(BIN_PATH)}', 'User')
}}
"""
subprocess.run(["powershell", "-NoProfile", "-Command", ps_path], capture_output=True, timeout=10)

# 6. Automatically migrate VS Code settings and extensions
print("Migrating Visual Studio Code settings and extensions to VisionX...")
userprofile = Path(os.environ.get("USERPROFILE", ""))
vscode_user = appdata / "Code" / "User"
visionx_user_targets = [
    appdata / "VisionX" / "User",
    appdata / ".visionx" / "User",
    userprofile / ".visionx" / "User",
    userprofile / "VisionX" / "User"
]
vscode_ext = userprofile / ".vscode" / "extensions"
visionx_ext_targets = [
    userprofile / ".visionx" / "extensions",
    userprofile / "VisionX" / "extensions",
    appdata / "VisionX" / "extensions"
]

if vscode_user.exists():
    for target_user in visionx_user_targets:
        target_user.mkdir(parents=True, exist_ok=True)
        for fname in ["settings.json", "keybindings.json", "mcp.json", "chatLanguageModels.json", "tasks.json"]:
            src = vscode_user / fname
            dest = target_user / fname
            if src.exists():
                shutil.copy2(src, dest)
        snip_src = vscode_user / "snippets"
        if snip_src.exists():
            shutil.copytree(snip_src, target_user / "snippets", dirs_exist_ok=True)
    print("Migrated settings, keybindings, and snippets from VS Code to VisionX user profiles.")

if vscode_ext.exists():
    linked_exts = 0
    for target_ext in visionx_ext_targets:
        target_ext.mkdir(parents=True, exist_ok=True)
        ext_json = vscode_ext / "extensions.json"
        if ext_json.exists():
            shutil.copy2(ext_json, target_ext / "extensions.json")
        for item in vscode_ext.iterdir():
            if item.is_dir() and not item.name.startswith("."):
                dest_item = target_ext / item.name
                if not dest_item.exists():
                    res = subprocess.run(["cmd", "/c", "mklink", "/J", str(dest_item), str(item)], capture_output=True)
                    if res.returncode == 0:
                        linked_exts += 1
                    else:
                        try:
                            shutil.copytree(item, dest_item, dirs_exist_ok=True)
                            linked_exts += 1
                        except Exception:
                            pass
    print(f"Migrated and linked {linked_exts} extensions across VisionX target directories.")

print("==================================================")
print(" VisionX IDE v1.6.3 Installed Locally!            ")
print("==================================================")
