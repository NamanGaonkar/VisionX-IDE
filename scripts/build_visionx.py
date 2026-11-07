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
print("     VisionX IDE v1.6.5 - Engine Rebuild & Polish ")
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
    product["dataFolderName"] = "VisionX"
    product["serverApplicationName"] = "visionx-server"
    product["reportIssueUrl"] = "https://github.com/NamanGaonkar/VisionX-IDE/issues"
    product["licenseUrl"] = "https://github.com/NamanGaonkar/VisionX-IDE/blob/main/LICENSE"
    product["checksums"] = {}
    product["checksumFailMoreInfoUrl"] = ""
    
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
    product["configurationDefaults"]["window.commandCenter"] = True
    product["configurationDefaults"]["workbench.layoutControl.enabled"] = True
    product["configurationDefaults"]["chat.agent.enabled"] = False
    product["configurationDefaults"]["chat.tips.enabled"] = False
    product["configurationDefaults"]["chat.agent.tips.enabled"] = False

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
    shutil.copy(ICON_PATH, res_win32 / "sessions.ico")
    
    png_128 = BUILD_DIR / "icons" / "visionx_128.png"
    if png_128.exists():
        shutil.copy(png_128, res_win32 / "code_150x150.png")
        shutil.copy(png_128, res_win32 / "code_70x70.png")

# 6. Replace ALL blue SVGs with VisionX Logo SVG
logo_svg = ""
logo_b64_url = ""
if LOGO_SVG_PATH.exists():
    print("Replacing all legacy blue SVGs with official VisionX Logo SVG...")
    logo_svg = LOGO_SVG_PATH.read_text(encoding="utf-8")
    b64_logo = base64.b64encode(LOGO_SVG_PATH.read_bytes()).decode("utf-8")
    logo_b64_url = f"data:image/svg+xml;base64,{b64_logo}"
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

# 8. macOS-Style Traffic Light Window Controls CSS matching uploaded image
traffic_light_css = f"""
/* ======================================================== */
/* macOS-Style Traffic Light Window Controls                */
/* Red (Close) -> Yellow (Minimize) -> Green (Maximize)     */
/* Strictly matching user reference: pure circles, no icons */
/* ======================================================== */
.monaco-workbench.windows:not(.web) .part.titlebar .window-controls-container,
.monaco-workbench.windows:not(.web) .part.titlebar .titlebar-container .window-controls-container,
.monaco-workbench .part.titlebar .window-controls-container,
.monaco-workbench .window-controls-container,
.window-controls-container {{
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: center !important;
  gap: 8px !important;
  padding: 0 14px !important;
  width: auto !important;
  min-width: 76px !important;
  max-width: 90px !important;
  height: 100% !important;
  -webkit-app-region: no-drag !important;
}}

.monaco-workbench.windows:not(.web) .part.titlebar .window-controls-container > .window-icon,
.monaco-workbench .part.titlebar .window-controls-container > .window-icon,
.monaco-workbench .window-controls-container > .window-icon,
.window-icon.window-minimize,
.window-icon.window-max-restore,
.window-icon.window-close {{
  width: 12px !important;
  height: 12px !important;
  min-width: 12px !important;
  max-width: 12px !important;
  min-height: 12px !important;
  max-height: 12px !important;
  border-radius: 50% !important;
  margin: 0 !important;
  padding: 0 !important;
  font-size: 0px !important;
  line-height: 0px !important;
  color: transparent !important;
  cursor: pointer !important;
  display: inline-block !important;
  box-sizing: border-box !important;
  -webkit-app-region: no-drag !important;
  transition: transform 0.15s ease, filter 0.15s ease !important;
  position: relative !important;
}}

/* Remove any default Windows icons or glyphs inside circles */
.monaco-workbench .part.titlebar .window-controls-container > .window-icon::before,
.monaco-workbench .part.titlebar .window-controls-container > .window-icon::after,
.window-icon.window-minimize::before,
.window-icon.window-minimize::after,
.window-icon.window-max-restore::before,
.window-icon.window-max-restore::after,
.window-icon.window-close::before,
.window-icon.window-close::after,
.codicon-chrome-minimize:before,
.codicon-chrome-maximize:before,
.codicon-chrome-restore:before,
.codicon-chrome-close:before {{
  content: "" !important;
  display: none !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
  font-size: 0px !important;
  visibility: hidden !important;
}}

/* Red (Close) */
.monaco-workbench .window-controls-container > .window-icon.window-close,
.window-icon.window-close {{
  order: 1 !important;
  background-color: #ff5f56 !important;
  border: 1px solid #e0443e !important;
  box-shadow: 0 0 3px rgba(255, 95, 86, 0.4) !important;
}}
.monaco-workbench .window-controls-container > .window-icon.window-close:hover,
.window-icon.window-close:hover {{
  background-color: #ff3b30 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}}

/* Yellow (Minimize) */
.monaco-workbench .window-controls-container > .window-icon.window-minimize,
.window-icon.window-minimize {{
  order: 2 !important;
  background-color: #ffbd2e !important;
  border: 1px solid #dea123 !important;
  box-shadow: 0 0 3px rgba(255, 189, 46, 0.4) !important;
}}
.monaco-workbench .window-controls-container > .window-icon.window-minimize:hover,
.window-icon.window-minimize:hover {{
  background-color: #ffaa00 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}}

/* Green (Maximize / Restore) */
.monaco-workbench .window-controls-container > .window-icon.window-max-restore,
.window-icon.window-max-restore {{
  order: 3 !important;
  background-color: #27c93f !important;
  border: 1px solid #1aab29 !important;
  box-shadow: 0 0 3px rgba(39, 201, 63, 0.4) !important;
}}
.monaco-workbench .window-controls-container > .window-icon.window-max-restore:hover,
.window-icon.window-max-restore:hover {{
  background-color: #20b034 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}}

/* Replace titlebar window appicon with glowing VisionX Logo */
.monaco-workbench .part.titlebar .window-appicon,
.monaco-workbench .part.titlebar > .titlebar-container > .titlebar-left > .window-appicon,
.window-appicon {{
  background-image: url("{logo_b64_url}") !important;
  background-repeat: no-repeat !important;
  background-position: center center !important;
  background-size: 18px !important;
  width: 35px !important;
}}

.monaco-workbench .part.titlebar .window-appicon::before,
.monaco-workbench .part.titlebar .window-appicon::after,
.window-appicon::before,
.window-appicon::after,
.codicon-vscode::before {{
  content: "" !important;
  display: none !important;
}}
"""

glass_css = """
/* ======================================================== */
/* VisionX Theme System: Dark Obsidian & Frosted White      */
/* Cohesive workbench aesthetics for both light & dark      */
/* ======================================================== */

/* --- DARK OBSIDIAN WORKBENCH RULES --- */
.monaco-workbench.vs-dark,
.monaco-workbench.hc-black {
  background-color: #07090e !important;
}

.monaco-workbench.vs-dark .part.titlebar,
.monaco-workbench.hc-black .part.titlebar {
  background-color: #0c0f18 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
  height: 38px !important;
  z-index: 100 !important;
  color: #d8e0f0 !important;
}

.monaco-workbench.vs-dark .part.titlebar .menubar,
.monaco-workbench.hc-black .part.titlebar .menubar {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
}

.monaco-workbench.vs-dark .part.titlebar .menubar .menubar-menu-button,
.monaco-workbench.hc-black .part.titlebar .menubar .menubar-menu-button {
  border-radius: 6px !important;
  padding: 4px 8px !important;
  margin: 0 1px !important;
  transition: all 0.15s ease !important;
  color: #ccd5e6 !important;
}

.monaco-workbench.vs-dark .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench.hc-black .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench.vs-dark .part.titlebar .menubar .menubar-menu-button.open,
.monaco-workbench.hc-black .part.titlebar .menubar .menubar-menu-button.open {
  background: rgba(255, 255, 255, 0.08) !important;
}

.monaco-workbench.vs-dark .part.titlebar .command-center,
.monaco-workbench.hc-black .part.titlebar .command-center {
  border-radius: 8px !important;
  background: #121624 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  color: #ccd5e6 !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench.vs-dark .part.titlebar .command-center:hover,
.monaco-workbench.hc-black .part.titlebar .command-center:hover {
  border-color: #ff5500 !important;
  background: #171c2e !important;
}

.monaco-workbench.vs-dark .part.activitybar,
.monaco-workbench.hc-black .part.activitybar {
  background-color: #090b12 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench.vs-dark .part.activitybar .action-item,
.monaco-workbench.hc-black .part.activitybar .action-item {
  border-radius: 8px !important;
  margin: 4px 2px !important;
}

.monaco-workbench.vs-dark .part.sidebar,
.monaco-workbench.hc-black .part.sidebar {
  background-color: #0a0d14 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench.vs-dark .part.editor,
.monaco-workbench.hc-black .part.editor {
  background-color: #080b11 !important;
}

.monaco-workbench.vs-dark .part.editor > .content .editor-group-container,
.monaco-workbench.hc-black .part.editor > .content .editor-group-container {
  background-color: #080b11 !important;
}

.monaco-workbench.vs-dark .part.editor > .content .editor-group-container > .title .tabs-container,
.monaco-workbench.hc-black .part.editor > .content .editor-group-container > .title .tabs-container {
  background-color: #0a0d14 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench.vs-dark .part.editor > .content .editor-group-container > .title .tabs-container > .tab,
.monaco-workbench.hc-black .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  border-radius: 6px 6px 0 0 !important;
  margin: 2px 2px 0 2px !important;
  border-right: none !important;
  transition: all 0.15s ease !important;
  background-color: #0c0f18 !important;
  color: #8c97b0 !important;
}

.monaco-workbench.vs-dark .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active,
.monaco-workbench.hc-black .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
  background-color: #121624 !important;
  border-bottom: 2px solid #ff5500 !important;
  color: #ffffff !important;
}

.monaco-workbench.vs-dark .part.panel,
.monaco-workbench.hc-black .part.panel {
  background-color: #090b12 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench.vs-dark .part.statusbar,
.monaco-workbench.hc-black .part.statusbar {
  background-color: #07090e !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench.vs-dark .quick-input-widget,
.monaco-workbench.hc-black .quick-input-widget,
.monaco-workbench.vs-dark .editor-widget,
.monaco-workbench.hc-black .editor-widget {
  border-radius: 10px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5) !important;
  background-color: #0e121e !important;
}

/* --- FROSTED WHITE / LIGHT LIQUID GLASS WORKBENCH RULES --- */
.monaco-workbench.vs,
.monaco-workbench.hc-light {
  background-color: #f8fafc !important;
  color: #0f172a !important;
}

.monaco-workbench.vs .part.titlebar,
.monaco-workbench.hc-light .part.titlebar {
  background-color: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
  height: 38px !important;
  z-index: 100 !important;
  color: #0f172a !important;
}

.monaco-workbench.vs .part.titlebar .window-title,
.monaco-workbench.hc-light .part.titlebar .window-title {
  color: #0f172a !important;
}

.monaco-workbench.vs .part.titlebar .menubar,
.monaco-workbench.hc-light .part.titlebar .menubar {
  display: flex !important;
  align-items: center !important;
  gap: 2px !important;
}

.monaco-workbench.vs .part.titlebar .menubar .menubar-menu-button,
.monaco-workbench.hc-light .part.titlebar .menubar .menubar-menu-button {
  border-radius: 6px !important;
  padding: 4px 8px !important;
  margin: 0 1px !important;
  transition: all 0.15s ease !important;
  color: #334155 !important;
}

.monaco-workbench.vs .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench.hc-light .part.titlebar .menubar .menubar-menu-button:hover,
.monaco-workbench.vs .part.titlebar .menubar .menubar-menu-button.open,
.monaco-workbench.hc-light .part.titlebar .menubar .menubar-menu-button.open {
  background: rgba(0, 0, 0, 0.06) !important;
  color: #0f172a !important;
}

.monaco-workbench.vs .part.titlebar .command-center,
.monaco-workbench.hc-light .part.titlebar .command-center {
  border-radius: 8px !important;
  background: #f1f5f9 !important;
  border: 1px solid #cbd5e1 !important;
  color: #334155 !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench.vs .part.titlebar .command-center:hover,
.monaco-workbench.hc-light .part.titlebar .command-center:hover {
  border-color: #ff5500 !important;
  background: #ffffff !important;
  color: #0f172a !important;
}

.monaco-workbench.vs .part.activitybar,
.monaco-workbench.hc-light .part.activitybar {
  background-color: #f8fafc !important;
  border-right: 1px solid #e2e8f0 !important;
}

.monaco-workbench.vs .part.activitybar .action-item,
.monaco-workbench.hc-light .part.activitybar .action-item {
  border-radius: 8px !important;
  margin: 4px 2px !important;
}

.monaco-workbench.vs .part.activitybar .action-item .action-label,
.monaco-workbench.hc-light .part.activitybar .action-item .action-label {
  color: #64748b !important;
}

.monaco-workbench.vs .part.activitybar .action-item.checked .action-label,
.monaco-workbench.hc-light .part.activitybar .action-item.checked .action-label {
  color: #ff5500 !important;
}

.monaco-workbench.vs .part.sidebar,
.monaco-workbench.hc-light .part.sidebar {
  background-color: #ffffff !important;
  border-right: 1px solid #e2e8f0 !important;
  color: #334155 !important;
}

.monaco-workbench.vs .part.editor,
.monaco-workbench.hc-light .part.editor {
  background-color: #ffffff !important;
}

.monaco-workbench.vs .part.editor > .content .editor-group-container,
.monaco-workbench.hc-light .part.editor > .content .editor-group-container {
  background-color: #ffffff !important;
}

.monaco-workbench.vs .part.editor > .content .editor-group-container > .title .tabs-container,
.monaco-workbench.hc-light .part.editor > .content .editor-group-container > .title .tabs-container {
  background-color: #f8fafc !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.monaco-workbench.vs .part.editor > .content .editor-group-container > .title .tabs-container > .tab,
.monaco-workbench.hc-light .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  border-radius: 6px 6px 0 0 !important;
  margin: 2px 2px 0 2px !important;
  border-right: none !important;
  transition: all 0.15s ease !important;
  background-color: #f1f5f9 !important;
  color: #64748b !important;
}

.monaco-workbench.vs .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active,
.monaco-workbench.hc-light .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
  background-color: #ffffff !important;
  border-bottom: 2px solid #ff5500 !important;
  color: #0f172a !important;
}

.monaco-workbench.vs .part.panel,
.monaco-workbench.hc-light .part.panel {
  background-color: #ffffff !important;
  border-top: 1px solid #e2e8f0 !important;
  color: #334155 !important;
}

.monaco-workbench.vs .part.statusbar,
.monaco-workbench.hc-light .part.statusbar {
  background-color: #f8fafc !important;
  border-top: 1px solid #e2e8f0 !important;
  color: #475569 !important;
}

.monaco-workbench.vs .part.statusbar .statusbar-item,
.monaco-workbench.hc-light .part.statusbar .statusbar-item {
  color: #475569 !important;
}

.monaco-workbench.vs .quick-input-widget,
.monaco-workbench.hc-light .quick-input-widget,
.monaco-workbench.vs .editor-widget,
.monaco-workbench.hc-light .editor-widget {
  border-radius: 10px !important;
  overflow: hidden !important;
  border: 1px solid #cbd5e1 !important;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1) !important;
  background-color: #ffffff !important;
  color: #0f172a !important;
}

/* Rounded Sleek Scrollbars */
.monaco-scrollable-element > .scrollbar > .slider {
  border-radius: 6px !important;
}

/* Completely eliminate Accounts / Profile Icon everywhere */
.monaco-workbench .part.activitybar .action-item:has(.accounts-view-bar-icon),
.monaco-workbench .part.activitybar .action-item:has(.codicon-account),
.monaco-workbench .part.activitybar .action-item[aria-label*="Accounts"],
.monaco-workbench .part.activitybar .action-item[aria-label*="Account"],
.monaco-workbench .part.activitybar .action-item:has([aria-label*="Account"]),
.monaco-workbench .part.activitybar .accounts-activity-item,
.monaco-workbench .part.titlebar [aria-label*="Accounts"],
.monaco-workbench .part.titlebar [aria-label*="Account"],
.monaco-workbench .part.titlebar [aria-label*="account"],
.monaco-workbench .part.titlebar .action-item:has(.codicon-account),
.monaco-workbench .part.titlebar .action-item:has([aria-label*="Account"]),
.monaco-workbench .part.titlebar .codicon-account,
.monaco-workbench .accounts-view-bar-icon,
.monaco-workbench .codicon-account,
[id="workbench.actions.manageAccounts"],
[id*="manageAccounts"],

/* Completely eliminate Agents Window and all associated widgets */
[id*="openAgentsWindow"],
[id*="openWorkspaceInAgentsWindow"],
[id*="openSessionInAgentsWindow"],
.open-in-vscode-titlebar-widget,
.open-in-agents-window,
.agents-titlebar-widget,
.agent-sessions-workbench,
.sessions-welcome-dialog,
.chat-setup-dialog,
.agents-aquarium-fish-layer,
.action-label.codicon-agent,
.codicon-agent,

/* Completely eliminate Migration notices and tip banners */
.chat-customization-migration-banner,
[class*="migration-banner"],
[class*="migrationHint"],
[class*="migration-notice"],
.interactive-session-tip,
.chat-tip-container,
.chat-tips-widget,
[aria-label*="customizations need an update"],
[aria-label*="Review Migrations"],

/* Completely eliminate corruption / tamper notification toasts */
.monaco-workbench .notifications-toasts .notification-toast:has([aria-label*="corrupt"]),
.monaco-workbench .notifications-toasts .notification-toast:has([aria-label*="corrupted"]),
.monaco-workbench .notification-toast:has(.notification-message:has-text("corrupt")),
[aria-label*="installation appears to be corrupt"] {
  display: none !important;
  visibility: hidden !important;
  width: 0px !important;
  height: 0px !important;
  min-width: 0px !important;
  min-height: 0px !important;
  max-width: 0px !important;
  max-height: 0px !important;
  padding: 0 !important;
  margin: 0 !important;
  border: none !important;
  pointer-events: none !important;
}
"""

workbench_css = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "workbench" / "workbench.desktop.main.css"
if workbench_css.exists():
    print("Injecting styles into workbench.desktop.main.css...")
    with open(workbench_css, "a", encoding="utf-8") as f:
        f.write("\n" + glass_css + "\n" + traffic_light_css)

sessions_css = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "sessions" / "sessions.desktop.main.css"
if sessions_css.exists():
    print("Injecting styles into sessions.desktop.main.css...")
    with open(sessions_css, "a", encoding="utf-8") as f:
        f.write("\n" + glass_css + "\n" + traffic_light_css)

# 8b. Neutralize Agents window across electron-browser and electron-main
print("Completely eliminating Agents window functionality and autostart...")
app_out = VISIONX_DIST / "resources" / "app" / "out"

# 1. Overwrite sessions.html with an immediate auto-close safeguard
sessions_html = app_out / "vs" / "sessions" / "electron-browser" / "sessions.html"
if sessions_html.exists():
    sessions_html.write_text("<!DOCTYPE html><html><head><title>VisionX</title><script>window.close();</script></head><body></body></html>", encoding="utf-8")
    print("Replaced sessions.html with immediate window.close() safeguard.")

# 2. Overwrite sessions.js entrypoint
sessions_entry_js = app_out / "vs" / "sessions" / "electron-browser" / "sessions.js"
if sessions_entry_js.exists():
    txt = sessions_entry_js.read_text(encoding="utf-8", errors="ignore")
    sessions_entry_js.write_text("window.close();\n" + txt, encoding="utf-8")
    print("Injected auto-close guard into electron-browser/sessions.js")

# 3. Overwrite sessions.desktop.main.js
sessions_js = app_out / "vs" / "sessions" / "sessions.desktop.main.js"
if sessions_js.exists():
    txt = sessions_js.read_text(encoding="utf-8", errors="ignore")
    sessions_js.write_text("window.close();\n" + txt, encoding="utf-8")
    print("Injected auto-close guard into sessions.desktop.main.js")

# 4. Patch mainImpl.js
main_impl = app_out / "mainImpl.js"
if main_impl.exists():
    try:
        txt = main_impl.read_text(encoding="utf-8", errors="ignore")
        txt = txt.replace("checksumFailMoreInfoUrl:\"https://go.microsoft.com/fwlink/?LinkId=828886\"", "checksumFailMoreInfoUrl:\"\"")
        txt = txt.replace("else if(n.agents)r=await this.windowsMainService.openAgentsWindow(a);", "else if(n.agents)return;")
        txt = txt.replace("if(s.agents)return r.openAgentsWindow({context:o,cli:s,initialStartup:!0});", "if(s.agents)return;")
        
        # Globally route extensionsPath to ~/.vscode/extensions if present so all users get VS Code extensions out-of-the-box
        old_ext = 'ce(this.userHome,this.productService.dataFolderName,"extensions").fsPath'
        new_ext = '(()=>{let v=ce(this.userHome,".vscode","extensions").fsPath;try{if(require("fs").existsSync(v))return v;}catch{}return ce(this.userHome,".visionx","extensions").fsPath})()'
        if old_ext in txt:
            txt = txt.replace(old_ext, new_ext)
            print("Patched extensionsPath in mainImpl.js to prioritize ~/.vscode/extensions")

        # Disable native Windows titleBarOverlay so Electron renders HTML window controls
        old_tbo = 'c.titleBarOverlay={height:29,color:f,symbolColor:g}'
        new_tbo = 'c.titleBarOverlay=false'
        if old_tbo in txt:
            txt = txt.replace(old_tbo, new_tbo)
            print("Disabled Windows native titleBarOverlay in mainImpl.js")

        t1 = "async openAgentsWindow(e,t,r,o,s=!1,a,l){"
        if t1 in txt:
            txt = txt.replace(t1, "async openAgentsWindow(e,t,r,o,s=!1,a,l){return [];")
            print("Disabled openAgentsWindow in mainImpl.js (manager)")
            
        t2 = "async openAgentsWindow(e,t){let r=await this.windowsMainService.openAgentsWindow"
        if t2 in txt:
            txt = txt.replace(t2, "async openAgentsWindow(e,t){return;let r=await this.windowsMainService.openAgentsWindow")
            print("Disabled openAgentsWindow in mainImpl.js (service)")
            
        t3 = "async ensureAgentsWindow(e){"
        if t3 in txt:
            txt = txt.replace(t3, "async ensureAgentsWindow(e){return null;")
            print("Disabled ensureAgentsWindow in mainImpl.js")
            
        # Remove Agents Window from Windows Jump List tasks
        old_jump_agents = 'r.push({type:"task",title:u(4051,null),description:u(4059,null),program:process.execPath,args:"--agents",iconPath:N(this.environmentMainService.appRoot,"resources/win32/sessions.ico"),iconIndex:0})'
        if old_jump_agents in txt:
            txt = txt.replace(old_jump_agents, "void 0")
            print("Removed Agents Window from Windows Jump List tasks in mainImpl.js")
        else:
            import re
            txt = re.sub(r'r\.push\(\{[^}]*args:"--agents"[^}]*\}\)', 'void 0', txt)
            print("Applied regex to remove --agents task from mainImpl.js")

        # Neutralize canonicalizeAgentSessionsWorkspaces so agent sessions workspaces are never added to jump list/recents
        old_canon = 't.push({workspace:_k(this.environmentMainService.agentSessionsWorkspace),label:u(4052,null)})'
        if old_canon in txt:
            txt = txt.replace(old_canon, "void 0")
            print("Neutralized canonicalizeAgentSessionsWorkspaces in mainImpl.js")

        # Replace any remaining sessions.ico references with code.ico
        txt = txt.replace("resources/win32/sessions.ico", "resources/win32/code.ico")
            
        main_impl.write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Note disabling agents in mainImpl: {e}")

# 5. Patch workbench.desktop.main.js
wb_js = app_out / "vs" / "workbench" / "workbench.desktop.main.js"
if wb_js.exists():
    try:
        txt = wb_js.read_text(encoding="utf-8", errors="ignore")
        
        # Disable Accounts/Profile in activity bar
        old_acc = "this.accountsVisibilityPreference&&this.globalActivityActionBar.push(this.accountAction,{index:bj.ACCOUNTS_ACTION_INDEX})"
        new_acc = "false&&this.globalActivityActionBar.push(this.accountAction,{index:bj.ACCOUNTS_ACTION_INDEX})"
        if old_acc in txt:
            txt = txt.replace(old_acc, new_acc)
            print("Disabled Accounts/Profile activity bar registration in workbench.desktop.main.js")
            
        # Filter out Accounts from titlebar action toolbar
        old_tb_acc = "T2(this.globalToolbarMenu.getActions(),n,r=>r===MDo)"
        new_tb_acc = "T2(this.globalToolbarMenu.getActions().filter(a=>!a.id?.toLowerCase().includes('account')),n,r=>r===MDo)"
        if old_tb_acc in txt:
            txt = txt.replace(old_tb_acc, new_tb_acc)
            print("Filtered Accounts from titlebar toolbar in workbench.desktop.main.js")

        # Disable Agent precondition XA
        if 'D.has("config.chat.agent.enabled")' in txt:
            txt = txt.replace('D.has("config.chat.agent.enabled")', 'D.False')
            print("Disabled Agent precondition XA in workbench.desktop.main.js")
            
        # Neutralize all openAgentsWindow call sites
        txt = txt.replace("await o.get(Po).openAgentsWindow({", "return; await o.get(Po).openAgentsWindow({")
        txt = txt.replace("await t.openAgentsWindow({...e,", "return; await t.openAgentsWindow({...e,")
        txt = txt.replace("await i.openAgentsWindow({folderUri:", "return; await i.openAgentsWindow({folderUri:")
        txt = txt.replace("await this.nativeHostService.openAgentsWindow({", "return; await this.nativeHostService.openAgentsWindow({")

        # Defeat migration hint calculation so banner never renders
        if "async computeMigrationHint(e,t=Ie.None){" in txt:
            txt = txt.replace("async computeMigrationHint(e,t=Ie.None){", "async computeMigrationHint(e,t=Ie.None){return;")
            print("Disabled computeMigrationHint in workbench.desktop.main.js")
            
        # Force kUe to return false so HTML window controls with Mac traffic light CSS are created
        old_kue = 'function kUe(s){if(jt||gT(s))return!1;if(!vt){let o=ubt(s);if(o==="custom"||o==="hidden")return!1}return!0}'
        new_kue = 'function kUe(s){return!1}'
        if old_kue in txt:
            txt = txt.replace(old_kue, new_kue)
            print("Forced kUe to return false for HTML traffic light window controls")

        # Defeat integrity check in uwe class and eliminate all corrupt warnings
        if "this.isPurePromise=this._isPure(),this._compute()" in txt:
            txt = txt.replace("this.isPurePromise=this._isPure(),this._compute()", "this.isPurePromise=Promise.resolve({isPure:!0,proof:[]})")
            print("Neutered integrity isPurePromise in workbench.desktop.main.js")
        if "||this._showNotification()" in txt:
            txt = txt.replace("||this._showNotification()", "/* silenced notification */")
            print("Silenced _showNotification invocation in workbench.desktop.main.js")
        if "d(27370,null,this.productService.nameShort)" in txt:
            txt = txt.replace("d(27370,null,this.productService.nameShort)", '""')
            print("Cleared corrupt dialog string in workbench.desktop.main.js")
        if "_showNotification(){" in txt:
            txt = txt.replace("_showNotification(){", "_showNotification(){return;")
            print("Silenced _showNotification() in workbench.desktop.main.js")
        if "async _compute(){" in txt:
            txt = txt.replace("async _compute(){", "async _compute(){return;")
            print("Silenced _compute() in workbench.desktop.main.js")
        if "async _isPure(){" in txt:
            txt = txt.replace("async _isPure(){", "async _isPure(){return{isPure:!0,proof:[]};")
            print("Patched _isPure() in workbench.desktop.main.js")
        if "isPure:e===t" in txt:
            txt = txt.replace("isPure:e===t", "isPure:!0")
            print("Forced _createChecksumPair isPure:true in workbench.desktop.main.js")

        wb_js.write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Note patching workbench.desktop.main.js: {e}")

# 8c. String rebranding & cleaning in NLS files
string_replacements = [
    ("copilot-vscode", "visionx"),
    ("Return to VS Code Editor", "Return to VisionX Editor"),
    ("Open in VS Code Editor Window", "Open in VisionX Editor Window"),
    ("Open in VS Code", "Open in VisionX"),
    ("Open VS Code Window", "Open VisionX Window"),
    ("to VS Code Editor", "to VisionX Editor"),
    ("Chat with Copilot", "Chat with VisionX"),
    ("Copilot Fusion", "VisionX AI"),
    ("Your {0} installation appears to be corrupt. Please reinstall.", ""),
]

for bundle_path in [
    app_out / "vs" / "workbench" / "workbench.desktop.main.js",
    app_out / "vs" / "sessions" / "sessions.desktop.main.js",
    app_out / "nls.messages.js",
    app_out / "nls.messages.json"
]:
    if bundle_path.exists():
        try:
            txt = bundle_path.read_text(encoding="utf-8", errors="ignore")
            changed = False
            for old_s, new_s in string_replacements:
                if old_s in txt:
                    txt = txt.replace(old_s, new_s)
                    changed = True
            if changed:
                bundle_path.write_text(txt, encoding="utf-8")
                print(f"Rebranded strings in {bundle_path.name}")
        except Exception as e:
            print(f"Note patching {bundle_path.name}: {e}")

# Rebrand Microsoft & GitHub Authentication landing pages
ms_auth_html = ext_dir / "microsoft-authentication" / "media" / "index.html"
if ms_auth_html.exists():
    txt = ms_auth_html.read_text(encoding="utf-8")
    txt = txt.replace("Visual Studio Code", "VisionX")
    txt = txt.replace("https://code.visualstudio.com/", "https://github.com/NamanGaonkar/VisionX-IDE")
    ms_auth_html.write_text(txt, encoding="utf-8")
    print("Rebranded microsoft-authentication index.html")

ms_auth_js = ext_dir / "microsoft-authentication" / "dist" / "extension.js"
if ms_auth_js.exists():
    txt = ms_auth_js.read_text(encoding="utf-8")
    txt = txt.replace("Visual Studio Code", "VisionX")
    txt = txt.replace("https://code.visualstudio.com/", "https://github.com/NamanGaonkar/VisionX-IDE")
    ms_auth_js.write_text(txt, encoding="utf-8")
    print("Rebranded microsoft-authentication extension.js")

# Empty checksums in product.json so no file is ever verified
if product_json_path.exists():
    with open(product_json_path, "r", encoding="utf-8") as f:
        prod = json.load(f)
    prod["checksums"] = {}
    prod["checksumFailMoreInfoUrl"] = ""
    with open(product_json_path, "w", encoding="utf-8") as f:
        json.dump(prod, f, indent=2)
    print("Cleared product.json checksums.")

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
        "--set-version-string", "OriginalFilename", "VisionX.exe",
        "--set-file-version", "1.6.6.0",
        "--set-product-version", "1.6.6.0"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("VisionX.exe PE metadata and custom icon applied successfully!")
    else:
        print("rcedit note:", res.stderr or res.stdout)
except Exception as e:
    print("Could not run rcedit:", e)

print("==================================================")
print(" VisionX IDE v1.6.5 build completed successfully! ")
print("==================================================")
