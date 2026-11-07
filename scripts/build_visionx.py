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
print("     VisionX IDE v1.6.1 - Engine Rebuild & Polish ")
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
traffic_light_css = """
/* ======================================================== */
/* macOS-Style Traffic Light Window Controls                */
/* Red (Close) -> Yellow (Minimize) -> Green (Maximize)     */
/* Strictly matching user reference: pure circles, no icons */
/* ======================================================== */
.window-controls-container,
.monaco-workbench .part.titlebar .window-controls-container,
.monaco-workbench .titlebar-right .window-controls-container {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-end !important;
  gap: 8px !important;
  padding: 0 16px !important;
  width: auto !important;
  min-width: 76px !important;
  height: 100% !important;
  -webkit-app-region: no-drag !important;
}

.window-controls-container > .window-icon,
.monaco-workbench .part.titlebar .window-controls-container > .window-icon,
.monaco-workbench .titlebar-right .window-controls-container > .window-icon,
.window-icon.window-minimize,
.window-icon.window-max-restore,
.window-icon.window-close {
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
}

/* Remove any default Windows icons or glyphs inside circles */
.window-controls-container > .window-icon::before,
.window-controls-container > .window-icon::after,
.monaco-workbench .part.titlebar .window-controls-container > .window-icon::before,
.monaco-workbench .part.titlebar .window-controls-container > .window-icon::after,
.monaco-workbench .titlebar-right .window-controls-container > .window-icon::before,
.monaco-workbench .titlebar-right .window-controls-container > .window-icon::after,
.window-icon.window-minimize::before,
.window-icon.window-minimize::after,
.window-icon.window-max-restore::before,
.window-icon.window-max-restore::after,
.window-icon.window-close::before,
.window-icon.window-close::after {
  content: "" !important;
  display: none !important;
  opacity: 0 !important;
  width: 0 !important;
  height: 0 !important;
}

/* Red (Close) */
.window-controls-container > .window-icon.window-close,
.window-icon.window-close {
  order: 1 !important;
  background-color: #ff5f56 !important;
  border: 1px solid #e0443e !important;
  box-shadow: 0 0 3px rgba(255, 95, 86, 0.4) !important;
}
.window-controls-container > .window-icon.window-close:hover,
.window-icon.window-close:hover {
  background-color: #ff3b30 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}

/* Yellow (Minimize) */
.window-controls-container > .window-icon.window-minimize,
.window-icon.window-minimize {
  order: 2 !important;
  background-color: #ffbd2e !important;
  border: 1px solid #dea123 !important;
  box-shadow: 0 0 3px rgba(255, 189, 46, 0.4) !important;
}
.window-controls-container > .window-icon.window-minimize:hover,
.window-icon.window-minimize:hover {
  background-color: #ffaa00 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}

/* Green (Maximize / Restore) */
.window-controls-container > .window-icon.window-max-restore,
.window-icon.window-max-restore {
  order: 3 !important;
  background-color: #27c93f !important;
  border: 1px solid #1aab29 !important;
  box-shadow: 0 0 3px rgba(39, 201, 63, 0.4) !important;
}
.window-controls-container > .window-icon.window-max-restore:hover,
.window-icon.window-max-restore:hover {
  background-color: #20b034 !important;
  filter: brightness(1.15) !important;
  transform: scale(1.15) !important;
}
"""

agent_branding_css = f"""
/* ======================================================== */
/* VisionX Agent Window & Setup Dialog Branding             */
/* ======================================================== */
.chat-setup-dialog.sessions-main-welcome-dialog .dialog-message-row > .dialog-icon.codicon,
.chat-setup-dialog.sessions-welcome-dialog .dialog-message-row > .dialog-icon,
.chat-setup-dialog .dialog-message-row > .dialog-icon,
.sessions-welcome-dialog .dialog-icon,
.sessions-main-welcome-dialog .dialog-icon,
.sessions-sign-in-dialog .dialog-icon,
.sessions-sign-in-dialog-message-row > .dialog-icon,
.monaco-dialog-box .dialog-icon,
.dialog-icon.codicon-agent {{
  background-image: url("{logo_b64_url}") !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  width: 72px !important;
  height: 72px !important;
  min-width: 72px !important;
  min-height: 72px !important;
  font-size: 0px !important;
  color: transparent !important;
  filter: drop-shadow(0 0 12px rgba(255, 120, 0, 0.45)) !important;
}}

.chat-setup-dialog.sessions-main-welcome-dialog .dialog-message-row > .dialog-icon.codicon::before,
.chat-setup-dialog.sessions-welcome-dialog .dialog-message-row > .dialog-icon::before,
.chat-setup-dialog .dialog-message-row > .dialog-icon::before,
.sessions-welcome-dialog .dialog-icon::before,
.sessions-main-welcome-dialog .dialog-icon::before,
.sessions-sign-in-dialog .dialog-icon::before,
.monaco-dialog-box .dialog-icon::before,
.dialog-icon.codicon-agent::before {{
  content: "" !important;
  display: none !important;
}}

.monaco-workbench .open-in-vscode-titlebar-widget > .open-in-vscode-titlebar-widget-icon {{
  background-image: url("{logo_b64_url}") !important;
  background-size: contain !important;
  background-repeat: no-repeat !important;
  background-position: center !important;
  filter: none !important;
}}

.monaco-workbench .action-label.codicon-fish1-happy,
.monaco-workbench .action-label.codicon-fish1-neutral,
.monaco-workbench .action-label.codicon-fish1-sad,
.monaco-workbench .action-label.codicon-fish1-very-sad,
.agents-aquarium-fish-layer {{
  display: none !important;
}}
"""

glass_css = """
/* ======================================================== */
/* VisionX Solid Dark Obsidian Workbench Aesthetics        */
/* Sleek, distraction-free obsidian theme                   */
/* ======================================================== */

html, body, .monaco-workbench {
  background-color: #07090e !important;
}

.monaco-workbench .part.titlebar {
  background-color: #0c0f18 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
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
  background: rgba(255, 255, 255, 0.08) !important;
}

/* Rounded Symmetrical Search Command Center */
.monaco-workbench .part.titlebar .command-center {
  border-radius: 8px !important;
  background: #121624 !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  transition: all 0.2s ease !important;
}

.monaco-workbench .part.titlebar .command-center:hover {
  border-color: #ff5500 !important;
  background: #171c2e !important;
}

/* Activity Bar */
.monaco-workbench .part.activitybar {
  background-color: #090b12 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.monaco-workbench .part.activitybar .action-item {
  border-radius: 8px !important;
  margin: 4px 2px !important;
}

/* Sidebar */
.monaco-workbench .part.sidebar {
  background-color: #0a0d14 !important;
  border-right: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* Editor */
.monaco-workbench .part.editor {
  background-color: #07090e !important;
}

.monaco-workbench .part.editor > .content .editor-group-container {
  background-color: #07090e !important;
}

.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container {
  background-color: #0a0d14 !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* Rounded Symmetrical Editor Tabs */
.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab {
  border-radius: 6px 6px 0 0 !important;
  margin: 2px 2px 0 2px !important;
  border-right: none !important;
  transition: all 0.15s ease !important;
  background-color: #0c0f18 !important;
}

.monaco-workbench .part.editor > .content .editor-group-container > .title .tabs-container > .tab.active {
  background-color: #121624 !important;
  border-bottom: 2px solid #ff5500 !important;
}

/* Bottom Panel */
.monaco-workbench .part.panel {
  background-color: #090b12 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* Status Bar */
.monaco-workbench .part.statusbar {
  background-color: #07090e !important;
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
}

/* Rounded Popups, Quick Inputs & Dialog Widgets */
.monaco-menu .monaco-action-bar,
.monaco-workbench .quick-input-widget,
.monaco-workbench .editor-widget {
  border-radius: 10px !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.5) !important;
  background-color: #0e121e !important;
}

/* Rounded Sleek Scrollbars */
.monaco-scrollable-element > .scrollbar > .slider {
  border-radius: 6px !important;
}

/* Completely eliminate Accounts / Profile Icon */
.monaco-workbench .part.activitybar .action-item:has(.accounts-view-bar-icon),
.monaco-workbench .part.activitybar .action-item:has(.codicon-account),
.monaco-workbench .part.activitybar .action-item[aria-label*="Accounts"],
.monaco-workbench .part.activitybar .action-item[aria-label*="Account"],
.monaco-workbench .part.activitybar .action-item:has([aria-label*="Account"]),
.monaco-workbench .part.activitybar .accounts-activity-item,
.monaco-workbench .part.titlebar [aria-label*="Accounts"],
.monaco-workbench .part.titlebar [aria-label*="Account"],
.monaco-workbench .accounts-view-bar-icon,
.monaco-workbench .codicon-account,
[id="workbench.actions.manageAccounts"],
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
.codicon-agent {
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
        f.write("\n" + glass_css + "\n" + traffic_light_css + "\n" + agent_branding_css)

sessions_css = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "sessions" / "sessions.desktop.main.css"
if sessions_css.exists():
    print("Injecting styles into sessions.desktop.main.css...")
    with open(sessions_css, "a", encoding="utf-8") as f:
        f.write("\n" + traffic_light_css + "\n" + agent_branding_css)

# 8b. Neutralize Agents window and rebrand strings in JS & NLS bundles
print("Completely eliminating Agents window functionality...")
app_out = VISIONX_DIST / "resources" / "app" / "out"
main_impl = app_out / "mainImpl.js"
if main_impl.exists():
    try:
        txt = main_impl.read_text(encoding="utf-8", errors="ignore")
        t1 = "async openAgentsWindow(e,t,r,o,s=!1,a,l){"
        if t1 in txt:
            txt = txt.replace(t1, "async openAgentsWindow(e,t,r,o,s=!1,a,l){return [];")
            print("Disabled openAgentsWindow in mainImpl.js (manager)")
        t2 = "async openAgentsWindow(e,t){let r=await this.windowsMainService.openAgentsWindow"
        if t2 in txt:
            txt = txt.replace(t2, "async openAgentsWindow(e,t){return;let r=await this.windowsMainService.openAgentsWindow")
            print("Disabled openAgentsWindow in mainImpl.js (service)")
        main_impl.write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Note disabling agents in mainImpl: {e}")

# Disable Accounts/Profile action registration and Agents window in workbench.desktop.main.js
wb_js = app_out / "vs" / "workbench" / "workbench.desktop.main.js"
if wb_js.exists():
    try:
        txt = wb_js.read_text(encoding="utf-8", errors="ignore")
        old_acc = "this.accountsVisibilityPreference&&this.globalActivityActionBar.push(this.accountAction,{index:bj.ACCOUNTS_ACTION_INDEX})"
        new_acc = "false&&this.globalActivityActionBar.push(this.accountAction,{index:bj.ACCOUNTS_ACTION_INDEX})"
        if old_acc in txt:
            txt = txt.replace(old_acc, new_acc)
            print("Successfully disabled Accounts/Profile activity bar icon registration in workbench.desktop.main.js")
        
        # Disable Agent precondition XA
        if 'D.has("config.chat.agent.enabled")' in txt:
            txt = txt.replace('D.has("config.chat.agent.enabled")', 'D.False')
            print("Disabled Agent precondition XA in workbench.desktop.main.js")
            
        txt = txt.replace("await o.get(Po).openAgentsWindow({", "return; await o.get(Po).openAgentsWindow({")
        txt = txt.replace("await t.openAgentsWindow({...e,", "return; await t.openAgentsWindow({...e,")
        txt = txt.replace("await i.openAgentsWindow({folderUri:", "return; await i.openAgentsWindow({folderUri:")
        txt = txt.replace("await this.nativeHostService.openAgentsWindow({", "return; await this.nativeHostService.openAgentsWindow({")
        
        wb_js.write_text(txt, encoding="utf-8")
    except Exception as e:
        print(f"Note patching workbench.desktop.main.js: {e}")

sessions_js = VISIONX_DIST / "resources" / "app" / "out" / "vs" / "sessions" / "sessions.desktop.main.js"
if sessions_js.exists():
    try:
        txt = sessions_js.read_text(encoding="utf-8", errors="ignore")
        sessions_js.write_text("window.close();\n" + txt, encoding="utf-8")
        print("Injected auto-close guard into sessions.desktop.main.js")
    except Exception as e:
        print(f"Note injecting sessions auto-close: {e}")

string_replacements = [
    ("copilot-vscode", "visionx"),
    ("Return to VS Code Editor", "Return to VisionX Editor"),
    ("Open in VS Code Editor Window", "Open in VisionX Editor Window"),
    ("Open in VS Code", "Open in VisionX"),
    ("Open VS Code Window", "Open VisionX Window"),
    ("to VS Code Editor", "to VisionX Editor"),
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

# 8c. Neutralize installation corrupt/tamper integrity check and clear checksums
print("Neutralizing integrity checks and updating product checksums...")
for p in [app_out / "vs" / "workbench" / "workbench.desktop.main.js", app_out / "vs" / "sessions" / "sessions.desktop.main.js"]:
    if p.exists():
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            # 1. Defeat _showNotification
            if "_showNotification(){" in txt:
                txt = txt.replace("_showNotification(){", "_showNotification(){return;")
                print(f"Silenced _showNotification() in {p.name}")
            # 2. Defeat _compute
            if "async _compute(){" in txt:
                txt = txt.replace("async _compute(){", "async _compute(){return;")
                print(f"Silenced _compute() in {p.name}")
            # 3. Defeat _isPure
            if "async _isPure(){" in txt:
                txt = txt.replace("async _isPure(){", "async _isPure(){return{isPure:true,proof:[]};")
                print(f"Patched _isPure() in {p.name}")
            p.write_text(txt, encoding="utf-8")
        except Exception as e:
            print(f"Note patching {p.name}: {e}")

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
        "--set-file-version", "1.6.1.0",
        "--set-product-version", "1.6.1.0"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("VisionX.exe PE metadata and custom icon applied successfully!")
    else:
        print("rcedit note:", res.stderr or res.stdout)
except Exception as e:
    print("Could not run rcedit:", e)

print("==================================================")
print(" VisionX IDE v1.6.1 build completed successfully! ")
print("==================================================")
