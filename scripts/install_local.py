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
print("     VisionX IDE v1.7.5 - Local Windows Re-installer ")
print("==================================================")

if not DIST_DIR.exists():
    print(f"Error: Dist directory {DIST_DIR} not found. Run build_visionx.py first!")
    sys.exit(1)

# 1. Terminate any running VisionX instances
print("Ensuring VisionX is completely stopped...")
subprocess.run(["taskkill", "/F", "/IM", "VisionX.exe", "/T"], capture_output=True)
time.sleep(1)

# 2. Clean install directory
print(f"Installing to: {INSTALL_DIR}")
if INSTALL_DIR.exists():
    try:
        shutil.rmtree(INSTALL_DIR)
    except Exception as e:
        print(f"Note during cleanup: {e}")

INSTALL_DIR.mkdir(parents=True, exist_ok=True)
print("Copying fresh VisionX v1.7.5 binaries...")
shutil.copytree(DIST_DIR, INSTALL_DIR, dirs_exist_ok=True)
print("Binaries copied successfully.")

# 3. Clean any corrupted NLS / cache markers and stale Windows Jump List caches
appdata = Path(os.environ.get("APPDATA", ""))
clp_dir = appdata / "VisionX" / "clp"
if clp_dir.exists():
    try:
        shutil.rmtree(clp_dir)
        print("Cleared cached NLS markers from AppData/VisionX/clp.")
    except Exception:
        pass

# Clean stale Windows Jump List destination files referencing --agents or Agents Window or sessions.ico
appdata_recent = appdata / "Microsoft" / "Windows" / "Recent"
for d in ["CustomDestinations", "AutomaticDestinations"]:
    folder = appdata_recent / d
    if folder.exists():
        for f in folder.iterdir():
            try:
                content = f.read_bytes()
                if (b"--agents" in content or "Agents Window".encode("utf-16le") in content 
                    or b"sessions.ico" in content or "1ced32d74a95c7bc" in f.name or "437bf6a9c72f8612" in f.name):
                    f.unlink(missing_ok=True)
                    print(f"Purged stale jump list cache: {f.name}")
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

# Also update pinned taskbar shortcuts
taskbar_pins = appdata / "Microsoft" / "Internet Explorer" / "Quick Launch" / "User Pinned" / "TaskBar"
if taskbar_pins.exists():
    for lnk_name in ["VisionX IDE.lnk", "VisionX.lnk"]:
        t_lnk = taskbar_pins / lnk_name
        if t_lnk.exists():
            ps_taskbar = f"""
$WshShell = New-Object -ComObject WScript.Shell
$Lnk = $WshShell.CreateShortcut('{t_lnk}')
$Lnk.TargetPath = '{EXE_PATH}'
$Lnk.IconLocation = '{ICON_PATH},0'
$Lnk.Description = 'VisionX IDE'
$Lnk.WorkingDirectory = '{INSTALL_DIR}'
$Lnk.Save()
"""
            subprocess.run(["powershell", "-NoProfile", "-Command", ps_taskbar], capture_output=True, timeout=10)
            print(f"Updated pinned taskbar shortcut: {lnk_name}")

# 5. PATH Registration
print("Verifying User PATH...")
ps_path = f"""
$curr = [Environment]::GetEnvironmentVariable('Path', 'User')
if (-not $curr.Contains('{str(BIN_PATH)}')) {{
    [Environment]::SetEnvironmentVariable('Path', $curr + ';{str(BIN_PATH)}', 'User')
}}
"""
subprocess.run(["powershell", "-NoProfile", "-Command", ps_path], capture_output=True, timeout=10)

# 6. Clean redundant junction loops and migrate VS Code settings cleanly
print("Migrating Visual Studio Code settings cleanly to VisionX...")
userprofile = Path(os.environ.get("USERPROFILE", ""))
vscode_user = appdata / "Code" / "User"
visionx_user_targets = [
    appdata / "VisionX" / "User",
    userprofile / ".visionx" / "User"
]

# Ensure VisionX extensions directory links cleanly to ~/.vscode/extensions so all installed extensions resolve with zero missing file errors
vscode_ext_dir = userprofile / ".vscode" / "extensions"
visionx_ext_dir = userprofile / "VisionX" / "extensions"
if vscode_ext_dir.exists():
    if not visionx_ext_dir.exists():
        visionx_ext_dir.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["cmd", "/c", "mklink", "/J", str(visionx_ext_dir), str(vscode_ext_dir)], capture_output=True)
        print("Created directory junction: VisionX\\extensions -> .vscode\\extensions")
    else:
        print("Directory junction VisionX\\extensions verified.")

if vscode_user.exists():
    best_settings = vscode_user / "settings.json"
    bak_candidates = sorted(vscode_user.glob("settings.json.*.bak"), key=lambda f: f.stat().st_size, reverse=True)
    if bak_candidates and (not best_settings.exists() or best_settings.stat().st_size < bak_candidates[0].stat().st_size):
        best_settings = bak_candidates[0]
        print(f"Restoring rich settings from backup: {best_settings.name} ({best_settings.stat().st_size} bytes)")
        try:
            shutil.copy2(best_settings, vscode_user / "settings.json")
        except Exception:
            pass

    for target_user in visionx_user_targets:
        target_user.mkdir(parents=True, exist_ok=True)
        for fname in ["settings.json", "keybindings.json", "mcp.json", "chatLanguageModels.json", "tasks.json"]:
            if fname == "settings.json" and best_settings.exists():
                shutil.copy2(best_settings, target_user / fname)
            else:
                src = vscode_user / fname
                dest = target_user / fname
                if src.exists():
                    shutil.copy2(src, dest)
        snip_src = vscode_user / "snippets"
        if snip_src.exists():
            shutil.copytree(snip_src, target_user / "snippets", dirs_exist_ok=True)
    print("Migrated settings, keybindings, and snippets from VS Code to VisionX user profiles.")

print("==================================================")
print(" VisionX IDE v1.7.5 Installed Locally!            ")
print("==================================================")
