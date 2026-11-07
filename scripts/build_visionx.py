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
print("     VisionX IDE v1.7.5 - Built-in Agentic Chat ")
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
    product["configurationDefaults"]["telemetry.enableCrashReporter"] = False
    product["configurationDefaults"]["telemetry.enableTelemetry"] = False
    product["configurationDefaults"]["claude-dev.telemetry"] = False
    product["configurationDefaults"]["workbench.startupEditor"] = "welcomePage"
    product["configurationDefaults"]["window.titleBarStyle"] = "custom"
    product["configurationDefaults"]["window.menuBarVisibility"] = "classic"
    product["configurationDefaults"]["window.commandCenter"] = True
    product["configurationDefaults"]["workbench.layoutControl.enabled"] = True
    product["configurationDefaults"]["workbench.layoutControl.type"] = "both"
    product["configurationDefaults"]["workbench.secondarySideBar.defaultVisibility"] = "visible"
    product["configurationDefaults"]["chat.agent.enabled"] = False
    product["configurationDefaults"]["chat.tips.enabled"] = False
    product["configurationDefaults"]["chat.agent.tips.enabled"] = False

    if "builtInExtensions" not in product or not isinstance(product["builtInExtensions"], list):
        product["builtInExtensions"] = []
    
    # Register Cline and VisionX Project Graph as built-in extensions
    product["builtInExtensions"].append({
        "name": "saoudrizwan.claude-dev",
        "version": "4.1.26",
        "repo": "https://github.com/cline/cline"
    })
    product["builtInExtensions"].append({
        "name": "visionx.visionx-project-graph",
        "version": "1.7.3",
        "repo": "https://github.com/NamanGaonkar/VisionX-IDE"
    })

    if "credits" not in product:
        product["credits"] = {}
    product["credits"]["cline"] = "VisionX incorporates Cline (Apache-2.0, Copyright (c) 2024 Saoud Rizwan and contributors) as the built-in default agentic chat."

    with open(product_json_path, "w", encoding="utf-8") as f:
        json.dump(product, f, indent=2)
    print("product.json updated successfully with Cline defaults and builtInExtensions.")

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

# 7. Inject custom extensions (Theme, Project Graph, & Cline Default Agentic Chat)
ext_dir = VISIONX_DIST / "resources" / "app" / "extensions"
if ext_dir.exists():
    print("Installing built-in VisionX Liquid Glass Theme...")
    target_theme = ext_dir / "visionx-theme-liquid-glass"
    if target_theme.exists():
        shutil.rmtree(target_theme)
    shutil.copytree(BASE_DIR / "src" / "theme", target_theme)

    print("Installing built-in VisionX 3D Project Architecture Graph...")
    target_graph = ext_dir / "visionx-project-graph"
    if target_graph.exists():
        shutil.rmtree(target_graph)
    shutil.copytree(BASE_DIR / "src" / "project-graph", target_graph)

    print("Bundling Cline (Apache 2.0) as default built-in agentic chat...")
    target_cline = ext_dir / "claude-dev"
    if target_cline.exists():
        shutil.rmtree(target_cline)
    target_cline.mkdir(parents=True, exist_ok=True)

    cline_vsix = BUILD_DIR / "extensions" / "saoudrizwan.claude-dev-4.1.26.vsix"
    if cline_vsix.exists():
        with zipfile.ZipFile(cline_vsix, "r") as z:
            for member in z.infolist():
                if member.filename.startswith("extension/"):
                    rel_path = member.filename[len("extension/"):]
                    if not rel_path:
                        continue
                    out_path = target_cline / rel_path
                    if member.is_dir():
                        out_path.mkdir(parents=True, exist_ok=True)
                    else:
                        out_path.parent.mkdir(parents=True, exist_ok=True)
                        out_path.write_bytes(z.read(member.filename))
        print("Extracted Cline extension files.")

    # Keep Apache license and NOTICE in packaged build
    cline_license = target_cline / "LICENSE.txt"
    if cline_license.exists():
        shutil.copy(cline_license, VISIONX_DIST / "CLINE_LICENSE.txt")
        shutil.copy(cline_license, VISIONX_DIST / "resources" / "app" / "CLINE_LICENSE.txt")

    # Create glowing VisionX chat icon for Command Center button
    icons_dir = target_cline / "assets" / "icons"
    icons_dir.mkdir(parents=True, exist_ok=True)
    chat_v_svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="16" height="16">
  <defs>
    <filter id="chat-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <linearGradient id="v-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ff1a1a" />
      <stop offset="50%" stop-color="#ff4400" />
      <stop offset="100%" stop-color="#ffaa00" />
    </linearGradient>
    <linearGradient id="v-border" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff3300" />
      <stop offset="100%" stop-color="#ff9900" />
    </linearGradient>
  </defs>
  <rect x="28" y="28" width="456" height="456" rx="96" fill="#0c0e16" stroke="url(#v-border)" stroke-width="18" filter="url(#chat-glow)" />
  <path d="M100 130 L160 130 L256 320 L352 130 L412 130 L286 370 L256 420 L226 370 Z" fill="#cc0000" opacity="0.85" />
  <path d="M128 144 L196 144 L256 270 L316 144 L384 144 L276 360 L256 400 L236 360 Z" fill="url(#v-grad)" filter="url(#chat-glow)" />
  <path d="M208 240 L256 340 L304 240 L276 240 L256 280 L236 240 Z" fill="#fff3a8" opacity="0.9" />
</svg>"""
    (icons_dir / "chat-v-icon.svg").write_text(chat_v_svg, encoding="utf-8")

    # Configure Cline package.json for secondary sidebar, command center chat button, and Ctrl+Alt+I shortcut
    cline_pkg_path = target_cline / "package.json"
    if cline_pkg_path.exists():
        with open(cline_pkg_path, "r", encoding="utf-8") as f:
            cline_pkg = json.load(f)

        cline_pkg["displayName"] = "VisionX Agentic Chat"
        cline_pkg["description"] = "Autonomous AI coding agent built into VisionX IDE"

        # 1. Place chat container in activitybar
        cline_pkg["contributes"]["viewsContainers"] = {
            "activitybar": [
                {
                    "id": "claude-dev-ActivityBar",
                    "title": "VisionX Agentic Chat",
                    "icon": "assets/icons/chat-v-icon.svg"
                }
            ]
        }

        # 2. Add Chat command and button to commandCenter (in titlebar next to search)
        commands = cline_pkg.get("contributes", {}).get("commands", [])
        has_focus_cmd = any(c.get("command") == "claude-dev.SidebarProvider.focus" for c in commands)
        if not has_focus_cmd:
            commands.insert(0, {
                "command": "claude-dev.SidebarProvider.focus",
                "title": "VisionX Agentic Chat",
                "icon": "$(comment-discussion)"
            })
        else:
            for c in commands:
                if c.get("command") == "claude-dev.SidebarProvider.focus":
                    c["icon"] = "$(comment-discussion)"
                    c["title"] = "VisionX Agentic Chat"
        cline_pkg["contributes"]["commands"] = commands

        menus = cline_pkg.get("contributes", {}).get("menus", {})
        menus["commandCenter"] = [{
            "command": "claude-dev.SidebarProvider.focus",
            "group": "navigation",
            "order": 1
        }]
        cline_pkg["contributes"]["menus"] = menus

        # 3. Add keyboard shortcut Ctrl+Alt+I (mac: cmd+alt+i) to focus chat
        keybindings = cline_pkg.get("contributes", {}).get("keybindings", [])
        has_kb = any(k.get("command") == "claude-dev.SidebarProvider.focus" for k in keybindings)
        if not has_kb:
            keybindings.insert(0, {
                "command": "claude-dev.SidebarProvider.focus",
                "key": "ctrl+alt+i",
                "mac": "cmd+alt+i",
                "win": "ctrl+alt+i",
                "linux": "ctrl+alt+i"
            })
        cline_pkg["contributes"]["keybindings"] = keybindings

        # 4. Ensure activationEvents include view and focus command
        act_events = cline_pkg.get("activationEvents", [])
        for ev in ["onView:claude-dev.SidebarProvider", "onCommand:claude-dev.SidebarProvider.focus", "onCommand:workbench.view.extension.claude-dev-ActivityBar"]:
            if ev not in act_events:
                act_events.append(ev)
        cline_pkg["activationEvents"] = act_events

        with open(cline_pkg_path, "w", encoding="utf-8") as f:
            json.dump(cline_pkg, f, indent=2)
        print("Configured Cline package.json for activitybar, commandCenter button, and Ctrl+Alt+I.")

    # Neutralize telemetry in Cline
    cline_ext_js = target_cline / "dist" / "extension.js"
    if cline_ext_js.exists():
        code = cline_ext_js.read_text(encoding="utf-8", errors="ignore")
        old_is_enabled = 'isEnabled(){let e=no.get().getGlobalSettingsKey("telemetrySetting")!=="disabled"'
        new_is_enabled = 'isEnabled(){return false;let e="disabled"'
        if old_is_enabled in code:
            code = code.replace(old_is_enabled, new_is_enabled)
            print("Neutralized PostHog telemetry in Cline extension.js")
        code = code.replace('telemetrySetting:void 0', 'telemetrySetting:"disabled"')

        # Neutralize telemetry warning toast completely
        old_toast = 'async updateTelemetryState(e){(await Lr.env.getTelemetrySettings({})).isEnabled===2&&e&&Lr.window.showMessage({type:2,message:"Cline error and usage reporting is enabled, but IDE telemetry is disabled. To enable error and usage reporting for this extension, enable telemetry in IDE settings.",options:{items:["Open Settings"]}}).then(i=>{i.selectedOption==="Open Settings"&&Lr.window.openSettings({query:"telemetry.telemetryLevel"})})}'
        new_toast = 'async updateTelemetryState(e){return;}'
        if old_toast in code:
            code = code.replace(old_toast, new_toast)
            print("Silenced updateTelemetryState warning toast in Cline extension.js")
        else:
            import re
            code = re.sub(r'async updateTelemetryState\(e\)\{[^}]*showMessage\(\{[^}]*Cline error and usage reporting[^}]*\}\)[^}]*\}', 'async updateTelemetryState(e){return;}', code)
            code = code.replace('"Cline error and usage reporting is enabled, but IDE telemetry is disabled. To enable error and usage reporting for this extension, enable telemetry in IDE settings."', '""')

        # Strip cline and cline-pass from extension.js listProviders()
        old_list = 'listProviders(){return Array.from(this.providers.values()).map(e=>this.getManifest(e.manifest.id)).filter(e=>e!==void 0)}'
        new_list = 'listProviders(){return Array.from(this.providers.values()).map(e=>this.getManifest(e.manifest.id)).filter(e=>e!==void 0&&e.id!=="cline"&&e.id!=="cline-pass"&&!e.name?.includes("Cline"))}'
        if old_list in code:
            code = code.replace(old_list, new_list)
            print("Filtered cline and cline-pass from listProviders in extension.js")

        cline_ext_js.write_text(code, encoding="utf-8")

    # Patch Chat Webview UI: strip Account, remove Cline provider, replace robot logo with VisionX logo, remove socials, rebrand
    wv_idx = target_cline / "webview-ui" / "build" / "assets" / "index.js"
    wv_css = target_cline / "webview-ui" / "build" / "assets" / "index.css"
    if wv_idx.exists():
        import re
        wv_code = wv_idx.read_text(encoding="utf-8", errors="ignore")

        # 1. Strip Account nav button from chat header
        wv_code = re.sub(r'\{id:"account",name:"Account",tooltip:"Account",icon:\w+,navigate:\w+\},?', '', wv_code)

        # 2. Strip cline and cline-pass from provider selection dropdown & provider list (keep all other providers intact)
        old_d1e = 'const s=await Pr.listProviders(Ji.create());return t(s.providers),s.providers'
        new_d1e = 'const s=await Pr.listProviders(Ji.create());const f_prov=s.providers.filter(p=>p.id!=="cline"&&p.id!=="cline-pass"&&!p.name?.includes("Cline"));return t(f_prov),f_prov'
        if old_d1e in wv_code:
            wv_code = wv_code.replace(old_d1e, new_d1e)
            print("Filtered provider catalog in D1e() in webview index.js")

        wv_code = wv_code.replace(
            'w=z.useMemo(()=>{let A=u.map(B=>({value:B.id,label:B.name}));',
            'w=z.useMemo(()=>{let A=u.filter(B=>B.id!=="cline"&&B.id!=="cline-pass"&&!B.name.includes("Cline")).map(B=>({value:B.id,label:B.name}));'
        )

        # 3. Note about complex prompts
        wv_code = wv_code.replace(
            '" Cline uses complex prompts, so behavior can vary across models. Less capable models may not work as expected."',
            '" VisionX uses complex prompts, so behavior can vary across models. Less capable models may not work as expected."'
        )

        # 4. Settings About page full rebranding & complete removal of Community & Support and dots
        old_comm = 'x.jsx("h3",{className:"text-md font-semibold",children:"Community & Support"}),x.jsxs("p",{children:[x.jsx(xa,{style:{display:"none"},children:"X"})," • ",x.jsx(xa,{style:{display:"none"},children:"Discord"})," • ",x.jsx(xa,{style:{display:"none"},children:""})]}),'
        if old_comm in wv_code:
            wv_code = wv_code.replace(old_comm, 'null,')
            print("Removed Community & Support and lingering dots from Settings About page")
        else:
            wv_code = re.sub(r'x\.jsx\("h3",\{className:"text-md font-semibold",children:"Community & Support"\}\),x\.jsxs\("p",\{children:\[.*?\]\}\),?', 'null,', wv_code)

        wv_code = wv_code.replace('children:["Cline v",e', 'children:["VisionX Agentic Chat v",e')
        wv_code = wv_code.replace(
            'An AI assistant that can use your CLI and Editor. Cline can handle complex software development tasks step-by-step with tools that let him create & edit files, explore large projects, use the browser, and execute terminal commands (after you grant permission).',
            'An AI assistant that can use your CLI and Editor. VisionX can handle complex software development tasks step-by-step with tools that let it create & edit files, explore large projects, use the browser, and execute terminal commands (after you grant permission).'
        )
        wv_code = wv_code.replace('href:"https://github.com/cline/cline"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE"')
        wv_code = wv_code.replace('href:"https://github.com/cline/cline/issues"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE/issues"')
        wv_code = wv_code.replace('href:"https://docs.cline.bot/"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE"')
        wv_code = wv_code.replace('children:"https://cline.bot"', 'children:"VisionX IDE"')
        wv_code = wv_code.replace('href:"https://cline.bot/"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE"')
        wv_code = wv_code.replace('href:"https://cline.bot/tos"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE"')
        wv_code = wv_code.replace('href:"https://cline.bot/privacy"', 'href:"https://github.com/NamanGaonkar/VisionX-IDE"')

        # 5. Neutralize external social links
        wv_code = wv_code.replace('href:"https://x.com/cline"', 'style:{display:"none"}')
        wv_code = wv_code.replace('href:"https://discord.gg/cline"', 'style:{display:"none"}')
        wv_code = wv_code.replace('href:"https://www.reddit.com/r/cline/"', 'style:{display:"none"}')
        wv_code = wv_code.replace('" r/cline"', '""')

        # 6. Remove Cloud sessions toggle in Settings
        old_cloud_toggle = 'x.jsx(v8,{checked:h,description:"Run Cline on your GitHub repositories in secure cloud sandboxes. Adds a Cloud option to the new task composer. Requires a Cline account with GitHub connected.",id:"cloud-sessions",isVisible:!!p,label:"Cloud",onChange:g=>ud("cloudSessionsEnabled",g)})'
        if old_cloud_toggle in wv_code:
            wv_code = wv_code.replace(old_cloud_toggle, 'null')
            print("Removed Cloud toggle from Settings in webview index.js")
        else:
            wv_code = wv_code.replace('id:"cloud-sessions",isVisible:!!p', 'id:"cloud-sessions",isVisible:false')

        # 7. Rebrand Feature Tips and user-facing action strings
        wv_code = wv_code.replace('"Show rotating tips during the thinking phase to help you discover Cline features."', '"Show rotating tips during the thinking phase to help you discover VisionX features."')
        wv_code = wv_code.replace('"Cline wants to execute this command:"', '"VisionX wants to execute this command:"')
        wv_code = wv_code.replace('"Cline wants to edit this file:"', '"VisionX wants to edit this file:"')
        wv_code = wv_code.replace('"Cline is creating patches to edit this file:"', '"VisionX is creating patches to edit this file:"')
        wv_code = wv_code.replace('"Cline wants to create a new file:"', '"VisionX wants to create a new file:"')
        wv_code = wv_code.replace('"Cline wants to delete this file:"', '"VisionX wants to delete this file:"')
        wv_code = wv_code.replace('"Cline wants to read this file:"', '"VisionX wants to read this file:"')
        wv_code = wv_code.replace('"Cline wants to search this directory for "', '"VisionX wants to search this directory for "')
        wv_code = wv_code.replace('"Cline has a question:"', '"VisionX has a question:"')
        wv_code = wv_code.replace('"Cline is having trouble..."', '"VisionX is having trouble..."')
        wv_code = wv_code.replace('"Cline is using the browser:"', '"VisionX is using the browser:"')
        wv_code = wv_code.replace('"Cline wants to use the browser:"', '"VisionX wants to use the browser:"')
        wv_code = wv_code.replace('"The language that Cline should use for communication."', '"The language that VisionX should use for communication."')
        wv_code = wv_code.replace('"Choose whether Cline runs commands in the VS Code terminal or a background process."', '"Choose whether VisionX runs commands in the terminal or a background process."')
        wv_code = wv_code.replace('"Failed to create task for Cline"', '"Failed to create task for VisionX"')
        wv_code = wv_code.replace('"Ask Cline to Resolve"', '"Ask VisionX to Resolve"')
        wv_code = wv_code.replace('"Cline wants to use a subagent:"', '"VisionX wants to use a subagent:"')
        wv_code = wv_code.replace('"Cline wants to use subagents:"', '"VisionX wants to use subagents:"')
        wv_code = wv_code.replace('"Please support Cline by"', '"Please support VisionX by"')
        wv_code = wv_code.replace('" with Cline"', '" with VisionX"')

        # 8. Rebrand user-facing headings and first-run setup prompts
        wv_code = wv_code.replace('"What can I do for you?"', '"What can VisionX do for you?"')
        wv_code = wv_code.replace('"Sign up with Cline"', '"VisionX Agentic Chat"')
        wv_code = wv_code.replace('"Welcome to Cline"', '"Welcome to VisionX Agentic Chat"')
        wv_code = wv_code.replace('"About Cline"', '"About VisionX Agentic Chat"')
        wv_code = wv_code.replace(
            '"Sign up for an account to get access to the latest models, billing dashboard to view usage and credits, and more upcoming features."',
            '"Configure your API keys or local Ollama models in Settings to begin coding with VisionX Agentic Chat."'
        )
        wv_code = wv_code.replace(
            '"Sign up for an account to get started for free, or use an API key that provides access to models like Claude Sonnet."',
            '"Configure an API key or local Ollama model in Settings to begin coding with VisionX Agentic Chat."'
        )
        wv_code = wv_code.replace('"Get Started for Free"', '"Configure API & Models"')
        wv_code = wv_code.replace('x.jsx(Msn,{})', 'null')

        wv_idx.write_text(wv_code, encoding="utf-8")

        # Verify syntax with node --check to guarantee zero AST/syntax regressions
        res = subprocess.run(["node", "--check", str(wv_idx)], capture_output=True, text=True)
        if res.returncode != 0:
            raise RuntimeError(f"Syntax validation failed on webview index.js: {res.stderr}")
        print("Patched Chat Webview UI: stripped Account, removed Cline provider, removed socials, rebranded.")
        print("Verified webview index.js syntax with node --check: 100% valid.")

    if wv_css.exists():
        chat_custom_css = """
/* VisionX Theme & Brand Customizations for Agentic Chat */
[data-testid="tab-account"] {
  display: none !important;
}
[data-value="cline"], [data-value="cline-pass"], option[value="cline"], option[value="cline-pass"],
div:has(> [class*="ClinePass"]),
[class*="clinepass"],
[class*="ClinePass"] {
  display: none !important;
}
/* Replace robot head logo with glowing VisionX logo */
svg[viewBox="0 0 113 113"],
svg[viewBox="0 0 66.62 63.92"] {
  background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect x='24' y='24' width='464' height='464' rx='100' fill='%23080a10' stroke='%23ff4400' stroke-width='12'/><path d='M100 130 L160 130 L256 320 L352 130 L412 130 L286 370 L256 420 L226 370 Z' fill='%23cc0000' opacity='0.85'/><path d='M128 144 L196 144 L256 270 L316 144 L384 144 L276 360 L256 400 L236 360 Z' fill='%23ff6600'/><path d='M208 240 L256 340 L304 240 L276 240 L256 280 L236 240 Z' fill='%23fff3a8' opacity='0.9'/></svg>") no-repeat center !important;
  background-size: contain !important;
  border-radius: 12px !important;
  width: 54px !important;
  height: 54px !important;
  display: inline-block !important;
}
svg[viewBox="0 0 113 113"] > *,
svg[viewBox="0 0 66.62 63.92"] > * {
  display: none !important;
  opacity: 0 !important;
}
textarea, input, select, button {
  border-radius: 8px !important;
}
"""
        with open(wv_css, "a", encoding="utf-8") as f:
            f.write("\n" + chat_custom_css)
        print("Injected VisionX logo and styling into webview index.css.")

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

/* ======================================================== */
/* Modern Rounded Island Layout for Editor Groups & Panels  */
/* ======================================================== */
.monaco-workbench.vs-dark .part.editor .editor-group-container,
.monaco-workbench.hc-black .part.editor .editor-group-container {
  border-radius: 10px !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

.monaco-workbench.vs .part.editor .editor-group-container,
.monaco-workbench.hc-light .part.editor .editor-group-container {
  border-radius: 10px !important;
  border: 1px solid rgba(0, 0, 0, 0.08) !important;
}

.monaco-workbench .part.panel {
  border-radius: 10px 10px 0 0 !important;
}

.monaco-workbench .part.sidebar {
  border-radius: 0 10px 10px 0 !important;
}

.monaco-workbench .part.auxiliarybar {
  border-radius: 10px 0 0 10px !important;
}

.monaco-workbench .terminal-tab {
  border-radius: 6px !important;
}

/* Glowing VisionX Chat Toggle Button in Title Bar Command Center (Icon Only, No Wording) */
.monaco-workbench .part.titlebar .codicon-comment-discussion,
.monaco-workbench .part.titlebar .command-center .action-item [class*="codicon-comment-discussion"],
.monaco-workbench .part.titlebar .command-center .action-item:has([class*="chat-v-icon"]),
.monaco-workbench .part.titlebar .command-center .action-item [class*="chat-v-icon"],
.monaco-workbench .part.titlebar .command-center .action-item [class*="chatSparkle"],
.monaco-workbench .part.titlebar .command-center .action-item:has([class*="chatSparkle"]),
.monaco-workbench .part.titlebar .command-center .action-item:has(a[aria-label*="VisionX"]),
.monaco-workbench .part.titlebar .command-center .action-item a[aria-label*="VisionX"],
.monaco-workbench .part.titlebar .command-center .action-item:has(a[aria-label*="Chat"]),
.monaco-workbench .part.titlebar .command-center .action-item a[aria-label*="Chat"],
.monaco-workbench .part.titlebar .command-center [id*="claude-dev.SidebarProvider.focus"],
.monaco-workbench .part.titlebar .action-item a[aria-label*="VisionX Agentic Chat"],
.monaco-workbench .part.titlebar .action-item a[aria-label*="VisionX Chat"] {
  background-image: url("{logo_b64_url}") !important;
  background-size: 16px !important;
  background-position: center !important;
  background-repeat: no-repeat !important;
  width: 26px !important;
  height: 26px !important;
  min-width: 26px !important;
  max-width: 26px !important;
  border-radius: 6px !important;
  margin: 0 4px !important;
  padding: 0 !important;
  transition: all 0.2s ease !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 0px !important;
  color: transparent !important;
  line-height: 0px !important;
  text-indent: -9999px !important;
  overflow: hidden !important;
  white-space: nowrap !important;
}
.monaco-workbench .part.titlebar .command-center .action-item:has(a[aria-label*="VisionX"]) *,
.monaco-workbench .part.titlebar .command-center .action-item a[aria-label*="VisionX"] *,
.monaco-workbench .part.titlebar .command-center .action-item:has(a[aria-label*="Chat"]) *,
.monaco-workbench .part.titlebar .command-center .action-item a[aria-label*="Chat"] * {
  font-size: 0px !important;
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  width: 0px !important;
  height: 0px !important;
}
.monaco-workbench .part.titlebar .codicon-comment-discussion::before,
.monaco-workbench .part.titlebar .command-center .action-item [class*="codicon-comment-discussion"]::before,
.monaco-workbench .part.titlebar .action-item a[aria-label*="VisionX Agentic Chat"]::before,
.monaco-workbench .part.titlebar .action-item a[aria-label*="VisionX Agentic Chat"]::after {
  content: "" !important;
  display: none !important;
}
.monaco-workbench.vs-dark .part.titlebar .command-center .action-item:has([class*="chat-v-icon"]):hover,
.monaco-workbench.hc-black .part.titlebar .command-center .action-item:has([class*="chat-v-icon"]):hover,
.monaco-workbench.vs-dark .part.titlebar .action-item:has(.codicon-comment-discussion):hover,
.monaco-workbench.vs-dark .part.titlebar .command-center .action-item:has(a[aria-label*="VisionX"]):hover,
.monaco-workbench.vs-dark .part.titlebar .command-center .action-item a[aria-label*="VisionX"]:hover,
.monaco-workbench.hc-black .part.titlebar .command-center .action-item a[aria-label*="VisionX"]:hover,
.monaco-workbench.vs-dark .part.titlebar [id*="claude-dev.SidebarProvider.focus"]:hover {
  background-color: rgba(255, 85, 0, 0.25) !important;
  box-shadow: 0 0 10px rgba(255, 85, 0, 0.5) !important;
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
        
        # Prepend global environment variable setup and seamless VS Code auto-sync on first launch
        # Inherits VSCODE_EXTENSIONS, creates VisionX\extensions junction, and migrates settings/themes cleanly
        init_ext_code = '(function(){try{const p=require("path"),o=require("os"),f=require("fs"),h=o.homedir(),v=p.join(h,".vscode","extensions");if(!process.env.VSCODE_EXTENSIONS&&f.existsSync(v))process.env.VSCODE_EXTENSIONS=v;const vxExt=p.join(h,"VisionX","extensions");if(!f.existsSync(vxExt)&&f.existsSync(v)){try{require("child_process").execSync(\'cmd /c mklink /J "\'+vxExt+\'" "\'+v+\'"\',{windowsHide:true,stdio:"ignore"});}catch{}}const appdata=process.env.APPDATA||p.join(h,"AppData","Roaming"),codeUser=p.join(appdata,"Code","User"),vxUser=p.join(appdata,"VisionX","User");if(f.existsSync(codeUser)&&!f.existsSync(p.join(vxUser,"settings.json"))){try{f.mkdirSync(vxUser,{recursive:true});for(const item of ["settings.json","keybindings.json","snippets"]){const src=p.join(codeUser,item),dst=p.join(vxUser,item);if(f.existsSync(src)&&!f.existsSync(dst)){f.cpSync(src,dst,{recursive:true});}}}catch{}}}catch(e){}})();\n'
        if "VSCODE_EXTENSIONS" not in txt[:300]:
            txt = init_ext_code + txt
            print("Injected process.env.VSCODE_EXTENSIONS & VS Code auto-sync initializer at top of mainImpl.js")

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

        # Add VisionX Agentic Chat toggle button in CommandCenter (order 102, icon only, no wording)
        cmd_target = 'De.appendMenuItem(F.CommandCenter,{submenu:F.CommandCenterCenter,title:d(8632,null),icon:A.shield,order:101});'
        chat_cmd_menu = 'De.appendMenuItem(F.CommandCenter,{command:{id:"claude-dev.SidebarProvider.focus",title:"",icon:A.chatSparkle},order:102});'
        if cmd_target in txt and chat_cmd_menu not in txt:
            txt = txt.replace(cmd_target, cmd_target + chat_cmd_menu)
            print("Added VisionX Agentic Chat icon-only toggle button to CommandCenter")
            
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
        "--set-file-version", "1.7.5.0",
        "--set-product-version", "1.7.5.0"
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if res.returncode == 0:
        print("VisionX.exe PE metadata and custom icon applied successfully!")
    else:
        print("rcedit note:", res.stderr or res.stdout)
except Exception as e:
    print("Could not run rcedit:", e)

print("==================================================")
print(" VisionX IDE v1.7.5 build completed successfully! ")
print("==================================================")
