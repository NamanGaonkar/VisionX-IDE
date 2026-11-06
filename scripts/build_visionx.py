import os
import sys
import shutil
import zipfile
import json
import subprocess
import hashlib
import base64
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
BUILD_DIR = BASE_DIR / "build"
DIST_DIR = BASE_DIR / "dist"
VISIONX_DIST = DIST_DIR / "VisionX-win32-x64"
ZIP_PATH = BUILD_DIR / "base-win32-x64.zip"
ICON_PATH = BUILD_DIR / "icons" / "visionx.ico"
LOGO_SVG_PATH = BASE_DIR / "src" / "branding" / "visionx-logo.svg"

print("==================================================")
print("     VisionX IDE v1.3.0 - Complete Engine Rebuild ")
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
        "serviceUrl": "https://marketplace.visualstudio.com/_apis/public/gallery",
        "itemUrl": "https://marketplace.visualstudio.com/items",
        "cacheUrl": "https://vscode.blob.core.windows.net/gallery/index"
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

# 8. Inject Theme-Compatible Liquid Glass CSS into workbench stylesheet
css_path = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "workbench" / "workbench.desktop.main.css"
if css_path.exists():
    print("Injecting theme-compatible Liquid Glass CSS (rounded corners, solid titlebar, dynamic theme colors)...")
    glass_css = """
/* ======================================================== */
/* VisionX Symmetrical Geometry & Fluid Aesthetics (v1.2.0)  */
/* Fully Theme-Compatible: Uses active theme CSS variables  */
/* ======================================================== */

/* OPAQUE, SOLID TITLE BAR - NO CONTENT BLEED */
.monaco-workbench .part.titlebar {
  background-color: var(--vscode-titleBar-activeBackground) !important;
  color: var(--vscode-titleBar-activeForeground) !important;
  border-bottom: 1px solid var(--vscode-titleBar-border, rgba(128, 128, 128, 0.2)) !important;
  height: 38px !important;
  z-index: 100 !important;
}

.monaco-workbench .part.titlebar .menubar {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
}

.monaco-workbench .part.titlebar .menubar .menubar-menu-button {
  border-radius: 6px !important;
  padding: 4px 8px !important;
  margin: 0 1px !important;
  transition: all 0.15s ease !important;
}

.monaco-workbench .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench .part.titlebar .menubar .menubar-menu-button.open {
  background: var(--vscode-toolbar-hoverBackground, rgba(128, 128, 128, 0.15)) !important;
}

/* Rounded Symmetrical Search Command Center */
.monaco-workbench .part.titlebar .command-center {
  border-radius: 8px !important;
  background: var(--vscode-commandCenter-background, rgba(128, 128, 128, 0.08)) !important;
  border: 1px solid var(--vscode-commandCenter-border, rgba(128, 128, 128, 0.2)) !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench .part.titlebar .command-center:hover {
  border-color: var(--vscode-commandCenter-activeBorder, var(--vscode-focusBorder, #ff5500)) !important;
}

/* Activity Bar Items: Smooth Rounded Pills */
.monaco-workbench .part.activitybar .action-item {
  border-radius: 8px !important;
  margin: 4px 2px !important;
}

/* Rounded Symmetrical Editor Tabs */
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  border-radius: 8px 8px 0 0 !important;
  margin: 2px 2px 0 2px !important;
  border-right: none !important;
  transition: all 0.15s ease !important;
}

/* Rounded Popups, Quick Inputs & Dialog Widgets */
.monaco-menu .monaco-action-bar,
.monaco-workbench .quick-input-widget,
.monaco-workbench .editor-widget {
  border-radius: 10px !important;
  overflow: hidden !important;
  border: 1px solid var(--vscode-widget-border, rgba(128, 128, 128, 0.25)) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35) !important;
}

/* Rounded Sleek Scrollbars */
.monaco-scrollable-element > .scrollbar > .slider {
  border-radius: 6px !important;
}
"""
    with open(css_path, "a", encoding="utf-8") as f:
        f.write("\n" + glass_css)

# 8b. Neutralize installation corrupt/tamper integrity check and update checksums
print("Neutralizing integrity checks and updating product checksums...")
app_out = VISIONX_DIST / "resources" / "app" / "out"
js_files_to_patch = [
    app_out / "vs" / "workbench" / "workbench.desktop.main.js",
    app_out / "vs" / "sessions" / "sessions.desktop.main.js"
]
for p in js_files_to_patch:
    if p.exists():
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            target_str = "async _isPure(){let o=this.productService.checksums"
            if target_str in txt:
                txt = txt.replace(target_str, "async _isPure(){return{isPure:true,proof:[]};let o=this.productService.checksums")
                p.write_text(txt, encoding="utf-8")
                print(f"Patched _isPure() in {p.name}")
        except Exception as e:
            print(f"Note patching {p.name}: {e}")

# Recalculate and update all file checksums in product.json
if product_json_path.exists():
    with open(product_json_path, "r", encoding="utf-8") as f:
        prod = json.load(f)
    if "checksums" in prod:
        for rel_path in list(prod["checksums"].keys()):
            full_p = app_out / rel_path
            if full_p.exists():
                data = full_p.read_bytes()
                h = hashlib.sha256(data).digest()
                b64 = base64.b64encode(h).decode("utf-8").rstrip("=")
                prod["checksums"][rel_path] = b64
        with open(product_json_path, "w", encoding="utf-8") as f:
            json.dump(prod, f, indent=2)
        print("Updated product.json checksums with fresh SHA-256 digests.")

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
print(" VisionX IDE v1.3.0 build completed successfully! ")
print("==================================================")
