import os
import sys
import shutil
import zipfile
import json
import subprocess
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BUILD_DIR = BASE_DIR / "build"
DIST_DIR = BASE_DIR / "dist"
VISIONX_DIST = DIST_DIR / "VisionX-win32-x64"
ZIP_PATH = BUILD_DIR / "base-win32-x64.zip"
ICON_PATH = BUILD_DIR / "icons" / "visionx.ico"
LOGO_SVG_PATH = BASE_DIR / "src" / "branding" / "visionx-logo.svg"

print("==================================================")
print("     VisionX IDE v1.1.0 - Complete Engine Rebuild ")
print("==================================================")

# 1. Clean and extract
if VISIONX_DIST.exists():
    print(f"Cleaning existing dist directory: {VISIONX_DIST}...")
    shutil.rmtree(VISIONX_DIST)

VISIONX_DIST.mkdir(parents=True, exist_ok=True)
print(f"Extracting base engine from {ZIP_PATH}...")
with zipfile.ZipFile(ZIP_PATH, 'r') as z:
    z.extractall(VISIONX_DIST)
print("Extraction completed.")

# 2. Rename executable and binaries
old_exe = VISIONX_DIST / "VSCodium.exe"
new_exe = VISIONX_DIST / "VisionX.exe"
if old_exe.exists():
    print(f"Renaming {old_exe.name} -> {new_exe.name}...")
    old_exe.rename(new_exe)

# Rename CLI scripts in bin/
bin_dir = VISIONX_DIST / "bin"
if bin_dir.exists():
    for f in bin_dir.iterdir():
        if "codium" in f.name:
            new_name = f.name.replace("codium", "visionx")
            new_file = bin_dir / new_name
            try:
                content = f.read_text(encoding="utf-8", errors="ignore")
                content = content.replace("VSCodium.exe", "VisionX.exe")
                content = content.replace("VSCodium", "VisionX")
                content = content.replace("codium", "visionx")
                f.write_text(content, encoding="utf-8")
            except Exception:
                pass
            f.rename(new_file)

# 3. Patch resources/app/product.json
product_json_path = VISIONX_DIST / "resources" / "app" / "product.json"
if product_json_path.exists():
    print("Patching product.json branding...")
    with open(product_json_path, "r", encoding="utf-8") as f:
        product = json.load(f)

    product["nameShort"] = "VisionX"
    product["nameLong"] = "VisionX IDE"
    product["applicationName"] = "visionx"
    product["win32AppUserModelId"] = "VisionX.VisionXIDE"
    product["win32MutexName"] = "visionx"
    product["urlProtocol"] = "visionx"
    product["dataFolderName"] = ".visionx"
    product["serverApplicationName"] = "visionx-server"
    product["reportIssueUrl"] = "https://github.com/NamanGaonkar/VisionX-IDE/issues"
    product["licenseUrl"] = "https://github.com/NamanGaonkar/VisionX-IDE/blob/main/LICENSE"
    
    product["extensionsGallery"] = {
        "serviceUrl": "https://open-vsx.org/vscode/gallery",
        "itemUrl": "https://open-vsx.org/vscode/item",
        "latestUrlTemplate": "https://open-vsx.org/vscode/gallery/{publisher}/{name}/latest",
        "controlUrl": "https://raw.githubusercontent.com/EclipseFdn/publish-extensions/refs/heads/master/extension-control/extensions.json"
    }

    if "configurationDefaults" not in product:
        product["configurationDefaults"] = {}
    product["configurationDefaults"]["workbench.colorTheme"] = "VisionX Liquid Glass"
    product["configurationDefaults"]["telemetry.telemetryLevel"] = "off"
    product["configurationDefaults"]["workbench.startupEditor"] = "welcomePage"
    product["configurationDefaults"]["window.titleBarStyle"] = "custom"
    product["configurationDefaults"]["window.menuBarVisibility"] = "classic"
    product["configurationDefaults"]["workbench.layoutControl.enabled"] = True

    with open(product_json_path, "w", encoding="utf-8") as f:
        json.dump(product, f, indent=2)
    print("product.json updated successfully.")

# 4. Patch resources/app/package.json
pkg_json_path = VISIONX_DIST / "resources" / "app" / "package.json"
if pkg_json_path.exists():
    print("Patching package.json metadata...")
    with open(pkg_json_path, "r", encoding="utf-8") as f:
        pkg = json.load(f)
    pkg["name"] = "visionx"
    pkg["description"] = "VisionX - Next-Gen Autonomous AI & Spatial IDE"
    pkg["author"] = {"name": "VisionX Contributors"}
    with open(pkg_json_path, "w", encoding="utf-8") as f:
        json.dump(pkg, f, indent=2)

# 5. Replace resource icons
res_win32 = VISIONX_DIST / "resources" / "app" / "resources" / "win32"
if res_win32.exists():
    print("Injecting custom VisionX icons into resources...")
    shutil.copy(ICON_PATH, res_win32 / "code.ico")
    shutil.copy(ICON_PATH, res_win32 / "default.ico")
    
    png_128 = BUILD_DIR / "icons" / "visionx_128.png"
    if png_128.exists():
        shutil.copy(png_128, res_win32 / "code_150x150.png")
        shutil.copy(png_128, res_win32 / "code_70x70.png")

# 6. Replace ALL blue SVGs (titlebar, welcome, letterpress watermark) with VisionX Logo SVG
if LOGO_SVG_PATH.exists():
    print("Replacing all legacy blue SVGs with official VisionX Logo SVG...")
    logo_svg = LOGO_SVG_PATH.read_text(encoding="utf-8")
    replaced_count = 0
    for root, dirs, files in os.walk(VISIONX_DIST):
        for f in files:
            if f.endswith(".svg"):
                p = Path(root) / f
                try:
                    txt = p.read_text(encoding="utf-8", errors="ignore")
                    if "78AEED" in txt or "path6008" in txt or f in ["code-icon.svg", "vscode-icon.svg"]:
                        p.write_text(logo_svg, encoding="utf-8")
                        replaced_count += 1
                except Exception:
                    pass
    print(f"Replaced {replaced_count} legacy SVGs with VisionX glowing SVG logo.")

# 7. Inject custom extensions (Theme & AI Assistant)
ext_dir = VISIONX_DIST / "resources" / "app" / "extensions"
if ext_dir.exists():
    print("Installing built-in VisionX Liquid Glass Theme...")
    target_theme = ext_dir / "visionx-theme-liquid-glass"
    if target_theme.exists():
        shutil.rmtree(target_theme)
    shutil.copytree(BASE_DIR / "src" / "theme", target_theme)

    print("Installing built-in VisionX AI Core Extension...")
    target_ai = ext_dir / "visionx-ai-core"
    if target_ai.exists():
        shutil.rmtree(target_ai)
    shutil.copytree(BASE_DIR / "src" / "ai-assistant", target_ai)

# 8. Inject Liquid Glass CSS into workbench stylesheet (With Rounded Corners & Solid Non-Bleed Titlebar)
css_path = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "workbench" / "workbench.desktop.main.css"
if css_path.exists():
    print("Injecting signature Liquid Glass CSS (rounded corners, solid titlebar, glowing symmetry)...")
    glass_css = """
/* ======================================================== */
/* VisionX Liquid Glass Symmetrical Aesthetics (v1.1.0)     */
/* ======================================================== */
:root {
  --visionx-accent: #ff5500;
  --visionx-accent-glow: rgba(255, 85, 0, 0.4);
  --visionx-gold: #ffaa00;
  --visionx-bg: #07090e;
}

/* OPAQUE, SOLID TITLE BAR - NO CONTENT BLEED */
.monaco-workbench .part.titlebar {
  background: #07090e !important;
  border-bottom: 1px solid rgba(255, 85, 0, 0.25) !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6) !important;
  height: 38px !important;
  z-index: 100 !important;
}

.monaco-workbench .part.titlebar .menubar {
  display: flex !important;
  align-items: center !important;
  gap: 3px !important;
}

.monaco-workbench .part.titlebar .menubar .menubar-menu-button {
  border-radius: 8px !important;
  padding: 4px 8px !important;
  margin: 0 1px !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench .part.titlebar .menubar .menubar-menu-button.open {
  background: rgba(255, 85, 0, 0.2) !important;
  color: #ffaa00 !important;
}

/* Rounded Symmetrical Search Center */
.monaco-workbench .part.titlebar .command-center {
  border-radius: 12px !important;
  background: rgba(255, 85, 0, 0.08) !important;
  border: 1px solid rgba(255, 85, 0, 0.22) !important;
  transition: all 0.25s ease !important;
}

.monaco-workbench .part.titlebar .command-center:hover {
  border-color: #ff5500 !important;
  box-shadow: 0 0 12px rgba(255, 85, 0, 0.3) !important;
}

/* Activity Bar & Sidebars */
.monaco-workbench .part.activitybar {
  background: #05060a !important;
  border-right: 1px solid rgba(255, 85, 0, 0.15) !important;
}

.monaco-workbench .part.activitybar .action-item {
  border-radius: 10px !important;
  margin: 4px 2px !important;
}

.monaco-workbench .part.sidebar {
  background: #080a10 !important;
  border-right: 1px solid rgba(255, 85, 0, 0.15) !important;
}

.monaco-workbench .part.statusbar {
  background: #05060a !important;
  border-top: 1px solid rgba(255, 85, 0, 0.25) !important;
  box-shadow: 0 -2px 10px rgba(255, 85, 0, 0.08) !important;
}

/* Rounded Symmetrical Editor Tabs */
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  border-radius: 10px 10px 0 0 !important;
  margin: 4px 2px 0 2px !important;
  border-right: none !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
  background: #0f121d !important;
  border-bottom: 2px solid #ff5500 !important;
  box-shadow: 0 0 14px rgba(255, 85, 0, 0.25), inset 0 2px 0 #ff6600 !important;
}

/* Glowing cursor & focus halos */
.monaco-editor .cursor {
  background-color: #ff6600 !important;
  box-shadow: 0 0 8px #ff6600, 0 0 16px rgba(255, 102, 0, 0.75) !important;
}

/* Rounded Popups, Menus & Dialogs */
.monaco-menu .monaco-action-bar,
.monaco-workbench .quick-input-widget,
.monaco-workbench .editor-widget {
  border-radius: 12px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 85, 0, 0.3) !important;
  box-shadow: 0 12px 36px rgba(0,0,0,0.7), 0 0 18px rgba(255, 85, 0, 0.15) !important;
}

/* Rounded Sleek Scrollbars */
.monaco-scrollable-element > .scrollbar > .slider {
  background: rgba(255, 85, 0, 0.2) !important;
  border-radius: 8px !important;
}
.monaco-scrollable-element > .scrollbar > .slider:hover {
  background: rgba(255, 85, 0, 0.45) !important;
}
"""
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + glass_css)

# 9. Use rcedit to patch VisionX.exe binary icon and metadata
rcedit_path = shutil.which("rcedit") or "rcedit.exe"
print(f"Patching executable with rcedit ({rcedit_path})...")
try:
    cmd = [
        rcedit_path,
        str(new_exe),
        "--set-icon", str(ICON_PATH),
        "--set-version-string", "FileDescription", "VisionX IDE",
        "--set-version-string", "ProductName", "VisionX IDE",
        "--set-version-string", "CompanyName", "VisionX Technologies",
        "--set-version-string", "LegalCopyright", "Copyright (C) 2026 VisionX Contributors",
        "--set-version-string", "InternalName", "VisionX",
        "--set-version-string", "OriginalFilename", "VisionX.exe"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("VisionX.exe PE metadata and custom icon applied successfully!")
    else:
        print("rcedit note:", res.stderr or res.stdout)
except Exception as e:
    print("Could not run rcedit:", e)

print("==================================================")
print(" VisionX IDE v1.1.0 build completed successfully! ")
print("==================================================")
